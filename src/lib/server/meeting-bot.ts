import { composioFetch, hasComposioKey } from './composio';
import { zernioFetch } from './zernio';

const NVIDIA_URL = process.env.NVIDIA_API_URL ?? 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = process.env.NVIDIA_MODEL ?? 'minimaxai/minimax-m3';
const THINKING_MODE = process.env.NVIDIA_THINKING_MODE ?? 'enabled';
const MAX_TOKENS = Number(process.env.NVIDIA_MAX_TOKENS ?? 1200);
const MAX_TOOL_ROUNDS = 6;
const COMPOSIO_USER_ID = 'bookly-user';

interface RecordValue {
  [key: string]: unknown;
}

interface ConnectedAccount {
  id?: string;
  nanoid?: string;
  status?: string;
  toolkit?: RecordValue | string;
  toolkit_slug?: string;
  toolkitSlug?: string;
  auth_config?: RecordValue;
}

interface ComposioTool {
  slug?: string;
  name?: string;
  description?: string;
  human_description?: string;
  input_parameters?: unknown;
  inputParameters?: unknown;
}

interface DiscoveredTool {
  slug: string;
  toolkit: string;
  connectedAccountId: string;
  definition: RecordValue;
}

interface ModelToolCall {
  id: string;
  function: { name: string; arguments?: string };
}

interface ModelMessage {
  content?: string;
  tool_calls?: ModelToolCall[];
}

interface ModelResponse {
  choices?: Array<{ message?: ModelMessage }>;
}

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function recordsFrom(body: unknown, keys: string[]): RecordValue[] {
  if (Array.isArray(body)) return body.filter(isRecord);
  if (!isRecord(body)) return [];
  for (const key of keys) {
    const value = body[key];
    if (Array.isArray(value)) return value.filter(isRecord);
    if (isRecord(value)) {
      const nested = recordsFrom(value, keys);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

function toolkitSlug(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim().toLowerCase();
  if (!isRecord(value)) return null;
  for (const key of ['slug', 'toolkit_slug', 'toolkitSlug', 'name']) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().toLowerCase();
  }
  return null;
}

function accountToolkitSlug(account: ConnectedAccount): string | null {
  return toolkitSlug(account.toolkit)
    ?? toolkitSlug(account.toolkit_slug)
    ?? toolkitSlug(account.toolkitSlug)
    ?? (isRecord(account.auth_config) ? toolkitSlug(account.auth_config.toolkit) : null);
}

function accountId(account: ConnectedAccount): string | null {
  return account.id ?? account.nanoid ?? null;
}

function isActiveAccount(account: ConnectedAccount): boolean {
  const status = account.status?.toUpperCase();
  return Boolean(accountId(account)) && !['FAILED', 'EXPIRED', 'REVOKED', 'DISCONNECTED', 'DELETED', 'INACTIVE'].includes(status ?? '');
}

function parameterSchema(input: unknown): RecordValue {
  if (isRecord(input) && input.type === 'object' && isRecord(input.properties)) return input;
  if (!isRecord(input)) return { type: 'object', properties: {}, required: [] };

  const properties: RecordValue = {};
  const required: string[] = [];
  for (const [name, value] of Object.entries(input)) {
    if (!isRecord(value)) {
      properties[name] = { type: typeof value === 'string' ? value : 'string' };
      continue;
    }
    const property = { ...value };
    delete property.required;
    delete property.examples;
    properties[name] = property;
    if (value.required === true) required.push(name);
  }
  return { type: 'object', properties, required };
}

function toolDefinition(tool: ComposioTool): RecordValue | null {
  if (!tool.slug) return null;
  return {
    type: 'function',
    function: {
      name: tool.slug,
      description: tool.description ?? tool.human_description ?? tool.name ?? tool.slug,
      parameters: parameterSchema(tool.input_parameters ?? tool.inputParameters),
    },
  };
}

export async function discoverConnectedTools(): Promise<DiscoveredTool[]> {
  if (!hasComposioKey()) return [];

  const accountsResponse = await composioFetch(`/v3.1/connected_accounts?user_ids[]=${encodeURIComponent(COMPOSIO_USER_ID)}&limit=1000`);
  if (!accountsResponse.ok) return [];
  const accounts = recordsFrom(await accountsResponse.json(), ['items', 'connected_accounts', 'connectedAccounts', 'data']) as ConnectedAccount[];
  const accountsByToolkit = new Map<string, string>();
  for (const account of accounts) {
    const toolkit = accountToolkitSlug(account);
    const id = accountId(account);
    if (toolkit && id && isActiveAccount(account) && !accountsByToolkit.has(toolkit)) accountsByToolkit.set(toolkit, id);
  }

  const discovered: DiscoveredTool[] = [];
  await Promise.all([...accountsByToolkit.entries()].map(async ([toolkit, connectedAccountId]) => {
    const params = new URLSearchParams({ toolkit_slug: toolkit, limit: '100' });
    const response = await composioFetch(`/v3/tools?${params}`);
    if (!response.ok) return;
    const tools = recordsFrom(await response.json(), ['items', 'tools', 'data']) as ComposioTool[];
    for (const tool of tools) {
      const definition = toolDefinition(tool);
      if (definition && tool.slug) discovered.push({ slug: tool.slug, toolkit, connectedAccountId, definition });
    }
  }));
  return discovered;
}

export async function handleInboundMessage(input: { conversationId: string; accountId: string; text: string; senderName?: string }) {
  if (!process.env.NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY is not configured');
  const discoveredTools = await discoverConnectedTools();
  const messages: Array<RecordValue> = [
    {
      role: 'system',
      content: 'You are Bookly, a concise and friendly meeting assistant. Use the connected tools when they can answer the customer or complete a requested action. Reason through tool results before replying. Never claim a meeting is booked until the calendar tool succeeds. Ask for explicit confirmation before creating, changing, or cancelling a booking. If no suitable connected tool is available, explain that a team member will follow up.',
    },
    { role: 'user', content: `${input.senderName ? `${input.senderName}: ` : ''}${input.text}` },
  ];
  const tools = discoveredTools.map((tool) => tool.definition);
  const toolsBySlug = new Map(discoveredTools.map((tool) => [tool.slug, tool]));
  let response = await infer(messages, tools);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const message = response.choices?.[0]?.message;
    const calls = message?.tool_calls ?? [];
    if (!message || calls.length === 0) {
      return sendReply(input.conversationId, input.accountId, message?.content ?? 'I’m sorry, I could not prepare a response. A team member will follow up.');
    }

    messages.push({ role: 'assistant', ...message });
    for (const call of calls) {
      let arguments_: RecordValue = {};
      try {
        arguments_ = JSON.parse(call.function.arguments || '{}') as RecordValue;
      } catch {
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: 'The tool arguments were not valid JSON.' }) });
        continue;
      }
      const result = await executeTool(call.function.name, arguments_, toolsBySlug);
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
    response = await infer(messages, tools);
  }

  return sendReply(input.conversationId, input.accountId, 'I’m still working through that request. A team member will follow up with the latest update.');
}

async function infer(messages: Array<RecordValue>, tools: RecordValue[]) {
  const body: RecordValue = {
    model: MODEL,
    messages,
    tools,
    tool_choice: tools.length > 0 ? 'auto' : 'none',
    temperature: 0.2,
    max_tokens: MAX_TOKENS,
    chat_template_kwargs: { thinking_mode: THINKING_MODE },
  };
  const response = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`NVIDIA inference failed with ${response.status}`);
  return (await response.json()) as ModelResponse;
}

async function executeTool(name: string, arguments_: RecordValue, toolsBySlug: Map<string, DiscoveredTool>) {
  if (!hasComposioKey()) return { error: 'The business integration is not connected yet.' };
  const tool = toolsBySlug.get(name);
  if (!tool) return { error: `The ${name} tool is not available from a connected toolkit.` };
  const response = await composioFetch(`/v3.1/tools/execute/${encodeURIComponent(tool.slug)}`, {
    method: 'POST',
    body: JSON.stringify({ connected_account_id: tool.connectedAccountId, user_id: COMPOSIO_USER_ID, arguments: arguments_ }),
  });
  if (!response.ok) return { error: `The ${name} tool failed with status ${response.status}.` };
  return response.json();
}

async function sendReply(conversationId: string, accountId: string, message: string) {
  const response = await zernioFetch(`/v1/inbox/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId, message }),
  });
  if (!response.ok) throw new Error(`Zernio reply failed with ${response.status}`);
  return { message };
}

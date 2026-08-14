import { composioFetch, hasComposioKey } from './composio';
import { zernioFetch } from './zernio';

const NVIDIA_URL = process.env.NVIDIA_API_URL ?? 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = process.env.NVIDIA_MODEL ?? 'meta/llama-3.3-70b-instruct';

const tools = [
  {
    type: 'function',
    function: {
      name: 'check_calendar_availability',
      description: 'Check whether the owner is free on a date and return available meeting times.',
      parameters: { type: 'object', properties: { date: { type: 'string' }, timezone: { type: 'string' }, duration_minutes: { type: 'number' } }, required: ['date'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Create a calendar meeting only after the customer explicitly confirms the proposed time.',
      parameters: { type: 'object', properties: { title: { type: 'string' }, start: { type: 'string' }, end: { type: 'string' }, timezone: { type: 'string' }, attendee_email: { type: 'string' }, location: { type: 'string' } }, required: ['title', 'start', 'end'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_maps',
      description: 'Find a business or meeting location and return useful address and travel details.',
      parameters: { type: 'object', properties: { query: { type: 'string' }, location: { type: 'string' } }, required: ['query'] },
    },
  },
];

const toolSlugs: Record<string, string | undefined> = {
  check_calendar_availability: process.env.COMPOSIO_CALENDAR_AVAILABILITY_TOOL,
  create_calendar_event: process.env.COMPOSIO_CALENDAR_CREATE_TOOL,
  search_maps: process.env.COMPOSIO_MAPS_SEARCH_TOOL,
};

const connectedAccounts: Record<string, string | undefined> = {
  check_calendar_availability: process.env.COMPOSIO_GOOGLE_CALENDAR_CONNECTED_ACCOUNT_ID,
  create_calendar_event: process.env.COMPOSIO_GOOGLE_CALENDAR_CONNECTED_ACCOUNT_ID,
  search_maps: process.env.COMPOSIO_GOOGLE_MAPS_CONNECTED_ACCOUNT_ID,
};

export async function handleInboundMessage(input: { conversationId: string; accountId: string; text: string; senderName?: string }) {
  if (!process.env.NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY is not configured');
  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: 'You are Bookly, a concise and friendly meeting assistant. Use tools to check real availability, maps, and create bookings. Never claim a meeting is booked until the calendar tool succeeds. Ask for confirmation before creating an event. If a request is outside scheduling, explain that a human will follow up.' },
    { role: 'user', content: `${input.senderName ? `${input.senderName}: ` : ''}${input.text}` },
  ];

  const first = await infer(messages);
  const calls = first.choices?.[0]?.message?.tool_calls ?? [];
  if (calls.length === 0) return sendReply(input.conversationId, input.accountId, first.choices?.[0]?.message?.content ?? 'I’m sorry, I couldn’t prepare a response. A team member will follow up.');

  messages.push(first.choices[0].message);
  for (const call of calls) {
    const args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
    const result = await executeTool(call.function.name, args);
    messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
  }
  const second = await infer(messages);
  return sendReply(input.conversationId, input.accountId, second.choices?.[0]?.message?.content ?? 'I found an update but could not format it. A team member will follow up.');
}

async function infer(messages: Array<Record<string, unknown>>) {
  const response = await fetch(NVIDIA_URL, { method: 'POST', headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODEL, messages, tools, tool_choice: 'auto', temperature: 0.2, max_tokens: 500 }) });
  if (!response.ok) throw new Error(`NVIDIA inference failed with ${response.status}`);
  return (await response.json()) as { choices: Array<{ message: { content?: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }> };
}

async function executeTool(name: string, arguments_: Record<string, unknown>) {
  if (!hasComposioKey()) return { error: 'The business integration is not connected yet.' };
  const toolSlug = toolSlugs[name];
  const connectedAccountId = connectedAccounts[name];
  if (!toolSlug || !connectedAccountId) return { error: `The ${name} integration is not configured.` };
  const response = await composioFetch(`/v3.1/tools/execute/${encodeURIComponent(toolSlug)}`, { method: 'POST', body: JSON.stringify({ connected_account_id: connectedAccountId, user_id: 'bookly-user', arguments: arguments_ }) });
  if (!response.ok) return { error: `The ${name} tool failed with status ${response.status}.` };
  return response.json();
}

async function sendReply(conversationId: string, accountId: string, message: string) {
  const response = await zernioFetch(`/v1/inbox/conversations/${encodeURIComponent(conversationId)}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId, message }) });
  if (!response.ok) throw new Error(`Zernio reply failed with ${response.status}`);
  return { message };
}

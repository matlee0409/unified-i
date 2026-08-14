const COMPOSIO_BASE = process.env.COMPOSIO_API_URL ?? 'https://backend.composio.dev/api';

export function hasComposioKey() {
  return Boolean(process.env.COMPOSIO_API_KEY);
}

export function composioFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set('x-api-key', process.env.COMPOSIO_API_KEY ?? '');
  headers.set('content-type', 'application/json');
  return fetch(`${COMPOSIO_BASE}${path}`, { ...init, headers, cache: 'no-store' });
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function recordsFrom(body: unknown, keys: string[]): UnknownRecord[] {
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

function configToolkitSlug(config: UnknownRecord): string | null {
  return toolkitSlug(config.toolkit) ?? toolkitSlug(config.toolkit_slug) ?? toolkitSlug(config.toolkitSlug);
}

function isEnabled(config: UnknownRecord): boolean {
  const status = typeof config.status === 'string' ? config.status.toUpperCase() : '';
  return !['DISABLED', 'INACTIVE', 'DELETED'].includes(status) && config.enabled !== false;
}

function connectedAccountToolkitSlug(account: UnknownRecord): string | null {
  const authConfig = account.auth_config;
  return toolkitSlug(account.toolkit)
    ?? toolkitSlug(account.toolkit_slug)
    ?? toolkitSlug(account.toolkitSlug)
    ?? (isRecord(authConfig) ? configToolkitSlug(authConfig) : null);
}

function isConnected(account: UnknownRecord): boolean {
  const status = typeof account.status === 'string' ? account.status.toUpperCase() : '';
  return !['FAILED', 'EXPIRED', 'REVOKED', 'DISCONNECTED', 'DELETED', 'INACTIVE'].includes(status);
}

export function filterConfiguredApps(toolkitsBody: unknown, authConfigsBody: unknown) {
  const toolkits = recordsFrom(toolkitsBody, ['items', 'toolkits', 'data']);
  const authConfigs = recordsFrom(authConfigsBody, ['items', 'auth_configs', 'authConfigs', 'data'])
    .filter(isEnabled)
    .filter((config) => configToolkitSlug(config));
  const configuredSlugs = new Set(authConfigs.map(configToolkitSlug));

  return {
    toolkits: toolkits.filter((toolkit) => {
      const slug = toolkitSlug(toolkit);
      return slug !== null && configuredSlugs.has(slug);
    }),
    authConfigs,
  };
}

export function filterConnectedApps(toolkitsBody: unknown, authConfigsBody: unknown, connectedAccountsBody: unknown) {
  const configured = filterConfiguredApps(toolkitsBody, authConfigsBody);
  const connectedSlugs = new Set(
    recordsFrom(connectedAccountsBody, ['items', 'connected_accounts', 'connectedAccounts', 'data'])
      .filter(isConnected)
      .map(connectedAccountToolkitSlug)
      .filter((slug): slug is string => slug !== null),
  );

  return {
    toolkits: configured.toolkits.filter((toolkit) => {
      const slug = toolkitSlug(toolkit);
      return slug !== null && connectedSlugs.has(slug);
    }),
    authConfigs: configured.authConfigs.filter((config) => {
      const slug = configToolkitSlug(config);
      return slug !== null && connectedSlugs.has(slug);
    }),
  };
}

function firstForwardedValue(value: string | null): string {
  return value?.split(',')[0]?.trim() ?? '';
}

export function publicRequestOrigin(req: Request): string {
  const protocol = firstForwardedValue(req.headers.get('x-forwarded-proto')).toLowerCase();
  const host = firstForwardedValue(req.headers.get('x-forwarded-host'));

  if ((protocol === 'https' || protocol === 'http') && host && !/[\s/\\?#@]/.test(host)) {
    try {
      return new URL(`${protocol}://${host}`).origin;
    } catch {
      // Fall back to the request URL for local development or malformed proxy headers.
    }
  }

  return new URL(req.url).origin;
}

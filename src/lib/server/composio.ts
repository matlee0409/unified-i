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

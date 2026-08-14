import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicRequestOrigin } from '@/lib/server/composio';
import { POST } from './route';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('publicRequestOrigin', () => {
  it('uses Railway forwarded headers instead of the internal request origin', () => {
    const request = new Request('http://localhost:4100/api/apps/connect', {
      headers: {
        'x-forwarded-host': 'bookly-production.up.railway.app',
        'x-forwarded-proto': 'https',
      },
    });

    expect(publicRequestOrigin(request)).toBe('https://bookly-production.up.railway.app');
  });

  it('falls back to the request origin for local development', () => {
    const request = new Request('http://localhost:4100/api/apps/connect');
    expect(publicRequestOrigin(request)).toBe('http://localhost:4100');
  });
});

describe('POST /api/apps/connect', () => {
  it('sends the public callback URL to Composio', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', 'test-key');
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ redirect_url: 'https://accounts.google.com/oauth' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(new Request('http://localhost:4100/api/apps/connect', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-host': 'bookly-production.up.railway.app',
        'x-forwarded-proto': 'https',
      },
      body: JSON.stringify({
        authConfigId: 'calendar-config',
        toolkit: 'googlecalendar',
        userId: 'bookly-user',
      }),
    }));

    expect(response.status).toBe(200);
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://backend.composio.dev/api/v3/connected_accounts/link');
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      callback_url: 'https://bookly-production.up.railway.app/apps/callback',
      auth_config_id: 'calendar-config',
    });
  });

  it('returns a stable error when Composio omits the redirect URL', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ connection: 'created' })));

    const response = await POST(new Request('https://bookly.example/api/apps/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        authConfigId: 'calendar-config',
        toolkit: 'googlecalendar',
        userId: 'bookly-user',
      }),
    }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ code: 'missing_composio_redirect' });
  });

  it('returns a stable error when Composio responds with invalid JSON', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502 })));

    const response = await POST(new Request('https://bookly.example/api/apps/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        authConfigId: 'calendar-config',
        toolkit: 'googlecalendar',
        userId: 'bookly-user',
      }),
    }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ error: 'Composio returned an invalid response.' });
  });
});

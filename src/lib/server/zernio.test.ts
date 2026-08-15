import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/connect/[platform]/route';
import { clientSessionCookie, createClientInvite } from './client-auth';
import { getClientIdForAccount, getOrCreateDefaultProfileId, zernioFetch } from './zernio';

function json(body: unknown, init?: ResponseInit): Response {
  return Response.json(body, init);
}

describe('getClientIdForAccount', () => {
  it('returns the client ID encoded in the account profile name', async () => {
    vi.stubEnv('ZERNIO_API_KEY', 'test-key');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ accounts: [{ _id: 'account-client', profileId: { _id: 'profile-client' } }] }))
      .mockResolvedValueOnce(json({ profiles: [{ _id: 'profile-client', name: 'Bookly Client client-1' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getClientIdForAccount('account-client')).resolves.toBe('client-1');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/v1/accounts'), expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/v1/profiles'), expect.anything());
  });

  it('does not resolve a non-client profile to a Composio identity', async () => {
    vi.stubEnv('ZERNIO_API_KEY', 'test-key');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ accounts: [{ _id: 'account-owner', profileId: 'profile-owner' }] }))
      .mockResolvedValueOnce(json({ profiles: [{ _id: 'profile-owner', name: 'Unified Inbox' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getClientIdForAccount('account-owner')).resolves.toBeNull();
  });
});

describe('getOrCreateDefaultProfileId', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('trims the configured API key before adding it to an upstream request', async () => {
    vi.stubEnv('ZERNIO_API_KEY', '  test-key  ');
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await zernioFetch('/v1/profiles');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer test-key');
  });

  it('returns the first existing profile ID without creating one', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ profiles: [{ _id: 'profile-1' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getOrCreateDefaultProfileId()).resolves.toBe('profile-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('creates a default profile when the workspace is empty', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ profiles: [] }))
      .mockResolvedValueOnce(json({ profile: { _id: 'profile-created' } }, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getOrCreateDefaultProfileId()).resolves.toBe('profile-created');
    const [, createInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(createInit).toMatchObject({ method: 'POST', body: JSON.stringify({ name: 'Unified Inbox' }) });
    expect(new Headers(createInit.headers).get('idempotency-key')).toBeTruthy();
  });

  it('recovers when another request creates the profile first', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ profiles: [] }))
      .mockResolvedValueOnce(json({ error: 'Name already exists' }, { status: 409 }))
      .mockResolvedValueOnce(json({ profiles: [{ _id: 'profile-raced' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getOrCreateDefaultProfileId()).resolves.toBe('profile-raced');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('preserves an upstream profile-list failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json({ error: 'Unauthorized' }, { status: 401 })),
    );

    const result = await getOrCreateDefaultProfileId();
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    await expect((result as Response).json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('returns a stable error for a malformed creation response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(json({ profiles: [] })).mockResolvedValueOnce(json({ ok: true }, { status: 201 })),
    );

    const result = await getOrCreateDefaultProfileId();
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(502);
    await expect((result as Response).json()).resolves.toMatchObject({ code: 'invalid_profile_response' });
  });
});

describe('channel connect route', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('creates a profile and redirects to the Zernio authorization URL', async () => {
    vi.stubEnv('ZERNIO_API_KEY', 'test-key');
    vi.stubEnv('BOOKLY_INVITE_SECRET', 'invite-secret');
    const invite = createClientInvite('Test client');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ profiles: [] }))
      .mockResolvedValueOnce(json({ _id: 'profile-created' }, { status: 201 }))
      .mockResolvedValueOnce(json({ accounts: [] }))
      .mockResolvedValueOnce(json({ profiles: [] }))
      .mockResolvedValueOnce(json({ authUrl: 'https://facebook.example/oauth' }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost:4100/api/connect/facebook', {
      headers: {
        'x-forwarded-host': 'inbox.example',
        'x-forwarded-proto': 'https',
        cookie: clientSessionCookie(invite),
      },
    }), {
      params: Promise.resolve({ platform: 'facebook' }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://facebook.example/oauth');
    expect(String(fetchMock.mock.calls[4][0])).toContain(
      '/v1/connect/facebook?profileId=profile-created&redirect_url=https%3A%2F%2Finbox.example%2Fchannels%2Fcallback',
    );
  });
});

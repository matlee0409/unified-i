import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClientInvite } from '@/lib/server/client-auth';
import { GET } from './route';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('GET /api/client/invite/accept', () => {
  it('redirects an accepted invite to channels on the public origin', async () => {
    vi.stubEnv('BOOKLY_INVITE_SECRET', 'invite-secret');
    vi.stubEnv('ZERNIO_API_KEY', 'zernio-key');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ profiles: [] }))
      .mockResolvedValueOnce(Response.json({ _id: 'profile-id' })));

    const token = createClientInvite('Lsm');
    const response = await GET(new Request(`http://localhost:4100/api/client/invite/accept?token=${token}&redirect=/channels`, {
      headers: {
        'x-forwarded-host': '6311c3ef2fee450cb9b3-maroon-well-4nqjo76m.builderio.dev',
        'x-forwarded-proto': 'https',
      },
    }));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://6311c3ef2fee450cb9b3-maroon-well-4nqjo76m.builderio.dev/channels');
    expect(response.headers.get('set-cookie')).toContain('bookly-client-session=');
  });
});

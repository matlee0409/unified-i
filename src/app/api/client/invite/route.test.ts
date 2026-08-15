import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/client/invite', () => {
  it('builds an invite URL from the forwarded public origin', async () => {
    vi.stubEnv('BOOKLY_ADMIN_SECRET', 'admin-secret');
    vi.stubEnv('BOOKLY_INVITE_SECRET', 'invite-secret');

    const response = await POST(new Request('http://localhost:4100/api/client/invite', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bookly-admin-secret': 'admin-secret',
        'x-forwarded-host': '6311c3ef2fee450cb9b3-maroon-well-4nqjo76m.builderio.dev',
        'x-forwarded-proto': 'https',
      },
      body: JSON.stringify({ clientName: 'Lsm' }),
    }));

    expect(response.status).toBe(200);
    const { inviteUrl } = await response.json() as { inviteUrl: string };
    const url = new URL(inviteUrl);
    expect(url.origin).toBe('https://6311c3ef2fee450cb9b3-maroon-well-4nqjo76m.builderio.dev');
    expect(url.pathname).toBe('/api/client/invite/accept');
    expect(url.searchParams.get('redirect')).toBe('/channels');
    expect(url.searchParams.get('token')).toBeTruthy();
  });
});

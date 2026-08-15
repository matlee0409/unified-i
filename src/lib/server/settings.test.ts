import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMessageAccounts } from './settings';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('fetchMessageAccounts', () => {
  it('returns only accounts belonging to the requested client profile', async () => {
    vi.stubEnv('ZERNIO_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ accounts: [
        { _id: 'client-account', platform: 'whatsapp', profileId: 'profile-client' },
        { _id: 'owner-account', platform: 'whatsapp', profileId: 'profile-owner' },
      ] }))
      .mockResolvedValueOnce(Response.json({ profiles: [
        { _id: 'profile-client', name: 'Client' },
        { _id: 'profile-owner', name: 'Owner' },
      ] })));

    await expect(fetchMessageAccounts({ profileId: 'profile-client', forceRefresh: true })).resolves.toMatchObject({
      accounts: [{ _id: 'client-account' }],
      profiles: [{ _id: 'profile-client' }],
    });
  });
});

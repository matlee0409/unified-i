import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientSessionCookie, createClientInvite, readClientInvite, readClientSession } from './client-auth';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('client invite sessions', () => {
  it('round-trips a signed invite into a client session', () => {
    vi.stubEnv('BOOKLY_INVITE_SECRET', 'invite-secret');
    const token = createClientInvite('Acme Dental');
    const invite = readClientInvite(token);
    const session = readClientSession(new Request('https://bookly.example', { headers: { cookie: clientSessionCookie(token) } }));

    expect(invite?.clientName).toBe('Acme Dental');
    expect(session?.clientId).toBe(invite?.clientId);
  });

  it('rejects a tampered invite', () => {
    vi.stubEnv('BOOKLY_INVITE_SECRET', 'invite-secret');
    const token = createClientInvite('Acme Dental');

    expect(readClientInvite(`${token}tampered`)).toBeNull();
  });
});

import { createHmac, timingSafeEqual } from 'node:crypto';
import { fetchMessageAccounts } from './settings';
import { getOrCreateClientProfileId } from './zernio';

export const CLIENT_SESSION_COOKIE = 'bookly-client-session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type ClientInvite = {
  clientId: string;
  clientName: string;
  expiresAt: number;
};

const CLIENT_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const clientProfiles = new Map<string, string>();

function secret() {
  return process.env.BOOKLY_INVITE_SECRET?.trim() ?? '';
}

function encode(value: string) {
  return Buffer.from(value).toString('base64url');
}

function decode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signature(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function signedValue(payload: string) {
  return `${encode(payload)}.${signature(payload)}`;
}

function verifySignedValue(value: string): string | null {
  if (!secret()) return null;
  const [encoded, provided] = value.split('.');
  if (!encoded || !provided) return null;
  const payload = decode(encoded);
  const expected = signature(payload);
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return payload;
}

export function hasInviteSecret() {
  return Boolean(secret());
}

export function createClientInvite(clientName: string) {
  const invite: ClientInvite = {
    clientId: crypto.randomUUID(),
    clientName: clientName.trim(),
    expiresAt: Date.now() + CLIENT_INVITE_TTL_MS,
  };
  return signedValue(JSON.stringify(invite));
}

export function readClientInvite(token: string): ClientInvite | null {
  try {
    const payload = verifySignedValue(token);
    if (!payload) return null;
    const invite = JSON.parse(payload) as Partial<ClientInvite>;
    if (typeof invite.clientId !== 'string' || typeof invite.clientName !== 'string' || !invite.clientName.trim() || typeof invite.expiresAt !== 'number' || invite.expiresAt <= Date.now()) return null;
    return { clientId: invite.clientId, clientName: invite.clientName.trim(), expiresAt: invite.expiresAt };
  } catch {
    return null;
  }
}

export function readClientSession(req: Request): ClientInvite | null {
  const cookie = req.headers.get('cookie')?.split(/;\s*/).find((value) => value.startsWith(`${CLIENT_SESSION_COOKIE}=`));
  if (!cookie) return null;
  return readClientInvite(decodeURIComponent(cookie.slice(CLIENT_SESSION_COOKIE.length + 1)));
}

export function clientSessionCookie(token: string) {
  const attrs = [
    `${CLIENT_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (process.env.NODE_ENV === 'production') attrs.push('Secure');
  return attrs.join('; ');
}

export async function getClientContext(req: Request): Promise<(ClientInvite & { profileId: string }) | Response> {
  const session = readClientSession(req);
  if (!session) return Response.json({ error: 'A client invite is required.', code: 'client_session_required' }, { status: 401 });
  const cachedProfileId = clientProfiles.get(session.clientId);
  if (cachedProfileId) return { ...session, profileId: cachedProfileId };
  const profileResult = await getOrCreateClientProfileId(session.clientId);
  if (profileResult instanceof Response) return profileResult;
  clientProfiles.set(session.clientId, profileResult);
  return { ...session, profileId: profileResult };
}

export async function authorizeClientAccount(req: Request, accountId: string): Promise<Response | null> {
  const client = await getClientContext(req);
  if (client instanceof Response) return client;
  const accounts = await fetchMessageAccounts({ profileId: client.profileId });
  if (accounts instanceof Response) return accounts;
  if (!accounts.accounts.some((account) => account._id === accountId)) {
    return Response.json({ error: 'That account is not available to this client.' }, { status: 403 });
  }
  return null;
}

export function hasAdminSecret() {
  return Boolean(process.env.BOOKLY_ADMIN_SECRET?.trim());
}

export function validAdminSecret(value: string | null) {
  const configured = process.env.BOOKLY_ADMIN_SECRET?.trim() ?? '';
  if (!configured || !value) return false;
  const left = Buffer.from(configured);
  const right = Buffer.from(value);
  return left.length === right.length && timingSafeEqual(left, right);
}

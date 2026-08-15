import { NextResponse } from 'next/server';
import { clientSessionCookie, readClientInvite } from '@/lib/server/client-auth';
import { publicRequestOrigin } from '@/lib/server/composio';
import { getOrCreateClientProfileId, hasApiKey } from '@/lib/server/zernio';

export async function GET(req: Request) {
  if (!hasApiKey()) return NextResponse.json({ error: 'ZERNIO_API_KEY is not configured.' }, { status: 500 });
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const invite = readClientInvite(token);
  if (!invite) return NextResponse.json({ error: 'This client invite is invalid or expired.' }, { status: 401 });

  const profileResult = await getOrCreateClientProfileId(invite.clientId);
  if (profileResult instanceof Response) return profileResult;

  const redirect = url.searchParams.get('redirect');
  const destination = redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
  const response = NextResponse.redirect(new URL(destination, publicRequestOrigin(req)));
  response.headers.append('Set-Cookie', clientSessionCookie(token));
  return response;
}

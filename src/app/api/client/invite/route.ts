import { NextResponse } from 'next/server';
import { createClientInvite, hasAdminSecret, hasInviteSecret, validAdminSecret } from '@/lib/server/client-auth';

export async function POST(req: Request) {
  if (!hasAdminSecret()) return NextResponse.json({ error: 'BOOKLY_ADMIN_SECRET is not configured.' }, { status: 500 });
  if (!hasInviteSecret()) return NextResponse.json({ error: 'BOOKLY_INVITE_SECRET is not configured.' }, { status: 500 });
  if (!validAdminSecret(req.headers.get('x-bookly-admin-secret'))) {
    return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  const clientName = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).clientName : null;
  if (typeof clientName !== 'string' || !clientName.trim()) {
    return NextResponse.json({ error: 'clientName is required.' }, { status: 400 });
  }

  const token = createClientInvite(clientName);
  const inviteUrl = new URL('/api/client/invite/accept', req.url);
  inviteUrl.searchParams.set('token', token);
  inviteUrl.searchParams.set('redirect', '/channels');
  return NextResponse.json({ inviteUrl: inviteUrl.toString() });
}

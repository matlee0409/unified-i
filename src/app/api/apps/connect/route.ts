import { NextResponse } from 'next/server';
import { composioFetch, hasComposioKey } from '@/lib/server/composio';

export async function POST(req: Request) {
  if (!hasComposioKey()) {
    return NextResponse.json({ error: 'COMPOSIO_API_KEY is not configured.', code: 'missing_composio_key' }, { status: 500 });
  }

  let body: { authConfigId?: string; toolkit?: string; userId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.authConfigId || !body.toolkit || !body.userId) {
    return NextResponse.json({ error: 'authConfigId, toolkit, and userId are required.' }, { status: 400 });
  }

  const callbackUrl = new URL('/apps/callback', req.url).toString();
  const upstream = await composioFetch('/v3.1/connected_accounts/link', {
    method: 'POST',
    body: JSON.stringify({
      auth_config_id: body.authConfigId,
      user_id: body.userId,
      alias: `${body.toolkit}-${body.userId}`,
      callback_url: callbackUrl,
    }),
  });
  const payload = await upstream.json();
  if (!upstream.ok) return NextResponse.json(payload, { status: upstream.status });
  return NextResponse.json({ redirectUrl: payload.redirect_url ?? payload.redirectUrl });
}

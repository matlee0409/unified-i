import { NextResponse } from 'next/server';
import { readClientSession } from '@/lib/server/client-auth';
import { composioFetch, hasComposioKey, publicRequestOrigin } from '@/lib/server/composio';

export async function POST(req: Request) {
  if (!hasComposioKey()) {
    return NextResponse.json({ error: 'COMPOSIO_API_KEY is not configured.', code: 'missing_composio_key' }, { status: 500 });
  }
  const client = readClientSession(req);
  if (!client) return NextResponse.json({ error: 'A client invite is required.', code: 'client_session_required' }, { status: 401 });

  let body: { authConfigId?: string; toolkit?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.authConfigId || !body.toolkit) {
    return NextResponse.json({ error: 'authConfigId and toolkit are required.' }, { status: 400 });
  }

  const callbackUrl = new URL('/apps/callback', publicRequestOrigin(req)).toString();
  const upstream = await composioFetch('/v3/connected_accounts/link', {
    method: 'POST',
    body: JSON.stringify({
      auth_config_id: body.authConfigId,
      user_id: client.clientId,
      alias: `${body.toolkit}-${client.clientId}`,
      callback_url: callbackUrl,
    }),
  });
  const payload = (await upstream.json().catch(() => ({ error: 'Composio returned an invalid response.' }))) as {
    redirect_url?: unknown;
    redirectUrl?: unknown;
    error?: unknown;
  };
  if (!upstream.ok) return NextResponse.json(payload, { status: upstream.status });

  const redirectUrl = payload.redirect_url ?? payload.redirectUrl;
  if (typeof redirectUrl !== 'string' || !redirectUrl) {
    return NextResponse.json(
      { error: 'Composio did not return an authorization URL.', code: 'missing_composio_redirect' },
      { status: 502 },
    );
  }
  return NextResponse.json({ redirectUrl });
}

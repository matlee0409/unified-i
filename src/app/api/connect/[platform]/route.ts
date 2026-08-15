import { NextResponse } from 'next/server';
import { getClientContext } from '@/lib/server/client-auth';
import { fetchMessageAccounts } from '@/lib/server/settings';
import { MESSAGE_PLATFORMS } from '@/lib/capabilities';
import { publicRequestOrigin } from '@/lib/server/composio';
import { hasApiKey, zernioFetch } from '@/lib/server/zernio';

type ConnectResponse = { authUrl?: string };

export async function GET(
  req: Request,
  ctx: { params: Promise<{ platform: string }> },
) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: 'ZERNIO_API_KEY is not configured.', code: 'missing_api_key' }, { status: 500 });
  }

  const { platform } = await ctx.params;
  if (!MESSAGE_PLATFORMS.includes(platform as (typeof MESSAGE_PLATFORMS)[number])) {
    return NextResponse.json({ error: 'Unsupported channel.', code: 'invalid_platform' }, { status: 400 });
  }

  const client = await getClientContext(req);
  if (client instanceof Response) return client;
  const accounts = await fetchMessageAccounts({ profileId: client.profileId, forceRefresh: true });
  if (accounts instanceof Response) return accounts;
  if (accounts.accounts.some((account) => account.platform === platform)) {
    const alreadyConnected = new URL('/channels/callback', publicRequestOrigin(req));
    alreadyConnected.searchParams.set('connected', '1');
    alreadyConnected.searchParams.set('platform', platform);
    return NextResponse.redirect(alreadyConnected);
  }

  const profileId = client.profileId;
  const redirectUrl = new URL('/channels/callback', publicRequestOrigin(req)).toString();
  const params = new URLSearchParams({ profileId, redirect_url: redirectUrl });
  const upstream = await zernioFetch(`/v1/connect/${encodeURIComponent(platform)}?${params}`);
  if (!upstream.ok) return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });

  const body = (await upstream.json()) as ConnectResponse;
  if (!body.authUrl) {
    return NextResponse.json({ error: 'Zernio did not return an authorization URL.', code: 'invalid_upstream_response' }, { status: 502 });
  }
  return NextResponse.redirect(body.authUrl);
}

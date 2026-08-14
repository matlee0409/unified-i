import { NextResponse } from 'next/server';
import { MESSAGE_PLATFORMS } from '@/lib/capabilities';
import { getOrCreateDefaultProfileId, hasApiKey, zernioFetch } from '@/lib/server/zernio';

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

  const incoming = new URL(req.url);
  const suppliedProfileId = incoming.searchParams.get('profileId')?.trim();
  const profileResult = suppliedProfileId || (await getOrCreateDefaultProfileId());
  if (profileResult instanceof Response) return profileResult;
  const profileId = profileResult;

  const redirectUrl = new URL('/channels/callback', incoming.origin).toString();
  const params = new URLSearchParams({ profileId, redirect_url: redirectUrl });
  const upstream = await zernioFetch(`/v1/connect/${encodeURIComponent(platform)}?${params}`);
  if (!upstream.ok) return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });

  const body = (await upstream.json()) as ConnectResponse;
  if (!body.authUrl) {
    return NextResponse.json({ error: 'Zernio did not return an authorization URL.', code: 'invalid_upstream_response' }, { status: 502 });
  }
  return NextResponse.redirect(body.authUrl);
}

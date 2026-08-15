import { authorizeClientAccount } from '@/lib/server/client-auth';
import { hasApiKey, missingKeyResponse, proxy } from '@/lib/server/zernio';

type Ctx = { params: Promise<{ conversationId: string; messageId: string }> };

async function reactionsPath(ctx: Ctx): Promise<string> {
  const { conversationId, messageId } = await ctx.params;
  return `/v1/inbox/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/reactions`;
}

export async function POST(req: Request, ctx: Ctx) {
  if (!hasApiKey()) return missingKeyResponse();
  const body = await req.clone().json().catch(() => null) as Record<string, unknown> | null;
  const accountId = typeof body?.accountId === 'string' ? body.accountId : null;
  if (!accountId) return Response.json({ error: 'accountId is required.' }, { status: 400 });
  const authorizationError = await authorizeClientAccount(req, accountId);
  if (authorizationError) return authorizationError;
  return proxy({ req, path: await reactionsPath(ctx), method: 'POST', jsonBody: true });
}

// Upstream takes accountId as a QUERY param on DELETE (no body).
export async function DELETE(req: Request, ctx: Ctx) {
  if (!hasApiKey()) return missingKeyResponse();
  const accountId = new URL(req.url).searchParams.get('accountId');
  if (!accountId) return Response.json({ error: 'accountId is required.' }, { status: 400 });
  const authorizationError = await authorizeClientAccount(req, accountId);
  if (authorizationError) return authorizationError;
  return proxy({ req, path: await reactionsPath(ctx), method: 'DELETE', query: ['accountId'] });
}

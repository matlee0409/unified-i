import { authorizeClientAccount } from '@/lib/server/client-auth';
import { hasApiKey, missingKeyResponse, proxy } from '@/lib/server/zernio';

type Ctx = { params: Promise<{ conversationId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  if (!hasApiKey()) return missingKeyResponse();
  const { conversationId } = await ctx.params;
  const accountId = new URL(req.url).searchParams.get('accountId');
  if (!accountId) return Response.json({ error: 'accountId is required.' }, { status: 400 });
  const authorizationError = await authorizeClientAccount(req, accountId);
  if (authorizationError) return authorizationError;
  return proxy({
    req,
    path: `/v1/inbox/conversations/${encodeURIComponent(conversationId)}`,
    query: ['accountId'],
  });
}

// Upstream archive/update is PUT (PATCH would 405).
export async function PUT(req: Request, ctx: Ctx) {
  if (!hasApiKey()) return missingKeyResponse();
  const { conversationId } = await ctx.params;
  const body = await req.clone().json().catch(() => null) as Record<string, unknown> | null;
  const accountId = typeof body?.accountId === 'string' ? body.accountId : null;
  if (!accountId) return Response.json({ error: 'accountId is required.' }, { status: 400 });
  const authorizationError = await authorizeClientAccount(req, accountId);
  if (authorizationError) return authorizationError;
  return proxy({
    req,
    path: `/v1/inbox/conversations/${encodeURIComponent(conversationId)}`,
    method: 'PUT',
    jsonBody: true,
  });
}

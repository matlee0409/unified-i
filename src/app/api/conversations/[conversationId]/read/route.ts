import { authorizeClientAccount } from '@/lib/server/client-auth';
import { hasApiKey, missingKeyResponse, proxy } from '@/lib/server/zernio';

type Ctx = { params: Promise<{ conversationId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  if (!hasApiKey()) return missingKeyResponse();
  const { conversationId } = await ctx.params;
  const body = await req.clone().json().catch(() => null) as Record<string, unknown> | null;
  const accountId = typeof body?.accountId === 'string' ? body.accountId : null;
  if (!accountId) return Response.json({ error: 'accountId is required.' }, { status: 400 });
  const authorizationError = await authorizeClientAccount(req, accountId);
  if (authorizationError) return authorizationError;
  return proxy({
    req,
    path: `/v1/inbox/conversations/${encodeURIComponent(conversationId)}/read`,
    method: 'POST',
    jsonBody: true,
  });
}

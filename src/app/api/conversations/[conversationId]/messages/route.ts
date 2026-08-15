import { authorizeClientAccount } from '@/lib/server/client-auth';
import {
  forwardMultipart,
  hasApiKey,
  missingKeyResponse,
  passthrough,
  proxy,
} from '@/lib/server/zernio';

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
    path: `/v1/inbox/conversations/${encodeURIComponent(conversationId)}/messages`,
    query: ['accountId', 'limit', 'cursor', 'sortOrder'],
  });
}

export async function POST(req: Request, ctx: Ctx) {
  if (!hasApiKey()) return missingKeyResponse();
  const { conversationId } = await ctx.params;
  const path = `/v1/inbox/conversations/${encodeURIComponent(conversationId)}/messages`;
  const body = await req.clone().json().catch(() => null) as Record<string, unknown> | null;
  const accountId = typeof body?.accountId === 'string' ? body.accountId : new URL(req.url).searchParams.get('accountId');
  if (!accountId) return Response.json({ error: 'accountId is required.' }, { status: 400 });
  const authorizationError = await authorizeClientAccount(req, accountId);
  if (authorizationError) return authorizationError;

  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    return passthrough(await forwardMultipart({ req, path }));
  }
  return proxy({ req, path, method: 'POST', jsonBody: true });
}

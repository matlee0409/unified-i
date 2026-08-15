import { getBotConfiguration, updateKnowledgeBase } from '@/lib/server/bot-config';

export async function GET() {
  return Response.json({ knowledgeBase: getBotConfiguration().knowledgeBase });
}

export async function PUT(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const value = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).knowledgeBase : null;
  if (typeof value !== 'string') {
    return Response.json({ error: 'knowledgeBase must be a string.' }, { status: 400 });
  }

  return Response.json({ knowledgeBase: updateKnowledgeBase(value) });
}

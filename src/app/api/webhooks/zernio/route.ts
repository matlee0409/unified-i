import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { handleInboundMessage } from '@/lib/server/meeting-bot';

function validSignature(raw: string, signature: string | null) {
  const secret = process.env.ZERNIO_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const left = Buffer.from(expected);
  const right = Buffer.from(signature.replace(/^sha256=/, ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get('x-zernio-signature') ?? req.headers.get('x-webhook-signature'))) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  const body = JSON.parse(raw) as Record<string, unknown>;
  const event = (body.data ?? body) as Record<string, unknown>;
  const direction = event.direction ?? (event.message as Record<string, unknown> | undefined)?.direction;
  if (body.type && body.type !== 'message.received') return NextResponse.json({ received: true, ignored: true });
  if (direction && direction !== 'incoming') return NextResponse.json({ received: true, ignored: true });

  const text = String(event.text ?? event.messageText ?? (event.message as Record<string, unknown> | undefined)?.text ?? '').trim();
  const conversationId = String(event.conversationId ?? event.conversation_id ?? '');
  const accountId = String(event.accountId ?? event.account_id ?? '');
  if (!text || !conversationId || !accountId) return NextResponse.json({ error: 'Missing inbound message fields.' }, { status: 400 });

  try {
    await handleInboundMessage({ conversationId, accountId, text, senderName: typeof event.senderName === 'string' ? event.senderName : undefined });
    return NextResponse.json({ received: true, handled: true });
  } catch (error) {
    console.error('Meeting bot webhook failed', error);
    return NextResponse.json({ error: 'The meeting bot could not process this message.' }, { status: 502 });
  }
}

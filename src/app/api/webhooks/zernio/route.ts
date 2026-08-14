import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { handleInboundMessage } from '@/lib/server/meeting-bot';

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RecordValue) : {};
}

function stringValue(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? '';
}

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
  if (!validSignature(raw, req.headers.get('x-zernio-signature') ?? req.headers.get('x-late-signature') ?? req.headers.get('x-webhook-signature'))) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  let body: RecordValue;
  try {
    body = asRecord(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: 'Invalid webhook JSON.' }, { status: 400 });
  }

  const payload = asRecord(body.data ?? body);
  const message = asRecord(payload.message);
  const conversation = asRecord(payload.conversation);
  const account = asRecord(payload.account);
  const eventName = stringValue(body.event, body.type, payload.event, payload.type);
  const direction = stringValue(message.direction, payload.direction);
  if (eventName && eventName !== 'message.received') return NextResponse.json({ received: true, ignored: true });
  if (direction && direction !== 'incoming') return NextResponse.json({ received: true, ignored: true });

  const sender = asRecord(message.sender);
  const text = stringValue(message.text, message.message, payload.text, payload.messageText);
  const conversationId = stringValue(conversation.id, payload.conversationId, payload.conversation_id, message.conversationId, message.conversation_id);
  const accountId = stringValue(account.id, payload.accountId, payload.account_id, message.accountId, message.account_id);
  const senderName = stringValue(sender.name, message.senderName, payload.senderName);
  if (!text || !conversationId || !accountId) return NextResponse.json({ error: 'Missing inbound message fields.' }, { status: 400 });

  try {
    await handleInboundMessage({ conversationId, accountId, text, senderName: senderName || undefined });
    return NextResponse.json({ received: true, handled: true });
  } catch (error) {
    console.error('Meeting bot webhook failed', error);
    return NextResponse.json({ error: 'The meeting bot could not process this message.' }, { status: 502 });
  }
}

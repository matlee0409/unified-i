import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleInboundMessage } from '@/lib/server/meeting-bot';
import { POST } from './route';

vi.mock('@/lib/server/meeting-bot', () => ({
  handleInboundMessage: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('POST /api/webhooks/zernio', () => {
  it('passes the nested message.received payload to the booking bot', async () => {
    const response = await POST(new Request('https://bookly.example/zernio/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'message.received',
        account: { id: 'account-123' },
        conversation: { id: 'conversation-123' },
        message: {
          direction: 'incoming',
          text: 'hi',
          sender: { name: 'Lee-Roy' },
        },
      }),
    }));

    expect(response.status).toBe(200);
    expect(handleInboundMessage).toHaveBeenCalledWith({
      conversationId: 'conversation-123',
      accountId: 'account-123',
      text: 'hi',
      senderName: 'Lee-Roy',
    });
  });

  it('ignores a repeated delivery of the same inbound message', async () => {
    const payload = {
      event: 'message.received',
      data: {
        messageId: 'message-123',
        conversationId: 'conversation-123',
        accountId: 'account-123',
        direction: 'incoming',
        text: 'hi',
      },
    };

    const first = await POST(new Request('https://bookly.example/zernio/webhook', {
      method: 'POST',
      body: JSON.stringify(payload),
    }));
    const second = await POST(new Request('https://bookly.example/zernio/webhook', {
      method: 'POST',
      body: JSON.stringify(payload),
    }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toEqual({ received: true, duplicate: true });
    expect(handleInboundMessage).toHaveBeenCalledTimes(1);
  });

  it('ignores outgoing messages', async () => {
    const response = await POST(new Request('https://bookly.example/zernio/webhook', {
      method: 'POST',
      body: JSON.stringify({
        event: 'message.received',
        account: { id: 'account-123' },
        conversation: { id: 'conversation-123' },
        message: { direction: 'outgoing', text: 'reply' },
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, ignored: true });
    expect(handleInboundMessage).not.toHaveBeenCalled();
  });
});

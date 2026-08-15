import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateKnowledgeBase } from './bot-config';
import { handleInboundMessage } from './meeting-bot';

function json(body: unknown, init?: ResponseInit) {
  return Response.json(body, init);
}

afterEach(() => {
  updateKnowledgeBase('');
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('handleInboundMessage', () => {
  it('discovers connected toolkit tools and reasons through multiple tool calls', async () => {
    vi.stubEnv('NVIDIA_API_KEY', 'nvidia-key');
    vi.stubEnv('COMPOSIO_API_KEY', 'composio-key');
    vi.stubEnv('ZERNIO_API_KEY', 'zernio-key');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ items: [{ id: 'calendar-account', toolkit: { slug: 'googlecalendar' }, status: 'ACTIVE' }] }))
      .mockResolvedValueOnce(json({
        items: [
          { slug: 'GOOGLE_CALENDAR_FIND_EVENT', name: 'Find event', input_parameters: { date: { type: 'string', required: true } } },
          { slug: 'GOOGLE_CALENDAR_CREATE_EVENT', name: 'Create event', input_parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] } },
        ],
      }))
      .mockResolvedValueOnce(json({ choices: [{ message: { role: 'assistant', tool_calls: [{ id: 'call-1', function: { name: 'GOOGLE_CALENDAR_FIND_EVENT', arguments: '{"date":"2026-04-10"}' } }] } }] }))
      .mockResolvedValueOnce(json({ data: { available: ['10:00'] } }))
      .mockResolvedValueOnce(json({ choices: [{ message: { role: 'assistant', tool_calls: [{ id: 'call-2', function: { name: 'GOOGLE_CALENDAR_CREATE_EVENT', arguments: '{"title":"Demo"}' } }] } }] }))
      .mockResolvedValueOnce(json({ data: { id: 'event-1' } }))
      .mockResolvedValueOnce(json({ choices: [{ message: { content: 'Your meeting is booked.' } }] }))
      .mockResolvedValueOnce(json({ sent: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(handleInboundMessage({ conversationId: 'conversation-1', accountId: 'account-1', text: 'Book a demo.' })).resolves.toEqual({ message: 'Your meeting is booked.' });

    const firstInference = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body)) as { tools: Array<{ function: { name: string; parameters: Record<string, unknown> } }>; chat_template_kwargs: { thinking_mode: string } };
    expect(firstInference.tools.map((tool) => tool.function.name)).toEqual(['GOOGLE_CALENDAR_FIND_EVENT', 'GOOGLE_CALENDAR_CREATE_EVENT']);
    expect(firstInference.tools[0]?.function.parameters).toMatchObject({ type: 'object', required: ['date'] });
    expect(firstInference.chat_template_kwargs).toEqual({ thinking_mode: 'enabled' });

    const firstExecution = fetchMock.mock.calls[3] as [string, RequestInit];
    expect(firstExecution[0]).toContain('/v3.1/tools/execute/GOOGLE_CALENDAR_FIND_EVENT');
    expect(JSON.parse(String(firstExecution[1].body))).toMatchObject({ connected_account_id: 'calendar-account', arguments: { date: '2026-04-10' } });

    const secondExecution = fetchMock.mock.calls[5] as [string, RequestInit];
    expect(secondExecution[0]).toContain('/v3.1/tools/execute/GOOGLE_CALENDAR_CREATE_EVENT');
    expect(JSON.parse(String(secondExecution[1].body))).toMatchObject({ connected_account_id: 'calendar-account', arguments: { title: 'Demo' } });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/v1/inbox/conversations/conversation-1/messages'), expect.anything());
  });

  it('includes saved business information in the system message', async () => {
    vi.stubEnv('NVIDIA_API_KEY', 'nvidia-key');
    vi.stubEnv('ZERNIO_API_KEY', 'zernio-key');
    updateKnowledgeBase('We offer consultations Monday through Friday from 9am to 5pm.');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ choices: [{ message: { content: 'Thanks, I can help with that.' } }] }))
      .mockResolvedValueOnce(json({ sent: true }));
    vi.stubGlobal('fetch', fetchMock);

    await handleInboundMessage({ conversationId: 'conversation-2', accountId: 'account-2', text: 'What are your hours?' });

    const inference = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { messages: Array<{ role: string; content: string }> };
    expect(inference.messages[0]?.content).toContain('We offer consultations Monday through Friday from 9am to 5pm.');
  });
});

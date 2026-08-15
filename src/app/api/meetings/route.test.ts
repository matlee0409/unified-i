import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientSessionCookie, createClientInvite } from '@/lib/server/client-auth';
import { GET } from './route';

function json(body: unknown) {
  return Response.json(body);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('GET /api/meetings', () => {
  it('lists meetings from the invite client calendar', async () => {
    vi.stubEnv('BOOKLY_INVITE_SECRET', 'invite-secret');
    vi.stubEnv('COMPOSIO_API_KEY', 'composio-key');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ items: [{ id: 'calendar-account', toolkit: { slug: 'googlecalendar' }, status: 'ACTIVE' }] }))
      .mockResolvedValueOnce(json({ data: { items: [{
        id: 'meeting-1',
        summary: 'Intro call',
        description: 'Discuss the project.',
        start: { dateTime: '2026-04-10T10:00:00Z' },
        end: { dateTime: '2026-04-10T10:30:00Z' },
      }] } }));
    vi.stubGlobal('fetch', fetchMock);

    const token = createClientInvite('Lsm');
    const response = await GET(new Request('http://localhost:4100/api/meetings', {
      headers: { cookie: clientSessionCookie(token) },
    }));

    expect(response.status).toBe(200);
    const body = await response.json() as { connected: boolean; month: string; meetings: Array<Record<string, unknown>> };
    expect(body.connected).toBe(true);
    expect(body.month).toMatch(/^\d{4}-\d{2}$/);
    expect(body.meetings).toEqual([expect.objectContaining({ id: 'meeting-1', title: 'Intro call', allDay: false })]);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('user_ids[]=');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/v3.1/tools/execute/GOOGLECALENDAR_EVENTS_LIST');
    expect(JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body))).toMatchObject({
      connected_account_id: 'calendar-account',
      arguments: { calendar_id: 'primary' },
    });
  });

  it('reports when the client has not connected Google Calendar', async () => {
    vi.stubEnv('BOOKLY_INVITE_SECRET', 'invite-secret');
    vi.stubEnv('COMPOSIO_API_KEY', 'composio-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ items: [] })));

    const response = await GET(new Request('http://localhost:4100/api/meetings', {
      headers: { cookie: clientSessionCookie(createClientInvite('Lsm')) },
    }));

    await expect(response.json()).resolves.toEqual({ connected: false, meetings: [] });
  });
});

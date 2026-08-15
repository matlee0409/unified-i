import { NextResponse } from 'next/server';
import { readClientSession } from '@/lib/server/client-auth';
import { composioFetch, hasComposioKey } from '@/lib/server/composio';

const CALENDAR_TOOLKIT = 'googlecalendar';
const CALENDAR_LIST_TOOL = 'GOOGLECALENDAR_EVENTS_LIST';

type RecordValue = Record<string, unknown>;

type Meeting = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end?: string;
  allDay: boolean;
};

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function recordsFrom(body: unknown, keys: string[]): RecordValue[] {
  if (Array.isArray(body)) return body.filter(isRecord);
  if (!isRecord(body)) return [];
  for (const key of keys) {
    const value = body[key];
    if (Array.isArray(value)) return value.filter(isRecord);
    if (isRecord(value)) {
      const nested = recordsFrom(value, keys);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

function connectedCalendarId(body: unknown): string | null {
  const accounts = recordsFrom(body, ['items', 'connected_accounts', 'connectedAccounts', 'data']);
  const account = accounts.find((candidate) => {
    const toolkit = candidate.toolkit;
    const slug = typeof toolkit === 'string'
      ? toolkit
      : isRecord(toolkit) && typeof toolkit.slug === 'string'
        ? toolkit.slug
        : typeof candidate.toolkit_slug === 'string'
          ? candidate.toolkit_slug
          : typeof candidate.toolkitSlug === 'string'
            ? candidate.toolkitSlug
            : '';
    const status = typeof candidate.status === 'string' ? candidate.status.toUpperCase() : '';
    return slug.toLowerCase() === CALENDAR_TOOLKIT && !['FAILED', 'EXPIRED', 'REVOKED', 'DISCONNECTED', 'DELETED', 'INACTIVE'].includes(status);
  });
  const id = account?.id ?? account?.nanoid;
  return typeof id === 'string' && id ? id : null;
}

function dateValue(value: unknown): string | null {
  if (typeof value === 'string' && value) return value;
  if (!isRecord(value)) return null;
  if (typeof value.dateTime === 'string' && value.dateTime) return value.dateTime;
  if (typeof value.date === 'string' && value.date) return value.date;
  return null;
}

function normalizeMeeting(value: RecordValue): Meeting | null {
  const id = typeof value.id === 'string' ? value.id : null;
  const start = dateValue(value.start);
  if (!id || !start) return null;
  const end = dateValue(value.end) ?? undefined;
  const title = typeof value.summary === 'string' && value.summary.trim()
    ? value.summary.trim()
    : typeof value.title === 'string' && value.title.trim()
      ? value.title.trim()
      : 'Untitled meeting';
  const description = typeof value.description === 'string' && value.description.trim() ? value.description.trim() : undefined;
  const location = typeof value.location === 'string' && value.location.trim() ? value.location.trim() : undefined;
  return {
    id,
    title,
    description,
    location,
    start,
    end,
    allDay: isRecord(value.start) && typeof value.start.date === 'string',
  };
}

export async function GET(req: Request) {
  if (!hasComposioKey()) {
    return NextResponse.json({ error: 'COMPOSIO_API_KEY is not configured.', code: 'missing_composio_key' }, { status: 500 });
  }
  const client = readClientSession(req);
  if (!client) return NextResponse.json({ error: 'A client invite is required.', code: 'client_session_required' }, { status: 401 });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const accountsResponse = await composioFetch(`/v3.1/connected_accounts?user_ids[]=${encodeURIComponent(client.clientId)}&limit=1000`);
  if (!accountsResponse.ok) return NextResponse.json({ error: 'Could not load connected calendar accounts.' }, { status: 502 });
  const connectedAccountId = connectedCalendarId(await accountsResponse.json());
  if (!connectedAccountId) return NextResponse.json({ connected: false, meetings: [] });

  const eventsResponse = await composioFetch(`/v3.1/tools/execute/${CALENDAR_LIST_TOOL}`, {
    method: 'POST',
    body: JSON.stringify({
      connected_account_id: connectedAccountId,
      user_id: client.clientId,
      arguments: {
        calendar_id: 'primary',
        time_min: monthStart.toISOString(),
        time_max: monthEnd.toISOString(),
      },
    }),
  });
  if (!eventsResponse.ok) return NextResponse.json({ error: 'Could not load meetings from Google Calendar.' }, { status: 502 });
  const meetings = recordsFrom(await eventsResponse.json(), ['items', 'events', 'data'])
    .map(normalizeMeeting)
    .filter((meeting): meeting is Meeting => meeting !== null);

  return NextResponse.json({
    connected: true,
    month: monthStart.toISOString().slice(0, 7),
    meetings,
  });
}

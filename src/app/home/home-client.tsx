'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Inbox, MapPin, MessageSquare, Users } from 'lucide-react';
import { SidebarToggle } from '@/components/app-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Account, Conversation } from '@/lib/types';

function BookingMark() {
  return <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><CalendarDays className="size-5" /></div>;
}

function initials(name?: string | null) {
  return (name ?? '?').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

type Meeting = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end?: string;
  allDay: boolean;
};

function dayKey(date: Date) {
  return [date.getFullYear(), `${date.getMonth() + 1}`.padStart(2, '0'), `${date.getDate()}`.padStart(2, '0')].join('-');
}

function meetingDayKey(value: string) {
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dayKey(date);
}

function meetingTime(meeting: Meeting) {
  if (meeting.allDay) return 'All day';
  const start = formatTime(meeting.start);
  const end = meeting.end ? formatTime(meeting.end) : '';
  return end ? `${start} – ${end}` : start;
}

function MeetingsCalendar() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = Array.from({ length: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() }, (_, index) => new Date(now.getFullYear(), now.getMonth(), index + 1));

  useEffect(() => {
    fetch('/api/meetings')
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? 'Could not load meetings.');
        setConnected(payload.connected === true);
        setMeetings(payload.meetings ?? []);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <article className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold tracking-tight">Meetings</h2>
          <p className="mt-1 text-sm text-muted-foreground">{monthStart.toLocaleDateString([], { month: 'long', year: 'numeric' })}</p>
        </div>
        <CalendarDays className="size-5 text-primary" />
      </div>
      {error && <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {loading && <p className="mt-6 text-sm text-muted-foreground">Loading meetings…</p>}
      {!loading && !error && !connected && <div className="mt-6"><p className="text-sm text-muted-foreground">Connect Google Calendar to see booked meetings.</p><Button asChild variant="outline" className="mt-4 w-full bg-background"><Link href="/apps">Connect Google Calendar</Link></Button></div>}
      {!loading && !error && connected && <div className="mt-5 -mx-1 flex w-[calc(100%+0.5rem)] gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory">{days.map((date) => { const dateMeetings = meetings.filter((meeting) => meetingDayKey(meeting.start) === dayKey(date)); return <div key={dayKey(date)} className="min-w-64 snap-start rounded-lg border border-[var(--chat-border)] bg-background p-3"><div className="flex items-baseline justify-between border-b border-[var(--chat-border)] pb-3"><div><p className="text-xs font-medium uppercase text-muted-foreground">{date.toLocaleDateString([], { weekday: 'short' })}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{date.getDate()}</p></div><span className="text-xs text-muted-foreground">{dateMeetings.length} {dateMeetings.length === 1 ? 'meeting' : 'meetings'}</span></div>{dateMeetings.length === 0 ? <p className="py-5 text-sm text-muted-foreground">No meetings</p> : <div className="space-y-2 pt-3">{dateMeetings.map((meeting) => <div key={meeting.id} className="rounded-lg border border-[var(--chat-border)] bg-card p-3"><p className="text-xs font-medium text-primary">{meetingTime(meeting)}</p><p className="mt-1 text-sm font-semibold leading-5">{meeting.title}</p>{meeting.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{meeting.description}</p>}{meeting.location && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" />{meeting.location}</p>}</div>)}</div>}</div>; })}</div>}
    </article>
  );
}

export default function BookingHomePage({ clientName }: { clientName: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Could not load connected accounts.'); return body; }),
      fetch('/api/conversations?sortOrder=desc&limit=100').then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Could not load conversations.'); return body; }),
    ]).then(([accountData, conversationData]) => {
      setAccounts(accountData.accounts ?? []);
      setConversations(conversationData.conversations ?? []);
    }).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  const unreadCount = useMemo(() => conversations.reduce((total, conversation) => total + (conversation.unreadCount ?? 0), 0), [conversations]);
  const activeAccounts = accounts.filter((account) => account.isActive !== false && account.enabled !== false);

  return (
    <main className="h-dvh overflow-y-auto bg-[var(--chat-canvas)] text-foreground">
      <header className="sticky top-0 z-10 border-b border-[var(--chat-border)] bg-background/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8"><SidebarToggle /><Link href="/home" className="flex items-center gap-2.5" aria-label="Booking home"><BookingMark /><span className="text-base font-semibold tracking-tight">Bookly</span></Link><nav className="ml-5 hidden items-center gap-1 md:flex"><Link href="/home" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">Overview</Link><Link href="/apps" className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">Apps</Link><Link href="/inbox" className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">Messages</Link></nav><div className="ml-auto flex items-center gap-2"><ThemeToggle /></div></div></header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-primary">Live overview</p><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Good morning, {clientName}</h1><p className="mt-2 text-muted-foreground">Your connected channels and conversations, updated automatically.</p></div><Button asChild variant="outline" className="w-full bg-background sm:w-auto"><Link href="/inbox"><MessageSquare />Open inbox</Link></Button></section>


        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><article className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm"><div className="flex items-start justify-between"><span className="text-sm text-muted-foreground">Connected channels</span><Users className="size-4 text-primary" /></div><p className="mt-4 text-3xl font-semibold tracking-tight">{loading ? '—' : activeAccounts.length}</p><p className="mt-1 text-sm text-muted-foreground">Accounts available to Bookly</p></article><article className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm"><div className="flex items-start justify-between"><span className="text-sm text-muted-foreground">Conversations</span><Inbox className="size-4 text-primary" /></div><p className="mt-4 text-3xl font-semibold tracking-tight">{loading ? '—' : conversations.length}</p><p className="mt-1 text-sm text-muted-foreground">Across connected channels</p></article><article className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm"><div className="flex items-start justify-between"><span className="text-sm text-muted-foreground">Unread messages</span><MessageSquare className="size-4 text-primary" /></div><p className="mt-4 text-3xl font-semibold tracking-tight">{loading ? '—' : unreadCount}</p><p className="mt-1 text-sm text-muted-foreground">Across connected channels</p></article><article className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm"><div className="flex items-start justify-between"><span className="text-sm text-muted-foreground">Bot status</span><CheckCircle2 className="size-4 text-primary" /></div><p className="mt-4 text-xl font-semibold tracking-tight">{process.env.NEXT_PUBLIC_BOT_ENABLED === 'true' ? 'Active' : 'Configured'}</p><p className="mt-1 text-sm text-muted-foreground">NVIDIA meeting assistant</p></article></section>

        <section id="schedule" className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]"><article className="rounded-xl border border-[var(--chat-border)] bg-card shadow-sm"><div className="flex items-center justify-between border-b border-[var(--chat-border)] p-5"><div><h2 className="font-semibold tracking-tight">Recent conversations</h2><p className="mt-1 text-sm text-muted-foreground">Recent activity across your channels</p></div><Button asChild variant="ghost" size="sm"><Link href="/inbox">View inbox</Link></Button></div>{!loading && conversations.length === 0 ? <div className="p-10 text-center"><Inbox className="mx-auto size-8 text-muted-foreground/50" /><p className="mt-3 text-sm font-medium">No conversations returned</p><p className="mt-1 text-sm text-muted-foreground">Connect a channel to start receiving customer messages.</p></div> : <div className="divide-y divide-[var(--chat-border)]">{conversations.slice(0, 6).map((conversation) => <Link href={`/inbox?conversation=${conversation.accountId}:${conversation.id}`} key={`${conversation.accountId}:${conversation.id}`} className="flex items-center gap-4 p-5 transition-colors hover:bg-[var(--chat-hover)]"><Avatar className="size-10"><AvatarFallback>{initials(conversation.participantName ?? conversation.participantUsername)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{conversation.participantName ?? conversation.participantUsername ?? 'Unknown contact'}</p><p className="mt-0.5 truncate text-sm text-muted-foreground">{conversation.lastMessage}</p></div><div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">{conversation.unreadCount ? <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">{conversation.unreadCount}</span> : null}<time>{formatTime(conversation.updatedTime)}</time></div></Link>)}</div>}</article>

          <MeetingsCalendar /></section>
      </div>
    </main>
  );
}

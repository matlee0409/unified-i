'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Users,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const appointments = [
  { name: 'Ava Thompson', service: 'Consultation', time: '09:00', initials: 'AT', tone: 'bg-primary/15 text-primary' },
  { name: 'Michael Chen', service: 'Premium session', time: '10:30', initials: 'MC', tone: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  { name: 'Sofia Rodriguez', service: 'Follow-up', time: '13:00', initials: 'SR', tone: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
  { name: 'Jordan Williams', service: 'Consultation', time: '15:30', initials: 'JW', tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
];

const activity = [
  { title: 'New booking from Olivia Martin', detail: 'Premium session · Tomorrow at 11:00', time: '8 min ago', initials: 'OM', tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  { title: 'Noah Williams rescheduled', detail: 'Moved to Friday at 14:30', time: '42 min ago', initials: 'NW', tone: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  { title: 'Reminder sent to Ethan Lee', detail: 'Consultation · Today at 15:30', time: '1 hr ago', initials: 'EL', tone: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
];

function BookingMark() {
  return (
    <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
      <CalendarDays className="size-5" />
    </div>
  );
}

export default function BookingHomePage() {
  return (
    <main className="min-h-dvh overflow-y-auto bg-[var(--chat-canvas)] text-foreground">
      <header className="sticky top-0 z-10 border-b border-[var(--chat-border)] bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/home" className="flex items-center gap-2.5" aria-label="Booking home">
            <BookingMark />
            <span className="text-base font-semibold tracking-tight">Bookly</span>
          </Link>
          <nav className="ml-5 hidden items-center gap-1 md:flex">
            <Link href="/home" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">Overview</Link>
            <a href="#schedule" className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">Schedule</a>
            <Link href="/" className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">Messages</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild className="hidden sm:inline-flex">
              <a href="#schedule"><Plus />New booking</a>
            </Button>
            <Button asChild size="icon" className="sm:hidden" aria-label="Create booking">
              <a href="#schedule"><Plus /></a>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Tuesday, 24 June</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Good morning, Lee-Roy</h1>
            <p className="mt-2 text-muted-foreground">Here&apos;s how your day is shaping up.</p>
          </div>
          <Button asChild variant="outline" className="w-full bg-background sm:w-auto">
            <Link href="/"><MessageSquare />Open inbox</Link>
          </Button>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between"><span className="text-sm text-muted-foreground">Today&apos;s bookings</span><CalendarDays className="size-4 text-primary" /></div>
            <p className="mt-4 text-3xl font-semibold tracking-tight">8</p>
            <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">+2 from last Tuesday</p>
          </article>
          <article className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between"><span className="text-sm text-muted-foreground">This week</span><Clock3 className="size-4 text-primary" /></div>
            <p className="mt-4 text-3xl font-semibold tracking-tight">34</p>
            <p className="mt-1 text-sm text-muted-foreground">6 awaiting confirmation</p>
          </article>
          <article className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between"><span className="text-sm text-muted-foreground">New clients</span><Users className="size-4 text-primary" /></div>
            <p className="mt-4 text-3xl font-semibold tracking-tight">12</p>
            <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">+18% this month</p>
          </article>
          <article className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between"><span className="text-sm text-muted-foreground">Booking rate</span><ArrowRight className="size-4 text-primary" /></div>
            <p className="mt-4 text-3xl font-semibold tracking-tight">74%</p>
            <p className="mt-1 text-sm text-muted-foreground">Of inquiries converted</p>
          </article>
        </section>

        <section id="schedule" className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
          <article className="rounded-xl border border-[var(--chat-border)] bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--chat-border)] p-5">
              <div><h2 className="font-semibold tracking-tight">Today&apos;s schedule</h2><p className="mt-1 text-sm text-muted-foreground">4 upcoming appointments</p></div>
              <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
                <Button variant="ghost" size="icon" className="size-7" aria-label="Previous day"><ChevronLeft className="size-4" /></Button>
                <span className="px-2 text-sm font-medium">Today</span>
                <Button variant="ghost" size="icon" className="size-7" aria-label="Next day"><ChevronRight className="size-4" /></Button>
              </div>
            </div>
            <div className="divide-y divide-[var(--chat-border)]">
              {appointments.map((appointment) => (
                <div key={appointment.time} className="flex items-center gap-4 p-5 transition-colors hover:bg-[var(--chat-hover)]">
                  <time className="w-10 text-sm font-medium tabular-nums text-muted-foreground">{appointment.time}</time>
                  <div className="h-11 w-0.5 rounded-full bg-primary/60" />
                  <Avatar className="size-10"><AvatarFallback className={appointment.tone}>{appointment.initials}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{appointment.name}</p><p className="mt-0.5 text-sm text-muted-foreground">{appointment.service}</p></div>
                  <Badge variant="secondary" className="hidden sm:inline-flex">Confirmed</Badge>
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`More options for ${appointment.name}`}><MoreHorizontal className="size-4" /></Button>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--chat-border)] p-3 text-center"><button className="rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-accent">View full calendar</button></div>
          </article>

          <div className="space-y-6">
            <article className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between"><div><h2 className="font-semibold tracking-tight">Booking link</h2><p className="mt-1 text-sm text-muted-foreground">Share your availability with clients.</p></div><CalendarDays className="size-5 text-primary" /></div>
              <div className="mt-4 flex items-center gap-2 rounded-lg border bg-muted/50 p-2 pl-3"><span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">bookly.app/lee-roy</span><Button size="sm" variant="secondary">Copy</Button></div>
            </article>

            <article className="rounded-xl border border-[var(--chat-border)] bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--chat-border)] p-5"><div><h2 className="font-semibold tracking-tight">Recent activity</h2><p className="mt-1 text-sm text-muted-foreground">Updates from your bookings</p></div><Button variant="ghost" size="sm">View all</Button></div>
              <div className="divide-y divide-[var(--chat-border)]">
                {activity.map((item) => (<div key={item.title} className="flex gap-3 p-4"><Avatar className="size-9"><AvatarFallback className={item.tone}>{item.initials}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.title}</p><p className="mt-0.5 truncate text-sm text-muted-foreground">{item.detail}</p></div><time className="whitespace-nowrap text-xs text-muted-foreground">{item.time}</time></div>))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

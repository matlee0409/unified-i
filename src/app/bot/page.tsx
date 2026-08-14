'use client';

import { useState } from 'react';
import { Bot, CalendarCheck2, Check, ChevronDown, Clock3, Info, MessageSquareText, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const tools = [
  { name: 'Check availability', description: 'Find open times in your booking calendar.', icon: Clock3 },
  { name: 'Schedule meeting', description: 'Create a confirmed booking after approval.', icon: CalendarCheck2 },
  { name: 'Reschedule or cancel', description: 'Update an existing booking securely.', icon: SlidersHorizontal },
];

export default function BotPage() {
  const [toolChoice, setToolChoice] = useState('auto');
  const [temperature, setTemperature] = useState('0.2');
  const [saved, setSaved] = useState(false);

  const saveConfiguration = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <main className="h-dvh overflow-y-auto overscroll-contain touch-pan-y bg-[var(--chat-canvas)] text-foreground">
      <header className="sticky top-0 z-10 border-b border-[var(--chat-border)] bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div><p className="text-sm text-muted-foreground">Automation</p><h1 className="text-lg font-semibold tracking-tight">Meeting bot</h1></div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mt-8 space-y-6">
          <section className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-muted"><Bot className="size-4" /></div><div><h2 className="font-semibold tracking-tight">NVIDIA model</h2><p className="mt-1 text-sm text-muted-foreground">Choose the model and response behavior for your assistant.</p></div></div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="model">Served model</Label><div className="relative"><select id="model" className="h-9 w-full appearance-none rounded-md border bg-background px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"><option>minimaxai/minimax-m3</option><option>z-ai/glm-5.2</option><option>nvidia/nemotron-3.5-lightning-30b-a3b</option></select><ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" /></div><p className="text-xs text-muted-foreground">NVIDIA NIM served model name.</p></div>
              <div className="space-y-2"><div className="flex justify-between"><Label htmlFor="temperature">Temperature</Label><span className="text-sm tabular-nums text-muted-foreground">{temperature}</span></div><input id="temperature" type="range" min="0" max="1" step="0.1" value={temperature} onChange={(event) => setTemperature(event.target.value)} className="w-full accent-[var(--primary)]" /><p className="text-xs text-muted-foreground">Lower values keep booking replies consistent.</p></div>
              <div className="space-y-2"><Label htmlFor="tokens">Maximum output tokens</Label><Input id="tokens" type="number" defaultValue="500" min="100" max="4096" /><p className="text-xs text-muted-foreground">Enough room for a clear, concise response.</p></div>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-muted"><CalendarCheck2 className="size-4" /></div><div><h2 className="font-semibold tracking-tight">Meeting tools</h2><p className="mt-1 text-sm text-muted-foreground">NIM function calling lets the assistant take booking actions.</p></div></div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><Label htmlFor="tool-choice">Tool selection</Label><p className="mt-1 text-xs text-muted-foreground">Choose when the assistant can call calendar tools.</p></div><select id="tool-choice" value={toolChoice} onChange={(event) => setToolChoice(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option value="auto">Automatic</option><option value="none">Disabled</option></select></div>
            <div className="mt-5 divide-y rounded-lg border">{tools.map(({ name, description, icon: Icon }) => <div key={name} className="flex items-center gap-3 p-4"><div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{name}</p><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div><Check className="size-4 text-emerald-500" /></div>)}</div>
          </section>

          <section className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-muted"><Clock3 className="size-4" /></div><div><h2 className="font-semibold tracking-tight">Booking rules</h2><p className="mt-1 text-sm text-muted-foreground">Set the details the assistant uses when offering times.</p></div></div>
            <div className="mt-6 max-w-sm"><div className="space-y-2"><Label htmlFor="timezone">Timezone</Label><select id="timezone" className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option>Auto-detect</option><option>UTC</option><option>America/New_York</option><option>Europe/London</option></select></div></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="flex items-start gap-3 rounded-lg border p-4"><input type="checkbox" defaultChecked className="mt-0.5 size-4 accent-[var(--primary)]" /><span><span className="block text-sm font-medium">Ask for confirmation</span><span className="mt-1 block text-xs text-muted-foreground">Confirm the time before creating a booking.</span></span></label><label className="flex items-start gap-3 rounded-lg border p-4"><input type="checkbox" defaultChecked className="mt-0.5 size-4 accent-[var(--primary)]" /><span><span className="block text-sm font-medium">Send reminders</span><span className="mt-1 block text-xs text-muted-foreground">Use your connected channel to send reminders.</span></span></label></div>
          </section>

          <section className="grid gap-6 sm:grid-cols-2"><div className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm"><div className="flex items-center gap-3"><MessageSquareText className="size-5 text-primary" /><h2 className="font-semibold">Bot tone</h2></div><label className="mt-4 block space-y-2"><Label htmlFor="bot-tone">Tone</Label><textarea id="bot-tone" className="min-h-20 w-full resize-y rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" defaultValue="Friendly, concise, and confirmation-focused." /></label><label className="mt-4 block space-y-2"><Label htmlFor="bot-system-prompt">Bot system prompt</Label><textarea id="bot-system-prompt" className="min-h-24 w-full resize-y rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" defaultValue="You are a friendly scheduling assistant for Bookly. Be concise, confirm details, and never invent availability." /></label></div><div className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm"><div className="flex items-center gap-3"><ShieldCheck className="size-5 text-primary" /><h2 className="font-semibold">Safety & handoff</h2></div><label className="mt-4 flex items-start gap-3"><input type="checkbox" defaultChecked className="mt-0.5 size-4 accent-[var(--primary)]" /><span><span className="block text-sm font-medium">Escalate when needed</span><span className="mt-1 block text-xs text-muted-foreground">Hand off to a human for sensitive requests or uncertain intent.</span></span></label><div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />The assistant only books times returned by your connected calendar.</div></div></section>

          <div className="flex items-center justify-between rounded-xl border border-[var(--chat-border)] bg-card p-4 shadow-sm"><div className="flex items-center gap-3"><Users className="size-4 text-muted-foreground" /><p className="text-sm text-muted-foreground">Bot settings apply to new conversations across your connected channels.</p></div><Button onClick={saveConfiguration}>{saved ? 'Saved' : 'Save changes'}</Button></div>
        </div>
      </div>
    </main>
  );
}

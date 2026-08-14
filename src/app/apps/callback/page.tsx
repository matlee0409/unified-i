import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppsCallbackPage() {
  return <main className="flex min-h-dvh items-center justify-center bg-[var(--chat-canvas)] p-6"><section className="w-full max-w-md rounded-2xl border border-[var(--chat-border)] bg-card p-8 text-center shadow-sm"><CheckCircle2 className="mx-auto size-10 text-emerald-500" /><h1 className="mt-5 text-xl font-semibold tracking-tight">App connected</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Your Composio app connection is complete and ready for the meeting bot.</p><Button asChild className="mt-6"><Link href="/apps">Back to Apps</Link></Button></section></main>;
}

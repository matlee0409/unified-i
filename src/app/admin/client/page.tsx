'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Link2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function inviteTokenFromValue(value: string) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    return url.searchParams.get('token') ?? '';
  } catch {
    return trimmed;
  }
}

export default function ClientSignInPage() {
  const [invite, setInvite] = useState('');
  const [error, setError] = useState('');

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = inviteTokenFromValue(invite);
    if (!token) {
      setError('Paste the private invite link you received.');
      return;
    }
    setError('');
    window.location.assign(`/api/client/invite/accept?token=${encodeURIComponent(token)}&redirect=/channels`);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--chat-canvas)] p-6 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-[var(--chat-border)] bg-card p-6 shadow-sm sm:p-8">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Link2 className="size-5" /></div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Sign in to Bookly</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Use the private invite link from your business administrator to access your connected channels.</p>
        <form onSubmit={signIn} className="mt-6 space-y-4">
          <label className="block space-y-2"><span className="text-sm font-medium">Client invite link</span><Input value={invite} onChange={(event) => setInvite(event.target.value)} placeholder="Paste your invite link" autoComplete="off" /></label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">Continue securely</Button>
        </form>
        <div className="mt-6 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />You do not need a Zernio account. Your invite opens only your company workspace.</div>
        <Link href="/admin/clients" className="mt-5 block text-center text-sm font-medium text-primary hover:underline">Administrator: generate a client invite</Link>
      </section>
    </main>
  );
}

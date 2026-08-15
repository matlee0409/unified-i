'use client';

import { useState } from 'react';
import { Copy, Link2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ClientAdminPage() {
  const [clientName, setClientName] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function createInvite() {
    setError('');
    setInviteUrl('');
    const response = await fetch('/api/client/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bookly-admin-secret': adminSecret },
      body: JSON.stringify({ clientName }),
    });
    const payload = await response.json().catch(() => ({})) as { inviteUrl?: unknown; error?: unknown };
    if (!response.ok || typeof payload.inviteUrl !== 'string') {
      setError(typeof payload.error === 'string' ? payload.error : 'Could not create the client invite.');
      return;
    }
    setInviteUrl(payload.inviteUrl);
  }

  async function copyInvite() {
    await navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="min-h-dvh bg-[var(--chat-canvas)] p-6 text-foreground sm:p-10">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Link2 className="size-4" /></div>
          <div><h1 className="text-xl font-semibold tracking-tight">Client invites</h1><p className="text-sm text-muted-foreground">Create a private link for a client to connect their channels.</p></div>
        </div>

        <section className="mt-8 rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm sm:p-6">
          <div className="space-y-4">
            <label className="block space-y-2"><span className="text-sm font-medium">Client name</span><Input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Acme Dental" /></label>
            <label className="block space-y-2"><span className="text-sm font-medium">Admin secret</span><Input type="password" value={adminSecret} onChange={(event) => setAdminSecret(event.target.value)} placeholder="BOOKLY_ADMIN_SECRET" /></label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={() => void createInvite()} disabled={!clientName.trim() || !adminSecret}><Plus />Create invite link</Button>
          </div>
        </section>

        {inviteUrl && <section className="mt-6 rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm sm:p-6"><p className="text-sm font-medium">Share this link with {clientName.trim()}</p><div className="mt-3 flex items-center gap-2"><Input readOnly value={inviteUrl} className="min-w-0" /><Button type="button" variant="secondary" onClick={() => void copyInvite()}>{copied ? 'Copied' : <><Copy />Copy</>}</Button></div><p className="mt-2 text-xs text-muted-foreground">The client can use this link without a Zernio account.</p></section>}
      </div>
    </main>
  );
}

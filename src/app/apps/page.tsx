'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppWindow, Check, Loader2, Plug, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Toolkit = { slug?: string; name?: string; description?: string; logo?: string; image?: string };
type AuthConfig = { id?: string; uuid?: string; toolkit?: { slug?: string } | string; auth_scheme?: string; status?: string };

function toolkitSlug(config: AuthConfig) {
  return typeof config.toolkit === 'string' ? config.toolkit : config.toolkit?.slug;
}

export default function AppsPage() {
  const [toolkits, setToolkits] = useState<Toolkit[]>([]);
  const [authConfigs, setAuthConfigs] = useState<AuthConfig[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState('');

  useEffect(() => {
    fetch('/api/apps')
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? 'Could not load Composio apps.');
        setToolkits(payload.toolkits ?? []);
        setAuthConfigs(payload.authConfigs ?? []);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const visibleToolkits = useMemo(() => toolkits.filter((toolkit) => {
    const text = `${toolkit.name ?? ''} ${toolkit.slug ?? ''} ${toolkit.description ?? ''}`.toLowerCase();
    return text.includes(query.toLowerCase());
  }), [toolkits, query]);

  async function connect(toolkit: Toolkit) {
    const slug = toolkit.slug ?? '';
    const config = authConfigs.find((item) => toolkitSlug(item) === slug && item.status !== 'DISABLED' && item.auth_scheme?.toUpperCase().includes('OAUTH'));
    if (!config?.id && !config?.uuid) {
      setError(`No enabled OAuth configuration is available for ${toolkit.name ?? slug}. Add one in Composio first.`);
      return;
    }
    setConnecting(slug);
    const response = await fetch('/api/apps/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authConfigId: config.id ?? config.uuid, toolkit: slug, userId: 'bookly-user' }) });
    const payload = await response.json();
    if (response.ok && payload.redirectUrl) window.location.assign(payload.redirectUrl);
    else { setError(payload.error ?? `Could not connect ${toolkit.name ?? slug}.`); setConnecting(''); }
  }

  return (
    <main className="h-dvh overflow-y-auto overscroll-contain bg-[var(--chat-canvas)] text-foreground">
      <header className="sticky top-0 z-10 border-b border-[var(--chat-border)] bg-background/95 backdrop-blur"><div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"><div><h1 className="text-lg font-semibold tracking-tight">Apps</h1><p className="hidden text-sm text-muted-foreground sm:block">Connect your calendar and favorite tools.</p></div></div></header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold tracking-tight">Configured apps</h2><p className="mt-1 text-sm text-muted-foreground">Apps enabled in your Composio auth configurations.</p></div><div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search apps" className="pl-9" /></div></div>
        {error && <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
        {loading ? <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div> : visibleToolkits.length === 0 && !error ? <div className="mt-6 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No apps match your search.</div> : <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleToolkits.map((toolkit) => { const slug = toolkit.slug ?? ''; const logo = toolkit.logo ?? toolkit.image; return <article key={slug} className="flex min-h-48 flex-col rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-muted">{logo ? <img src={logo} alt="" className="size-7 object-contain" /> : <AppWindow className="size-5 text-muted-foreground" />}</div><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Check className="size-3.5 text-emerald-500" />Composio</span></div><h3 className="mt-5 font-semibold">{toolkit.name ?? slug}</h3><p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">{toolkit.description ?? `Use ${toolkit.name ?? slug} with your meeting assistant.`}</p><Button className="mt-5 w-full" onClick={() => void connect(toolkit)} disabled={connecting === slug}>{connecting === slug ? <Loader2 className="animate-spin" /> : <Plug />}Connect</Button></article>; })}</section>}
      </div>
    </main>
  );
}

import Link from 'next/link';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function ChannelCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const connected = typeof params.connected === 'string' || typeof params.platform === 'string';
  const error = typeof params.error === 'string' ? params.error : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--chat-canvas)] p-6">
      <section className="w-full max-w-md rounded-2xl border border-[var(--chat-border)] bg-card p-8 text-center shadow-sm">
        {connected && !error ? <CheckCircle2 className="mx-auto size-10 text-emerald-500" /> : <CircleAlert className="mx-auto size-10 text-primary" />}
        <h1 className="mt-5 text-xl font-semibold tracking-tight">{connected && !error ? 'Channel connected' : 'Connection update'}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {connected && !error ? 'Your channel was connected successfully. It will appear in your inbox shortly.' : error ?? 'The connection was not completed. Return to Channels and try again.'}
        </p>
        <div className="mt-6 flex justify-center gap-2"><Button asChild><Link href="/channels">Back to Channels</Link></Button><Button asChild variant="outline"><Link href="/inbox">Open inbox</Link></Button></div>
      </section>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PlatformIcon, PLATFORM_LABELS } from '@/components/platform-icon';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/hooks/useAccounts';
import { MESSAGE_PLATFORMS } from '@/lib/capabilities';
import type { Platform } from '@/lib/types';

const channelDescriptions: Record<Platform, string> = {
  whatsapp: 'Connect your WhatsApp Business account and manage customer conversations.',
  instagram: 'Reply to Instagram direct messages and keep your community engaged.',
  facebook: 'Bring Messenger conversations into one shared inbox.',
  twitter: 'Manage X direct messages alongside your other channels.',
  telegram: 'Connect Telegram to respond to customers wherever they reach you.',
  bluesky: 'Keep up with Bluesky messages from your unified inbox.',
  reddit: 'Respond to Reddit conversations without switching between apps.',
};

export default function ChannelsPage() {
  const { accounts } = useAccounts();
  const connectedPlatforms = new Set(accounts.map((account) => account.platform));

  return (
    <main className="h-dvh overflow-y-auto overscroll-contain bg-[var(--chat-canvas)] text-foreground">
      <header className="border-b border-[var(--chat-border)] bg-background">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Channels</h1>
            <p className="hidden text-sm text-muted-foreground sm:block">Connect the channels your customers use.</p>
          </div>
          <Button asChild>
            <a href="https://zernio.com" target="_blank" rel="noreferrer"><Plus />Add channels</a>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mt-10 flex items-end justify-between gap-4">
          <div><h2 className="text-xl font-semibold tracking-tight">Available channels</h2><p className="mt-1 text-sm text-muted-foreground">All channels supported by your connected services.</p></div>
          <span className="text-sm text-muted-foreground">{MESSAGE_PLATFORMS.length} channels</span>
        </div>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
          {MESSAGE_PLATFORMS.map((platform) => (
            <article key={platform} className="flex min-h-44 flex-col rounded-xl border border-[var(--chat-border)] bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-muted"><PlatformIcon platform={platform} className="size-5" /></div>
              </div>
              <h3 className="mt-3 text-sm font-semibold">{PLATFORM_LABELS[platform]}</h3>
              <p className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">{channelDescriptions[platform]}</p>
              <Button asChild variant="outline" className="mt-3 w-full bg-background"><a href={`/api/connect/${platform}`}>{connectedPlatforms.has(platform) ? 'Connected' : 'Connect'}</a></Button>
            </article>
          ))}
        </section>

        <p className="mt-8 text-center text-sm text-muted-foreground">Already connected a channel? <Link href="/inbox" className="font-medium text-primary hover:underline">Open your inbox</Link> to start a conversation.</p>
      </div>
    </main>
  );
}

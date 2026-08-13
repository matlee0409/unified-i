'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Inbox, LayoutDashboard, Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const navigation = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Inbox', href: '/inbox', icon: Inbox },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--chat-border)] bg-background md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-[var(--chat-border)] px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CalendarDays className="size-4" />
        </div>
        <span className="font-semibold tracking-tight">Bookly</span>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
        {navigation.map(({ label, href, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' || pathname === '/home' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--chat-border)] p-3">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <Settings className="size-4" />
          Settings
        </Link>
        <div className="mt-2 flex items-center justify-between rounded-lg px-3 py-1">
          <span className="text-xs text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

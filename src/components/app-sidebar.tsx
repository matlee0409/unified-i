'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppWindow, BookOpen, Bot, CalendarDays, Inbox, LayoutDashboard, Link2, Menu, PanelLeftClose, Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSidebar } from '@/components/sidebar-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigation = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Inbox', href: '/inbox', icon: Inbox },
  { label: 'Channels', href: '/channels', icon: Link2 },
  { label: 'Meeting bot', href: '/bot', icon: Bot },
  { label: 'Knowledge base', href: '/knowledge-base', icon: BookOpen },
  { label: 'Apps', href: '/apps', icon: AppWindow },
];

export function SidebarToggle() {
  const { open, toggle } = useSidebar();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={open ? 'Close sidebar' : 'Open sidebar'}>
      {open ? <PanelLeftClose /> : <Menu />}
    </Button>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { open, close } = useSidebar();

  return (
    <>
      {open && <button className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={close} aria-label="Close sidebar" />}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 flex w-60 shrink-0 flex-col border-r border-[var(--chat-border)] bg-background transition-transform duration-200 md:static md:translate-x-0 md:transition-[width] md:duration-200',
        open ? 'translate-x-0 md:w-60' : '-translate-x-full md:w-0 md:overflow-hidden md:border-r-0',
      )}>
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[var(--chat-border)] px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><CalendarDays className="size-4" /></div>
          <span className="font-semibold tracking-tight">Bookly</span>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
          {navigation.map(({ label, href, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' || pathname === '/home' : pathname.startsWith(href);
            return <Link key={href} href={href} onClick={close} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')}><Icon className="size-4" />{label}</Link>;
          })}
        </nav>

        <div className="border-t border-[var(--chat-border)] p-3">
          <Link href="/settings" onClick={close} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', pathname.startsWith('/settings') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')}><Settings className="size-4" />Settings</Link>
          <div className="mt-2 flex items-center justify-between rounded-lg px-3 py-1"><span className="text-xs text-muted-foreground">Appearance</span><ThemeToggle /></div>
        </div>
      </aside>
    </>
  );
}

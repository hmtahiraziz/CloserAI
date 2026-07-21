'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  PhoneCall,
  Calendar,
  BarChart3,
  Settings,
  FlaskConical,
  LogOut,
  CircleHelp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { startProductTour } from '@/components/product-tour';

const links = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, tourId: 'nav-overview' },
  { href: '/leads', label: 'Leads', icon: Users, tourId: 'nav-leads' },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone, tourId: 'nav-campaigns' },
  { href: '/calls', label: 'Calls', icon: PhoneCall, tourId: 'nav-calls' },
  { href: '/appointments', label: 'Appointments', icon: Calendar, tourId: 'nav-appointments' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, tourId: 'nav-analytics' },
  { href: '/settings', label: 'Settings', icon: Settings, tourId: 'nav-settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    toast.success('Signed out');
    router.push('/login');
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-white/80 backdrop-blur">
      <div className="border-b border-border px-5 py-5" data-tour="brand">
        <Link href="/dashboard" className="font-display text-xl tracking-tight text-primary">
          CloserAI
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">Sales call intelligence</p>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              data-tour={link.tourId}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition',
                active ? 'bg-primary/10 font-medium text-primary' : 'text-slate-600 hover:bg-muted',
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
        {demoMode ? (
          <Link
            href="/dev/demo"
            className={cn(
              'mt-2 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition',
              pathname.startsWith('/dev/demo')
                ? 'bg-amber-50 font-medium text-amber-800'
                : 'text-slate-600 hover:bg-muted',
            )}
          >
            <FlaskConical className="h-4 w-4" />
            Demo Lab
          </Link>
        ) : null}
      </nav>
      <div className="mt-auto shrink-0 border-t border-border p-3 space-y-1">
        <button
          type="button"
          data-tour="tour-replay"
          onClick={() => startProductTour({ force: true })}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-muted"
        >
          <CircleHelp className="h-4 w-4" />
          Take a tour
        </button>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

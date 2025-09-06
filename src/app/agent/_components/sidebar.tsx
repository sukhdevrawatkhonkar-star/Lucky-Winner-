
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Users,
  LayoutDashboard,
  Wallet,
  Ticket,
  Percent,
} from 'lucide-react';

const navItems = [
  { href: '/agent', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/agent/users', icon: Users, label: 'My Users' },
  { href: '/agent/bets', icon: Ticket, label: 'User Bets' },
  { href: '/agent/commission', icon: Percent, label: 'Commission' },
  { href: '/agent/wallet', icon: Wallet, label: 'My Wallet' },
];

export function AgentSidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/agent" className="flex items-center gap-2 font-semibold">
            <LayoutDashboard className="h-6 w-6" />
            <span>Agent Panel</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  pathname === href && 'bg-muted text-primary'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

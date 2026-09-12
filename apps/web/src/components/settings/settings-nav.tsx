'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/settings', label: 'Company Details', exact: true },
  { href: '/settings/team', label: 'Team', exact: false },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 rounded-lg border bg-muted/40 p-1">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

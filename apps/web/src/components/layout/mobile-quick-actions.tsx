'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FilePlus2, Receipt, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIONS = [
  {
    key: 'invoice',
    href: '/invoices/new',
    label: 'Invoice',
    short: '+ Invoice',
    icon: FilePlus2,
    activeMatch: (path: string) => path.startsWith('/invoices'),
    className: 'from-red-500 to-rose-600 shadow-red-500/30',
  },
  {
    key: 'expenses',
    href: '/expenses',
    label: 'Expenses',
    short: '+ Expenses',
    icon: Receipt,
    activeMatch: (path: string) => path.startsWith('/expenses'),
    className: 'from-orange-500 to-amber-600 shadow-orange-500/30',
  },
  {
    key: 'receipts',
    href: '/receipts',
    label: 'Receipts',
    short: '+ Receipts',
    icon: BadgeCheck,
    activeMatch: (path: string) => path.startsWith('/receipts'),
    className: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
  },
] as const;

/** Mobile-only squircle quick actions for Invoice / Expenses / Receipts. */
export function MobileQuickActions() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Quick actions"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden"
    >
      <div
        className="pointer-events-auto mx-auto flex max-w-lg items-end justify-center gap-4 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
        style={{
          background:
            'linear-gradient(to top, rgba(255,255,255,0.96) 55%, rgba(255,255,255,0))',
        }}
      >
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const active = action.activeMatch(pathname);
          return (
            <Link
              key={action.key}
              href={action.href}
              className={cn(
                'group flex flex-col items-center gap-1.5 focus:outline-none',
                active && 'scale-[1.02]',
              )}
            >
              <span
                className={cn(
                  'flex h-[58px] w-[58px] items-center justify-center bg-gradient-to-br text-white shadow-lg transition',
                  'active:scale-95',
                  action.className,
                  active && 'ring-2 ring-offset-2 ring-black/10',
                )}
                style={{ borderRadius: '28%' }}
              >
                <Icon className="h-6 w-6" strokeWidth={2.25} />
              </span>
              <span
                className={cn(
                  'text-[11px] font-semibold tracking-tight',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {action.short}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

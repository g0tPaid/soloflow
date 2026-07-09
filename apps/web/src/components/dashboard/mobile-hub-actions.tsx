'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  FilePlus2,
  FileText,
  Receipt,
  BadgeCheck,
  Users,
  Package,
  Settings,
  List,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const CREATE_ACTIONS = [
  {
    href: '/invoices/new',
    label: 'New Invoice',
    icon: FilePlus2,
    className: 'bg-red-500 hover:bg-red-600 text-white',
  },
  {
    href: '/expenses',
    label: 'Add Expense',
    icon: Receipt,
    className: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  {
    href: '/receipts',
    label: 'Receipts',
    icon: BadgeCheck,
    className: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  },
] as const;

const LIST_ACTIONS = [
  {
    href: '/invoices',
    label: 'All Invoices',
    description: 'View & edit invoices',
    icon: FileText,
    className: 'border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30',
    iconClassName: 'text-red-600',
  },
  {
    href: '/expenses',
    label: 'All Expenses',
    description: 'Costs per invoice',
    icon: Receipt,
    className: 'border-orange-200 bg-orange-50/80 dark:border-orange-900/50 dark:bg-orange-950/30',
    iconClassName: 'text-orange-600',
  },
  {
    href: '/receipts',
    label: 'All Receipts',
    description: 'Paid invoice receipts',
    icon: BadgeCheck,
    className: 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30',
    iconClassName: 'text-emerald-600',
  },
] as const;

const MORE_ACTIONS = [
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/settings', label: 'Company', icon: Settings },
] as const;

/** Primary navigation hub — especially for mobile where the sidebar is hidden. */
export function MobileHubActions() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground">Quick create</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {CREATE_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-xl px-2 py-4 text-center shadow-sm transition active:scale-95',
                  action.className,
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={2.25} />
                <span className="text-xs font-semibold leading-tight">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <List className="h-4 w-4" />
          View lists
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {LIST_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-4 shadow-sm transition active:scale-[0.98]',
                  action.className,
                )}
              >
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/80 dark:bg-background/80',
                    action.iconClassName,
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-sm font-semibold">{action.label}</span>
                  <span className="block text-xs text-muted-foreground">{action.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground">More</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {MORE_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 rounded-xl border bg-card px-2 py-4 text-center shadow-sm transition active:scale-95"
              >
                <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={2.25} />
                <span className="text-xs font-medium">{action.label}</span>
              </Link>
            );
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full gap-2 text-muted-foreground"
          onClick={() => void signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

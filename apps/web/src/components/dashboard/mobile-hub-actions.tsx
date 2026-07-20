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
  LogOut,
  BarChart3,
  Contact,
  FileSpreadsheet,
  Boxes,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const CREATE_ACTIONS = [
  {
    href: '/expenses/new',
    label: 'Add Expense',
    icon: Receipt,
    className: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  {
    href: '/invoices/new',
    label: 'New Invoice',
    icon: FilePlus2,
    className: 'bg-red-500 hover:bg-red-600 text-white',
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
    icon: FileText,
    className: 'bg-red-600 hover:bg-red-700 text-white',
  },
  {
    href: '/quotes/new',
    label: 'New Quote',
    icon: FileSpreadsheet,
    className: 'bg-violet-600 hover:bg-violet-700 text-white',
  },
  {
    href: '/receipts',
    label: 'All Receipts',
    icon: BadgeCheck,
    className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
] as const;

const NAV_ACTIONS = [
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/vendors', label: 'Vendors', icon: Contact },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/quotes', label: 'Quotes', icon: FileSpreadsheet },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Company', icon: Settings },
] as const;

/** Quick create + list boxes on the mobile home screen. */
export function MobileHubActions() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
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

      <div className="grid grid-cols-3 gap-3">
        {LIST_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={`list-${action.href}`}
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
  );
}

/** Navigation + sign out — shown at the bottom of the mobile home screen. */
export function MobileHubNav() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {NAV_ACTIONS.map((action) => {
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
        className="w-full gap-2 text-muted-foreground"
        onClick={() => void signOut({ callbackUrl: '/login' })}
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}

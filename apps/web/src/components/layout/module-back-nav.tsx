'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODULE_LABELS: Record<string, string> = {
  '/invoices': 'Invoices',
  '/quotes': 'Quotes',
  '/expenses': 'Expenses',
  '/receipts': 'Receipts',
  '/customers': 'Customers',
  '/products': 'Products',
  '/settings': 'Company',
};

function moduleLabel(pathname: string): string | null {
  if (pathname === '/dashboard') return null;
  const match = Object.keys(MODULE_LABELS).find((base) => pathname.startsWith(base));
  return match ? MODULE_LABELS[match] : 'Module';
}

export function ModuleBackLink({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const pathname = usePathname();
  const label = moduleLabel(pathname);

  if (!label) return null;

  return (
    <Link
      href="/dashboard"
      aria-label="Back to dashboard"
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm transition active:scale-[0.98]',
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      {showLabel ? <span>Dashboard</span> : null}
    </Link>
  );
}

/** Fixed bottom back bar for mobile module screens. */
export function MobileModuleBackBar() {
  const pathname = usePathname();
  if (pathname === '/dashboard') return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <div className="pointer-events-auto border-t border-border bg-background/95 px-4 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <ModuleBackLink className="w-full justify-center py-3" />
      </div>
    </div>
  );
}

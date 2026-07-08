import { cn } from '@/lib/utils';
import type { InvoiceStatus } from '@/lib/api';

const statusStyles: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SENT: 'bg-primary/10 text-primary',
  VIEWED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  PARTIAL: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  OVERDUE: 'bg-destructive/10 text-destructive',
  CANCELLED: 'bg-muted text-muted-foreground line-through',
  VOID: 'bg-muted text-muted-foreground line-through',
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        statusStyles[status],
      )}
    >
      {status.toLowerCase().replace('_', ' ')}
    </span>
  );
}

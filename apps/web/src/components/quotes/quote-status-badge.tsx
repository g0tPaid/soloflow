import { cn } from '@/lib/utils';
import type { QuoteStatus } from '@/lib/api';

const statusStyles: Record<QuoteStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SENT: 'bg-primary/10 text-primary',
  ACCEPTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  REJECTED: 'bg-destructive/10 text-destructive',
  EXPIRED: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  CANCELLED: 'bg-muted text-muted-foreground line-through',
  CONVERTED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
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

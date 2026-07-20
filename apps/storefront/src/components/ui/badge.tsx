import { cn } from '@/lib/utils';
import type { ProductBadge } from '@/lib/types';

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center border border-border bg-background px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProductBadges({ badges }: { badges: ProductBadge[] }) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <Badge key={badge}>{badge}</Badge>
      ))}
    </div>
  );
}

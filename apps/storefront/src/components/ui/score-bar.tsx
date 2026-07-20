import { cn } from '@/lib/utils';

export function ScoreBar({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums text-foreground">{value}</span>
      </div>
      <div className="score-track" aria-hidden>
        <div className="score-fill" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

export function BiflScorePanel({
  scores,
  overall,
}: {
  scores: {
    lifetime: number;
    repairability: number;
    materialQuality: number;
    manufacturerReputation: number;
    warranty: number;
  };
  overall: number;
}) {
  return (
    <div className="space-y-6 border border-border bg-card p-6 md:p-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
            Buy It For Life
          </p>
          <h3 className="mt-2 font-serif text-3xl text-foreground">Score</h3>
        </div>
        <p className="font-serif text-5xl tabular-nums text-accent">{overall}</p>
      </div>
      <div className="space-y-4">
        <ScoreBar label="Lifetime" value={scores.lifetime} />
        <ScoreBar label="Repairability" value={scores.repairability} />
        <ScoreBar label="Material quality" value={scores.materialQuality} />
        <ScoreBar label="Manufacturer" value={scores.manufacturerReputation} />
        <ScoreBar label="Warranty" value={scores.warranty} />
      </div>
    </div>
  );
}

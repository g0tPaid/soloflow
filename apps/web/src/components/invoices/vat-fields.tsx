'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const VAT_PRESETS = [5, 10, 15, 20] as const;

type Props = {
  taxRate: number;
  onTaxRateChange: (value: number) => void;
  idPrefix?: string;
  label?: string;
  hintOn?: string;
  hintOff?: string;
};

export function VatFields({
  taxRate,
  onTaxRateChange,
  idPrefix = 'vat',
  label = 'Add VAT to this invoice',
  hintOn = 'VAT is calculated on subtotal − discount + shipping, then added to the total.',
  hintOff = 'Turn this on to charge VAT. Choose a percentage and the total updates automatically.',
}: Props) {
  const vatOn = taxRate > 0;

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          id={`${idPrefix}-enabled`}
          type="checkbox"
          checked={vatOn}
          onChange={(e) => onTaxRateChange(e.target.checked ? (taxRate > 0 ? taxRate : 5) : 0)}
          className="size-5 rounded border-input accent-[#E40046]"
        />
        <span className="text-sm font-semibold">{label}</span>
      </label>

      {vatOn ? (
        <div className="space-y-3 rounded-lg border border-red-100 bg-red-50/40 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor={`${idPrefix}-rate`}>VAT percentage</Label>
            <Input
              id={`${idPrefix}-rate`}
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxRate}
              onChange={(e) => {
                const next = Number(e.target.value);
                onTaxRateChange(Number.isFinite(next) ? Math.max(0, Math.min(100, next)) : 0);
              }}
              className="h-10 w-24 bg-white text-right"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {VAT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onTaxRateChange(preset)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition',
                  taxRate === preset
                    ? 'border-red-600 bg-red-600 text-white'
                    : 'border-input bg-white text-muted-foreground hover:border-red-200 hover:bg-red-50/50',
                )}
              >
                {preset}%
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{hintOn}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{hintOff}</p>
      )}
    </div>
  );
}

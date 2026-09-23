'use client';

import { INVOICE_LIST_FILTERS, type InvoiceListFilter } from '@flowbooks/shared';
import { cn } from '@/lib/utils';

const chipClass: Record<InvoiceListFilter, { idle: string; selected: string }> = {
  waiting_for_payment: {
    idle: 'border-amber-300 text-amber-800 hover:bg-amber-50',
    selected: 'border-amber-500 bg-amber-100 text-amber-950',
  },
  paid: {
    idle: 'border-emerald-300 text-emerald-800 hover:bg-emerald-50',
    selected: 'border-emerald-600 bg-emerald-600 text-white',
  },
  canceled: {
    idle: 'border-slate-300 text-slate-600 hover:bg-slate-50',
    selected: 'border-slate-500 bg-slate-200 text-slate-900',
  },
  on_the_way: {
    idle: 'border-sky-300 text-sky-800 hover:bg-sky-50',
    selected: 'border-sky-600 bg-sky-100 text-sky-950',
  },
  order_complete: {
    idle: 'border-emerald-400 text-emerald-800 hover:bg-emerald-50',
    selected: 'border-emerald-700 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-700',
  },
};

type Props = {
  value: InvoiceListFilter | null;
  onChange: (value: InvoiceListFilter | null) => void;
};

export function InvoiceListFilterBar({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Invoice status guide">
      {INVOICE_LIST_FILTERS.map((filter) => {
        const selected = value === filter.id;
        const tone = chipClass[filter.id];
        return (
          <button
            key={filter.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : filter.id)}
            className={cn(
              'rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition',
              selected ? tone.selected : tone.idle,
            )}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InvoiceListView = 'card' | 'list';

export const INVOICE_LIST_VIEW_STORAGE_KEY = 'soloflow_invoices_view';

export function readInvoiceListView(storage: Pick<Storage, 'getItem'> | null): InvoiceListView {
  const value = storage?.getItem(INVOICE_LIST_VIEW_STORAGE_KEY);
  return value === 'list' ? 'list' : 'card';
}

export function writeInvoiceListView(storage: Pick<Storage, 'setItem'>, view: InvoiceListView) {
  storage.setItem(INVOICE_LIST_VIEW_STORAGE_KEY, view);
}

type Props = {
  value: InvoiceListView;
  onChange: (value: InvoiceListView) => void;
};

export function InvoiceViewToggle({ value, onChange }: Props) {
  return (
    <div
      className="inline-flex shrink-0 rounded-md border bg-background p-0.5"
      role="group"
      aria-label="Invoice view"
    >
      <button
        type="button"
        aria-pressed={value === 'card'}
        onClick={() => onChange('card')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium transition',
          value === 'card' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Cards
      </button>
      <button
        type="button"
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium transition',
          value === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
        )}
      >
        <List className="h-3.5 w-3.5" />
        List
      </button>
    </div>
  );
}

'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUploadField } from '@/components/shared/image-upload-field';
import { resolveImageSrc } from '@/lib/organization-branding';
import { formatCurrency } from '@/lib/utils';
import {
  calcInvoiceTotals,
  calcLineTotal,
  type LineItemInput,
} from '@/lib/line-items';
import type { Product } from '@/lib/api';
import { cn } from '@/lib/utils';

type ProductOption = Pick<Product, 'id' | 'name' | 'unitPrice' | 'imageUrl'>;

interface LineItemsEditorProps {
  items: LineItemInput[];
  onChange: (items: LineItemInput[]) => void;
  currency: string;
  products?: ProductOption[];
  readOnly?: boolean;
  discount?: number;
  shipping?: number;
  onShippingChange?: (value: number) => void;
  /** Invoice VAT percent (5 = 5%). 0 = off. */
  taxRate?: number;
  onTaxRateChange?: (value: number) => void;
}

const VAT_PRESETS = [5, 10, 15, 20] as const;

const emptyLine = (): LineItemInput => ({
  name: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
  taxRate: 0,
});

const selectClassName = cn(
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

export function LineItemsEditor({
  items,
  onChange,
  currency,
  products,
  readOnly = false,
  discount = 0,
  shipping = 0,
  onShippingChange,
  taxRate = 0,
  onTaxRateChange,
}: LineItemsEditorProps) {
  function update(index: number, patch: Partial<LineItemInput>) {
    const next = items.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  }

  function addLine() {
    onChange([...items, emptyLine()]);
  }

  function removeLine(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function pickProduct(index: number, productId: string) {
    const product = products?.find((p) => p.id === productId);
    if (!product) return;
    update(index, {
      productId: product.id,
      name: product.name,
      description: '',
      unitPrice: Number(product.unitPrice),
      taxRate: 0,
      imageUrl: product.imageUrl ?? undefined,
    });
  }

  const totals = calcInvoiceTotals(items, discount, shipping, taxRate);

  if (readOnly) {
    return (
      <div className="space-y-3">
        {items.map((row, index) => (
          <div
            key={index}
            className="flex flex-col gap-1 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{row.name || row.description}</p>
              {row.name && row.description ? (
                <p className="text-muted-foreground">{row.description}</p>
              ) : null}
              <p className="text-muted-foreground">
                {row.quantity} × {formatCurrency(row.unitPrice, currency)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {row.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveImageSrc(row.imageUrl)}
                  alt=""
                  className="h-12 w-12 rounded-md border object-cover"
                />
              )}
              <p className="font-medium">{formatCurrency(calcLineTotal(row), currency)}</p>
            </div>
          </div>
        ))}
        <InvoiceTotalsSummary
          currency={currency}
          discount={discount}
          onShippingChange={onShippingChange}
          onTaxRateChange={onTaxRateChange}
          {...totals}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((row, index) => (
        <div key={index} className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <ImageUploadField
            label="Line item photo"
            value={row.imageUrl}
            onChange={(url) => update(index, { imageUrl: url })}
          />

          {products && products.length > 0 && (
            <div className="space-y-2">
              <Label>From catalog</Label>
              <select
                className={selectClassName}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) pickProduct(index, e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="">Pick a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Item name</Label>
            <Input
              value={row.name}
              onChange={(e) => update(index, { name: e.target.value })}
              placeholder="Product or service name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={row.description}
              onChange={(e) => update(index, { description: e.target.value })}
              placeholder="Extra details (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Qty</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={row.quantity}
                onChange={(e) => update(index, { quantity: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit price</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={row.unitPrice}
                onChange={(e) => update(index, { unitPrice: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col justify-end space-y-2">
              <Label>Line total</Label>
              <p className="flex h-9 items-center text-sm font-medium">
                {formatCurrency(calcLineTotal(row), currency)}
              </p>
            </div>
          </div>

          {items.length > 1 && (
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(index)}>
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addLine}>
        <Plus className="h-4 w-4" />
        Add line
      </Button>

      <InvoiceTotalsSummary
        currency={currency}
        discount={discount}
        onShippingChange={onShippingChange}
        onTaxRateChange={onTaxRateChange}
        {...totals}
      />
    </div>
  );
}

function InvoiceTotalsSummary({
  subtotal,
  shipping,
  taxRate,
  taxAmount,
  total,
  discount,
  currency,
  onShippingChange,
  onTaxRateChange,
}: {
  subtotal: number;
  shipping: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  discount: number;
  currency: string;
  onShippingChange?: (value: number) => void;
  onTaxRateChange?: (value: number) => void;
}) {
  const vatOn = taxRate > 0;

  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Shipping</span>
        {onShippingChange ? (
          <Input
            type="number"
            min="0"
            step="any"
            value={shipping}
            onChange={(e) => onShippingChange(Number(e.target.value) || 0)}
            className="h-9 w-28 text-right"
          />
        ) : (
          <span>{formatCurrency(shipping, currency)}</span>
        )}
      </div>

      {onTaxRateChange ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={vatOn}
              onChange={(e) => onTaxRateChange(e.target.checked ? (taxRate > 0 ? taxRate : 5) : 0)}
              className="size-4 rounded border-input"
            />
            <span className="font-medium">Add VAT</span>
          </label>
          {vatOn ? (
            <div className="space-y-2 pl-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">Rate</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    onTaxRateChange(Number.isFinite(next) ? Math.max(0, Math.min(100, next)) : 0);
                  }}
                  className="h-9 w-20 text-right"
                />
                <span className="text-muted-foreground">%</span>
                <div className="flex flex-wrap gap-1">
                  {VAT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onTaxRateChange(preset)}
                      className={cn(
                        'rounded border px-2 py-1 text-xs font-medium transition',
                        taxRate === preset
                          ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-input text-muted-foreground hover:border-red-200',
                      )}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>VAT ({taxRate}%)</span>
                <span>{formatCurrency(taxAmount, currency)}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : taxAmount > 0 ? (
        <div className="flex justify-between">
          <span className="text-muted-foreground">VAT ({taxRate}%)</span>
          <span>{formatCurrency(taxAmount, currency)}</span>
        </div>
      ) : null}

      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatCurrency(subtotal, currency)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Discount</span>
          <span>-{formatCurrency(discount, currency)}</span>
        </div>
      )}
      <div className="flex justify-between border-t pt-2 text-base font-semibold">
        <span>Total</span>
        <span>{formatCurrency(total, currency)}</span>
      </div>
    </div>
  );
}

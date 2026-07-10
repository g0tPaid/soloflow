'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import {
  CURRENCIES,
  convertCurrency,
  normalizeCostCurrency,
  parseFxRates,
  roundMoney,
  type CreateExpenseInput,
} from '@flowbooks/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShippingFields } from '@/components/invoices/shipping-fields';
import { formatCurrency, cn } from '@/lib/utils';
import type { Customer } from '@/lib/api';

const selectClassName = cn(
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

type LineRow = {
  key: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unitCostCny: number;
};

type Props = {
  customers: Customer[];
  defaultCurrency?: string;
  costCurrency?: string;
  fxRates?: unknown;
  onSubmit: (data: CreateExpenseInput) => Promise<{ id: string }>;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function newRow(): LineRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: '',
    quantity: 1,
    unitPrice: 0,
    unitCostCny: 0,
  };
}

export function AddExpenseForm({
  customers,
  defaultCurrency = 'USD',
  costCurrency,
  fxRates,
  onSubmit,
}: Props) {
  const router = useRouter();
  const rates = useMemo(() => parseFxRates(fxRates), [fxRates]);
  const entryCurrency = useMemo(() => normalizeCostCurrency(costCurrency), [costCurrency]);

  const [customerId, setCustomerId] = useState('');
  const [number, setNumber] = useState('');
  const [issueDate, setIssueDate] = useState(todayIsoDate);
  const [currency, setCurrency] = useState(defaultCurrency.toUpperCase());
  const [notes, setNotes] = useState('');
  const [shipping, setShipping] = useState(0);
  const [shippingCostCny, setShippingCostCny] = useState(0);
  const [shippingMethod, setShippingMethod] = useState<'AIR' | 'SEA' | undefined>();
  const [shippingTerms, setShippingTerms] = useState<'DDP' | 'LCL' | undefined>();
  const [shippingFromCountry, setShippingFromCountry] = useState('');
  const [shippingToCountry, setShippingToCountry] = useState('');
  const [rows, setRows] = useState<LineRow[]>([newRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const itemsRevenue = rows.reduce(
    (sum, row) => sum + roundMoney(Math.max(0, row.quantity) * Math.max(0, row.unitPrice)),
    0,
  );
  const revenue = roundMoney(itemsRevenue + Math.max(0, shipping));
  const itemsCost = rows.reduce((sum, row) => {
    const unitCost = roundMoney(
      convertCurrency(Math.max(0, row.unitCostCny), entryCurrency, currency, rates),
    );
    return sum + roundMoney(Math.max(0, row.quantity) * unitCost);
  }, 0);
  const shippingCost = roundMoney(
    convertCurrency(Math.max(0, shippingCostCny), entryCurrency, currency, rates),
  );
  const totalCost = roundMoney(itemsCost + shippingCost);
  const profit = roundMoney(revenue - totalCost);

  function updateRow(key: string, patch: Partial<LineRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function handleSave() {
    setError('');
    if (!customerId) {
      setError('Select a customer');
      return;
    }
    if (!number.trim()) {
      setError('Enter the original invoice number');
      return;
    }
    if (!issueDate) {
      setError('Enter the invoice date');
      return;
    }
    const validItems = rows.filter((row) => row.description.trim());
    if (validItems.length === 0) {
      setError('Add at least one line item with a name');
      return;
    }

    setSubmitting(true);
    try {
      const created = await onSubmit({
        customerId,
        number: number.trim(),
        issueDate,
        currency,
        notes: notes.trim() || null,
        shipping: Math.max(0, shipping),
        shippingCostCny: Math.max(0, shippingCostCny),
        shippingMethod: shippingMethod ?? null,
        shippingTerms: shippingTerms ?? null,
        shippingFromCountry: shippingFromCountry.trim() || null,
        shippingToCountry: shippingToCountry.trim() || null,
        items: validItems.map((row) => ({
          description: row.description.trim(),
          name: row.description.trim(),
          quantity: Math.max(0.0001, row.quantity),
          unitPrice: Math.max(0, row.unitPrice),
          unitCostCny: Math.max(0, row.unitCostCny),
        })),
      });
      router.push(`/expenses/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Past invoice details</CardTitle>
          <CardDescription>
            Record an old invoice that was not created in this app. It is saved as a paid sale so
            profit still shows on the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customerId">Customer *</Label>
            <select
              id="customerId"
              className={selectClassName}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="number">Invoice number *</Label>
            <Input
              id="number"
              placeholder="e.g. INV-2023-0042"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issueDate">Invoice date *</Label>
            <Input
              id="issueDate"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Sale currency</Label>
            <select
              id="currency"
              className={selectClassName}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="e.g. Imported from paper invoice"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
          <CardDescription>
            Sale price in {currency}; cost each in {entryCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Sale each ({currency})</th>
                  <th className="px-2 py-2 text-right">Cost each ({entryCurrency})</th>
                  <th className="px-2 py-2 text-right">Cost ({currency})</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const unitCost = roundMoney(
                    convertCurrency(Math.max(0, row.unitCostCny), entryCurrency, currency, rates),
                  );
                  return (
                    <tr key={row.key} className="border-b align-top">
                      <td className="px-2 py-2">
                        <Input
                          placeholder="Item name"
                          value={row.description}
                          onChange={(e) => updateRow(row.key, { description: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="text-right"
                          value={row.quantity}
                          onChange={(e) =>
                            updateRow(row.key, { quantity: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="text-right"
                          value={row.unitPrice}
                          onChange={(e) =>
                            updateRow(row.key, { unitPrice: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="text-right"
                          value={row.unitCostCny}
                          onChange={(e) =>
                            updateRow(row.key, { unitCostCny: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(unitCost, currency)}
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={rows.length <= 1}
                          onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                          aria-label="Remove line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 md:hidden">
            {rows.map((row) => {
              const unitCost = roundMoney(
                convertCurrency(Math.max(0, row.unitCostCny), entryCurrency, currency, rates),
              );
              return (
                <div key={row.key} className="space-y-3 rounded-lg border p-4">
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Input
                      placeholder="Item name"
                      value={row.description}
                      onChange={(e) => updateRow(row.key, { description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(row.key, { quantity: Number(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sale each ({currency})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={row.unitPrice}
                        onChange={(e) =>
                          updateRow(row.key, { unitPrice: Number(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cost each ({entryCurrency})</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={row.unitCostCny}
                      onChange={(e) =>
                        updateRow(row.key, { unitCostCny: Number(e.target.value) || 0 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      ≈ {formatCurrency(unitCost, currency)}
                    </p>
                  </div>
                  {rows.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <Button type="button" variant="outline" onClick={() => setRows((prev) => [...prev, newRow()])}>
            <Plus className="mr-2 h-4 w-4" />
            Add line
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ShippingFields
            method={shippingMethod}
            terms={shippingTerms}
            fromCountry={shippingFromCountry}
            toCountry={shippingToCountry}
            onMethodChange={setShippingMethod}
            onTermsChange={setShippingTerms}
            onFromCountryChange={setShippingFromCountry}
            onToCountryChange={setShippingToCountry}
            idPrefix="legacy-shipping"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shipping">Customer shipping charged ({currency})</Label>
              <Input
                id="shipping"
                type="number"
                min="0"
                step="any"
                value={shipping}
                onChange={(e) => setShipping(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shippingCostCny">Actual shipping cost ({entryCurrency})</Label>
              <Input
                id="shippingCostCny"
                type="number"
                min="0"
                step="any"
                value={shippingCostCny}
                onChange={(e) => setShippingCostCny(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                ≈ {formatCurrency(shippingCost, currency)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-medium">{formatCurrency(revenue, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total expense</span>
              <span className="font-medium text-orange-700">
                {formatCurrency(totalCost, currency)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Profit</span>
              <span
                className={
                  profit >= 0 ? 'font-semibold text-green-700' : 'font-semibold text-destructive'
                }
              >
                {formatCurrency(profit, currency)}
              </span>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={handleSave} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save expense'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/expenses">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

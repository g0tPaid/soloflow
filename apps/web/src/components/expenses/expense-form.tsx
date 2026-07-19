'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Plane, Ship, Truck, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';
import { formatCurrency } from '@/lib/utils';
import { calcLineCost, calcProfit, parseStoredLineItem } from '@/lib/line-items';
import { resolveImageSrc } from '@/lib/organization-branding';
import type { ExpenseDetail } from '@/lib/api';
import {
  convertCurrencyMaybe,
  normalizeCostCurrency,
  parseFxRates,
  roundMoney,
  type FxRates,
  type UpdateExpenseCostsInput,
  SHIPPING_TERMS,
} from '@flowbooks/shared';

function shippingTermsLabel(terms?: string | null) {
  if (!terms) return null;
  return SHIPPING_TERMS.find((option) => option.value === terms)?.label ?? terms;
}

type CostRow = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  unitCost: number;
  /** Amount in org costCurrency (stored as unitCostCny in DB) */
  unitCostEntry: number;
};

function toCostRows(
  expense: ExpenseDetail,
  rates: FxRates,
  costCurrency: string,
  fxEnabled: boolean,
): CostRow[] {
  return (expense.items ?? []).map((item) => {
    const { name, description } = parseStoredLineItem(item);
    const unitCost = Number(item.unitCost ?? 0);
    let unitCostEntry = Number(item.unitCostCny ?? 0);
    if (!unitCostEntry && unitCost > 0) {
      unitCostEntry = roundMoney(
        convertCurrencyMaybe(unitCost, expense.currency, costCurrency, rates, fxEnabled),
      );
    }
    return {
      id: item.id,
      name,
      description,
      imageUrl: item.imageUrl ?? item.product?.imageUrl,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
      unitCost,
      unitCostEntry,
    };
  });
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

type Props = {
  expense: ExpenseDetail;
  organizationId: string;
  costCurrency?: string;
  fxRates?: unknown;
  fxEnabled?: boolean;
  onSubmit: (data: UpdateExpenseCostsInput) => Promise<void>;
};

export function ExpenseForm({
  expense,
  organizationId,
  costCurrency,
  fxRates,
  fxEnabled = true,
  onSubmit,
}: Props) {
  const rates = useMemo(() => parseFxRates(fxRates), [fxRates]);
  const entryCurrency = useMemo(() => normalizeCostCurrency(costCurrency), [costCurrency]);
  const [rows, setRows] = useState<CostRow[]>(() =>
    toCostRows(expense, rates, entryCurrency, fxEnabled),
  );
  const [shippingCostEntry, setShippingCostEntry] = useState(() => {
    const existing = Number(expense.shippingCostCny ?? 0);
    if (existing > 0) return existing;
    const shippingCost = Number(expense.shippingCost ?? 0);
    return shippingCost > 0
      ? roundMoney(
          convertCurrencyMaybe(
            shippingCost,
            expense.currency,
            entryCurrency,
            rates,
            fxEnabled,
          ),
        )
      : 0;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setRows(toCostRows(expense, rates, entryCurrency, fxEnabled));
    const existing = Number(expense.shippingCostCny ?? 0);
    if (existing > 0) {
      setShippingCostEntry(existing);
    } else {
      const shippingCost = Number(expense.shippingCost ?? 0);
      setShippingCostEntry(
        shippingCost > 0
          ? roundMoney(
              convertCurrencyMaybe(
                shippingCost,
                expense.currency,
                entryCurrency,
                rates,
                fxEnabled,
              ),
            )
          : 0,
      );
    }
  }, [expense, rates, entryCurrency, fxEnabled]);

  const revenue = Number(expense.total);
  const customerShipping = Number(expense.shipping ?? expense.customerShipping ?? 0);
  const shippingCost = roundMoney(
    convertCurrencyMaybe(shippingCostEntry, entryCurrency, expense.currency, rates, fxEnabled),
  );
  const itemsCost = rows.reduce((sum, row) => {
    const unitCost = roundMoney(
      convertCurrencyMaybe(row.unitCostEntry, entryCurrency, expense.currency, rates, fxEnabled),
    );
    return sum + calcLineCost(row.quantity, unitCost);
  }, 0);
  const totalCost = itemsCost + shippingCost;
  const shippingProfit = customerShipping - shippingCost;
  const profit = calcProfit(revenue, totalCost);
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

  function updateUnitCostEntry(index: number, unitCostEntry: number) {
    const nextEntry = Math.max(0, unitCostEntry);
    const nextUnitCost = roundMoney(
      convertCurrencyMaybe(nextEntry, entryCurrency, expense.currency, rates, fxEnabled),
    );
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, unitCostEntry: nextEntry, unitCost: nextUnitCost } : row,
      ),
    );
    setSaved(false);
  }

  async function handleSave() {
    setSubmitting(true);
    setError('');
    setSaved(false);
    try {
      await onSubmit({
        items: rows.map((row) => ({
          id: row.id,
          unitCostCny: row.unitCostEntry,
          unitCost: roundMoney(
            convertCurrencyMaybe(row.unitCostEntry, entryCurrency, expense.currency, rates, fxEnabled),
          ),
        })),
        shippingCostCny: Math.max(0, shippingCostEntry),
        shippingCost,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expenses');
    } finally {
      setSubmitting(false);
    }
  }

  function openPrint() {
    const url = `/print/expenses/${expense.id}?org=${encodeURIComponent(organizationId)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href = url;
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Invoice {expense.number}</CardTitle>
            <InvoiceStatusBadge status={expense.status} />
          </div>
          <CardDescription>
            {expense.vendor?.name ?? expense.customer?.name} · Issued {formatDate(expense.issueDate)} ·{' '}
            {expense.currency}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <p className="text-muted-foreground">Vendor</p>
            <p className="font-medium">{expense.vendor?.name ?? expense.customer?.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Invoice total (revenue)</p>
            <p className="font-medium">{formatCurrency(revenue, expense.currency)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Due date</p>
            <p className="font-medium">{formatDate(expense.dueDate)}</p>
          </div>
          {(expense.shippingMethod || expense.shippingTerms) && (
            <div>
              <p className="text-muted-foreground">Shipping method</p>
              <p className="inline-flex items-center gap-1.5 font-medium">
                {expense.shippingMethod === 'AIR' && (
                  <>
                    <Plane className="h-4 w-4 text-primary" /> Air
                  </>
                )}
                {expense.shippingMethod === 'SEA' && (
                  <>
                    <Ship className="h-4 w-4 text-primary" /> Ship
                  </>
                )}
                {expense.shippingMethod === 'LOCAL' && (
                  <>
                    <Truck className="h-4 w-4 text-primary" /> Local Delivery
                  </>
                )}
                {shippingTermsLabel(expense.shippingTerms) && (
                  <span className="text-muted-foreground">
                    · {shippingTermsLabel(expense.shippingTerms)}
                  </span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line item costs</CardTitle>
          <CardDescription>
            Enter what you paid in {entryCurrency} — we convert to {expense.currency} for profit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Sale price</th>
                  <th className="px-2 py-2 text-right">Revenue</th>
                  <th className="px-2 py-2 text-right">Cost each ({entryCurrency})</th>
                  <th className="px-2 py-2 text-right">Cost ({expense.currency})</th>
                  <th className="px-2 py-2 text-right">Expense</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const imageSrc = resolveImageSrc(row.imageUrl);
                  const unitCost = roundMoney(
                    convertCurrencyMaybe(row.unitCostEntry, entryCurrency, expense.currency, rates, fxEnabled),
                  );
                  const lineCost = calcLineCost(row.quantity, unitCost);
                  return (
                    <tr key={row.id} className="border-b align-top">
                      <td className="px-2 py-3">
                        <div className="flex items-start gap-3">
                          {imageSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageSrc}
                              alt=""
                              className="h-12 w-12 rounded-md border object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed bg-muted/40 text-[10px] text-muted-foreground">
                              —
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{row.name || row.description || 'Item'}</p>
                            {row.description && row.name && (
                              <p className="text-xs text-muted-foreground">{row.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums">{row.quantity}</td>
                      <td className="px-2 py-3 text-right tabular-nums">
                        {formatCurrency(row.unitPrice, expense.currency)}
                      </td>
                      <td className="px-2 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(row.amount, expense.currency)}
                      </td>
                      <td className="px-2 py-3">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={row.unitCostEntry}
                          onChange={(e) => updateUnitCostEntry(index, Number(e.target.value) || 0)}
                          className="ml-auto h-9 w-28 text-right"
                        />
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(unitCost, expense.currency)}
                      </td>
                      <td className="px-2 py-3 text-right font-medium tabular-nums text-orange-700">
                        {formatCurrency(lineCost, expense.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 md:hidden">
            {rows.map((row, index) => {
              const imageSrc = resolveImageSrc(row.imageUrl);
              const unitCost = roundMoney(
                convertCurrencyMaybe(row.unitCostEntry, entryCurrency, expense.currency, rates, fxEnabled),
              );
              const lineCost = calcLineCost(row.quantity, unitCost);
              return (
                <div key={row.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    {imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageSrc} alt="" className="h-12 w-12 rounded-md border object-cover" />
                    ) : null}
                    <div>
                      <p className="font-medium">{row.name || row.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {row.quantity} × {formatCurrency(row.unitPrice, expense.currency)} ={' '}
                        {formatCurrency(row.amount, expense.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cost each ({entryCurrency})</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={row.unitCostEntry}
                      onChange={(e) => updateUnitCostEntry(index, Number(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                      ≈ {formatCurrency(unitCost, expense.currency)}
                    </p>
                  </div>
                  <p className="text-sm">
                    Line expense:{' '}
                    <span className="font-medium text-orange-700">
                      {formatCurrency(lineCost, expense.currency)}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipping costs</CardTitle>
          <CardDescription>
            Enter actual shipping in {entryCurrency} — converted to {expense.currency} for profit
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Customer shipping (on invoice)
            </p>
            <p className="mt-2 text-xl font-semibold">
              {formatCurrency(customerShipping, expense.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Charged to the customer</p>
          </div>
          <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50/40 p-4">
            <Label htmlFor="shippingCostEntry">Actual shipping cost ({entryCurrency})</Label>
            <Input
              id="shippingCostEntry"
              type="number"
              min="0"
              step="any"
              value={shippingCostEntry}
              onChange={(e) => {
                setShippingCostEntry(Math.max(0, Number(e.target.value) || 0));
                setSaved(false);
              }}
            />
            <p className="text-xs text-muted-foreground">
              ≈ {formatCurrency(shippingCost, expense.currency)} · Shipping profit:{' '}
              <span className={shippingProfit >= 0 ? 'font-medium text-green-700' : 'font-medium text-destructive'}>
                {formatCurrency(shippingProfit, expense.currency)}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expense vs profit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice revenue</span>
              <span className="font-medium">{formatCurrency(revenue, expense.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items cost</span>
              <span className="font-medium text-orange-700">
                {formatCurrency(itemsCost, expense.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping cost</span>
              <span className="font-medium text-orange-700">
                {formatCurrency(shippingCost, expense.currency)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Total expense</span>
              <span className="font-semibold text-orange-700">
                {formatCurrency(totalCost, expense.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Profit</span>
              <span className={profit >= 0 ? 'font-semibold text-green-700' : 'font-semibold text-destructive'}>
                {formatCurrency(profit, expense.currency)} ({marginPercent.toFixed(1)}%)
              </span>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {saved && !error && <p className="mt-3 text-sm text-green-700">Costs saved</p>}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={handleSave} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save costs'}
            </Button>
            <Button type="button" variant="outline" onClick={openPrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print / PDF
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/expenses">Back to expenses</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

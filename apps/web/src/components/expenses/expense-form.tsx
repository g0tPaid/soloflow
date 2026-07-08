'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plane, Ship, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';
import { formatCurrency } from '@/lib/utils';
import { calcLineCost, calcProfit, parseStoredLineItem } from '@/lib/line-items';
import { resolveImageSrc } from '@/lib/organization-branding';
import type { ExpenseDetail } from '@/lib/api';
import type { UpdateExpenseCostsInput } from '@flowbooks/shared';

type CostRow = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  unitCost: number;
};

function toCostRows(expense: ExpenseDetail): CostRow[] {
  return (expense.items ?? []).map((item) => {
    const { name, description } = parseStoredLineItem(item);
    return {
      id: item.id,
      name,
      description,
      imageUrl: item.imageUrl ?? item.product?.imageUrl,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
      unitCost: Number(item.unitCost ?? 0),
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
  onSubmit: (data: UpdateExpenseCostsInput) => Promise<void>;
};

export function ExpenseForm({ expense, organizationId, onSubmit }: Props) {
  const [rows, setRows] = useState<CostRow[]>(() => toCostRows(expense));
  const [shippingCost, setShippingCost] = useState(Number(expense.shippingCost ?? 0));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setRows(toCostRows(expense));
    setShippingCost(Number(expense.shippingCost ?? 0));
  }, [expense]);

  const revenue = Number(expense.total);
  const customerShipping = Number(expense.shipping ?? expense.customerShipping ?? 0);
  const itemsCost = rows.reduce((sum, row) => sum + calcLineCost(row.quantity, row.unitCost), 0);
  const totalCost = itemsCost + shippingCost;
  const shippingProfit = customerShipping - shippingCost;
  const profit = calcProfit(revenue, totalCost);
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

  function updateUnitCost(index: number, unitCost: number) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, unitCost: Math.max(0, unitCost) } : row)),
    );
    setSaved(false);
  }

  async function handleSave() {
    setSubmitting(true);
    setError('');
    setSaved(false);
    try {
      await onSubmit({
        items: rows.map((row) => ({ id: row.id, unitCost: row.unitCost })),
        shippingCost: Math.max(0, shippingCost),
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
            {expense.customer?.name} · Issued {formatDate(expense.issueDate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <p className="text-muted-foreground">Customer</p>
            <p className="font-medium">{expense.customer?.name}</p>
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
                {expense.shippingTerms && (
                  <span className="text-muted-foreground">· {expense.shippingTerms}</span>
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
            Enter what you paid for each item — profit is calculated automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Sale price</th>
                  <th className="px-2 py-2 text-right">Revenue</th>
                  <th className="px-2 py-2 text-right">Cost each</th>
                  <th className="px-2 py-2 text-right">Expense</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const imageSrc = resolveImageSrc(row.imageUrl);
                  const lineCost = calcLineCost(row.quantity, row.unitCost);
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
                          value={row.unitCost}
                          onChange={(e) => updateUnitCost(index, Number(e.target.value) || 0)}
                          className="ml-auto h-9 w-28 text-right"
                        />
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
              const lineCost = calcLineCost(row.quantity, row.unitCost);
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
                    <Label>Cost each (what you paid)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={row.unitCost}
                      onChange={(e) => updateUnitCost(index, Number(e.target.value) || 0)}
                    />
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
            Compare what the customer paid for shipping vs what you actually paid
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
            <Label htmlFor="shippingCost">Actual shipping cost (what you paid)</Label>
            <Input
              id="shippingCost"
              type="number"
              min="0"
              step="any"
              value={shippingCost}
              onChange={(e) => {
                setShippingCost(Math.max(0, Number(e.target.value) || 0));
                setSaved(false);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Shipping profit:{' '}
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
          <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice revenue</span>
              <span className="font-medium">{formatCurrency(revenue, expense.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item costs</span>
              <span className="font-medium text-orange-700">
                {formatCurrency(itemsCost, expense.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual shipping cost</span>
              <span className="font-medium text-orange-700">
                {formatCurrency(shippingCost, expense.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total expenses</span>
              <span className="font-medium text-orange-700">
                {formatCurrency(totalCost, expense.currency)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Profit</span>
              <span className={profit >= 0 ? 'text-green-700' : 'text-destructive'}>
                {formatCurrency(profit, expense.currency)}
                {revenue > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({marginPercent.toFixed(1)}% margin)
                  </span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && (
        <p className="text-sm text-green-600">Expenses saved. Profit updated for this invoice.</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button type="button" className="w-full sm:w-auto" onClick={handleSave} disabled={submitting}>
          {submitting ? 'Saving...' : 'Save expenses'}
        </Button>
        <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={openPrint}>
          <Printer className="h-4 w-4" />
          Download / Print
        </Button>
        <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
          <Link href="/expenses">Back to expenses</Link>
        </Button>
        <Button type="button" variant="ghost" className="w-full sm:w-auto" asChild>
          <Link href={`/invoices/${expense.id}`}>View invoice</Link>
        </Button>
      </div>
    </div>
  );
}

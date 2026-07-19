'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import {
  CURRENCIES,
  convertCurrencyMaybe,
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
import { VatFields } from '@/components/invoices/vat-fields';
import { formatCurrency, cn } from '@/lib/utils';
import type { Vendor } from '@/lib/api';

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
  vendors: Vendor[];
  defaultCurrency?: string;
  costCurrency?: string;
  fxRates?: unknown;
  fxEnabled?: boolean;
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
  vendors,
  defaultCurrency = 'USD',
  costCurrency,
  fxRates,
  fxEnabled = true,
  onSubmit,
}: Props) {
  const router = useRouter();
  const rates = useMemo(() => parseFxRates(fxRates), [fxRates]);
  const entryCurrency = useMemo(() => normalizeCostCurrency(costCurrency), [costCurrency]);
  const companyCurrency = defaultCurrency.toUpperCase();

  const [vendorId, setVendorId] = useState('');
  const [number, setNumber] = useState('');
  const [issueDate, setIssueDate] = useState(todayIsoDate);
  const [currency, setCurrency] = useState(companyCurrency);
  const currencyTouched = useRef(false);
  const [notes, setNotes] = useState('');
  const [shipping, setShipping] = useState(0);
  const [shippingCostCny, setShippingCostCny] = useState(0);
  const [shippingMethod, setShippingMethod] = useState<'AIR' | 'SEA' | 'LOCAL' | undefined>();
  const [shippingTerms, setShippingTerms] = useState<'DDP' | 'LCL' | 'LOCAL' | undefined>();
  const [shippingFromCountry, setShippingFromCountry] = useState('');
  const [shippingToCountry, setShippingToCountry] = useState('');
  const [inputTaxRate, setInputTaxRate] = useState(0);
  const [rows, setRows] = useState<LineRow[]>([newRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedVendor = vendors.find((v) => v.id === vendorId);
  const vendorHasTrn = Boolean(selectedVendor?.taxId?.trim());

  // Always start from company currency; keep synced until the user picks another
  useEffect(() => {
    if (!currencyTouched.current) {
      setCurrency(companyCurrency);
    }
  }, [companyCurrency]);

  const itemsRevenue = rows.reduce(
    (sum, row) => sum + roundMoney(Math.max(0, row.quantity) * Math.max(0, row.unitPrice)),
    0,
  );
  const revenue = roundMoney(itemsRevenue + Math.max(0, shipping));
  const itemsCost = rows.reduce((sum, row) => {
    const unitCost = roundMoney(
      convertCurrencyMaybe(Math.max(0, row.unitCostCny), entryCurrency, currency, rates, fxEnabled),
    );
    return sum + roundMoney(Math.max(0, row.quantity) * unitCost);
  }, 0);
  const shippingCost = roundMoney(
    convertCurrencyMaybe(Math.max(0, shippingCostCny), entryCurrency, currency, rates, fxEnabled),
  );
  const totalCost = roundMoney(itemsCost + shippingCost);
  const inputTaxAmount =
    inputTaxRate > 0 ? roundMoney(totalCost * (inputTaxRate / 100)) : 0;
  const profit = roundMoney(revenue - totalCost);

  function updateRow(key: string, patch: Partial<LineRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function handleSave() {
    setError('');
    if (!vendorId) {
      setError('Select a vendor');
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
        vendorId,
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
        inputTaxRate: Math.max(0, inputTaxRate),
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
            <Label htmlFor="vendorId">Vendor *</Label>
            <select
              id="vendorId"
              className={selectClassName}
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
            >
              <option value="">Select vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
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
              onChange={(e) => {
                currencyTouched.current = true;
                setCurrency(e.target.value);
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Defaults to your company currency ({companyCurrency})
            </p>
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
                    convertCurrencyMaybe(Math.max(0, row.unitCostCny), entryCurrency, currency, rates, fxEnabled),
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
                convertCurrencyMaybe(Math.max(0, row.unitCostCny), entryCurrency, currency, rates, fxEnabled),
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
          <CardTitle>VAT on purchase (input VAT)</CardTitle>
          <CardDescription>
            UAE recoverable VAT paid to the vendor. Use 5% for standard-rated purchases.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <VatFields
            idPrefix="input-vat"
            taxRate={inputTaxRate}
            onTaxRateChange={setInputTaxRate}
            label="Add VAT on purchase (input VAT)"
            hintOn="Input VAT is calculated on total purchase cost (line costs + shipping cost)."
            hintOff="Turn on if the vendor charged VAT on this purchase."
          />
          {inputTaxRate > 0 && (
            <p className="text-sm">
              Input VAT ≈{' '}
              <span className="font-medium">{formatCurrency(inputTaxAmount, currency)}</span>
            </p>
          )}
          {inputTaxRate > 0 && vendorId && !vendorHasTrn && (
            <p className="text-sm text-amber-700">
              This vendor has no TRN Number. Input VAT will appear as non-recoverable on the UAE VAT
              report until you add their TRN.
            </p>
          )}
          {selectedVendor?.taxId && (
            <p className="text-xs text-muted-foreground">Vendor TRN: {selectedVendor.taxId}</p>
          )}
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
            {inputTaxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Input VAT ({inputTaxRate}%)</span>
                <span className="font-medium">{formatCurrency(inputTaxAmount, currency)}</span>
              </div>
            )}
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

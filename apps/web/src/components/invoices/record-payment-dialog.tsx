'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  PAYMENT_METHODS,
  createPaymentSchema,
  invoiceAmountPaid,
  invoiceBalanceDue,
  type PaymentMethod,
} from '@flowbooks/shared';
import { api, type Invoice } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function todayInput() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function RecordPaymentDialog({
  invoice,
  organizationId,
  onClose,
  onRecorded,
}: {
  invoice: Invoice;
  organizationId: string;
  onClose: () => void;
  onRecorded: (invoice: Invoice) => void;
}) {
  const { data: session } = useSession();
  const remaining = invoiceBalanceDue(invoice);
  const alreadyPaid = invoiceAmountPaid(invoice);
  const [amount, setAmount] = useState(String(remaining));
  const [paidAt, setPaidAt] = useState(todayInput);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAmount(String(remaining));
    setPaidAt(todayInput());
    setMethod('CASH');
    setNote('');
    setError('');
  }, [invoice.id, remaining]);

  const parsedAmount = Number(amount);
  const canSubmit = useMemo(
    () => Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= remaining + 0.01,
    [parsedAmount, remaining],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!session?.accessToken || submitting) return;
    const parsed = createPaymentSchema.safeParse({
      amount: parsedAmount,
      paidAt,
      method,
      note: note.trim() || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check the payment details');
      return;
    }
    if (parsed.data.amount > remaining + 0.01) {
      setError(`Amount cannot be more than the remaining balance of ${remaining.toFixed(2)}`);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const updated = await api.invoices.recordPayment(
        session.accessToken,
        organizationId,
        invoice.id,
        {
          amount: parsed.data.amount,
          paidAt: parsed.data.paidAt,
          method: parsed.data.method,
          note: parsed.data.note,
        },
      );
      onRecorded(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record payment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
      onClick={onClose}
    >
      <Card className="w-full max-w-md" onClick={(event) => event.stopPropagation()}>
        <CardHeader className="pb-3">
          <CardTitle id="record-payment-title" className="text-lg">
            Record payment
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {invoice.number}
            {invoice.customer?.name ? ` · ${invoice.customer.name}` : ''}
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/60 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Invoice total</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(Number(invoice.total), invoice.currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Already paid</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(alreadyPaid, invoice.currency)}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="text-base font-semibold tabular-nums text-amber-800">
                {formatCurrency(remaining, invoice.currency)}
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-1.5">
              <Label htmlFor="payment-amount">Amount received</Label>
              <Input
                id="payment-amount"
                type="number"
                inputMode="decimal"
                min={0.01}
                max={remaining}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="payment-date">Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paidAt}
                  onChange={(event) => setPaidAt(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-method">Method</Label>
                <select
                  id="payment-method"
                  className={selectClassName}
                  value={method}
                  onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                >
                  {PAYMENT_METHODS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-note">Note (optional)</Label>
              <Input
                id="payment-note"
                value={note}
                maxLength={500}
                placeholder="e.g. first installment"
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={!canSubmit || submitting}>
                {submitting ? 'Saving…' : 'Save payment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

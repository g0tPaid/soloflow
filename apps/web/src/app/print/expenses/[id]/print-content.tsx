'use client';

import Link from 'next/link';
import { use, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { Plane, Ship, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { ORG_STORAGE_KEY, useOrganizationId } from '@/hooks/use-organization';
import { formatCurrency } from '@/lib/utils';
import { parseStoredLineItem } from '@/lib/line-items';
import { formatAddressLines, resolveImageSrc } from '@/lib/organization-branding';
import { PrintPageToolbar } from '@/components/print/print-page-toolbar';

const RED = '#DC2626';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ExpensePrintPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const orgFromUrl = searchParams.get('org');
  const embed = searchParams.get('embed') === '1';
  const { data: session, status: sessionStatus } = useSession();
  const { organizationId: orgFromHook, isReady } = useOrganizationId();
  const organizationId = orgFromHook ?? orgFromUrl;

  useEffect(() => {
    if (!orgFromUrl || orgFromHook) return;
    localStorage.setItem(ORG_STORAGE_KEY, orgFromUrl);
  }, [orgFromUrl, orgFromHook]);

  const callbackUrl = useMemo(() => {
    const query = orgFromUrl ? `?org=${encodeURIComponent(orgFromUrl)}` : '';
    return `/print/expenses/${id}${query}`;
  }, [id, orgFromUrl]);

  const canFetch =
    sessionStatus === 'authenticated' && !!session?.accessToken && !!organizationId;

  const {
    data: expense,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['expense-print', id, organizationId],
    queryFn: () => api.expenses.get(session!.accessToken!, organizationId!, id),
    enabled: canFetch,
    retry: 1,
  });

  if (sessionStatus === 'loading' || (!isReady && !orgFromUrl)) {
    return <p className="p-8 text-center text-sm text-gray-500">Preparing expenses…</p>;
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="p-8 text-center text-sm text-gray-600">
        <p className="font-medium text-gray-900">Sign in to download this expense report</p>
        <p className="mt-2">
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-red-600 underline hover:text-red-700"
          >
            Go to login
          </Link>
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-sm text-red-600">
        <p className="font-medium">Could not load expenses</p>
        <p className="mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  if (!canFetch || isLoading || isFetching || !expense) {
    return <p className="p-8 text-center text-sm text-gray-500">Preparing expenses…</p>;
  }

  const currency = expense.currency;
  const revenue = Number(expense.revenue ?? expense.total);
  const customerShipping = Number(expense.customerShipping ?? expense.shipping ?? 0);
  const shippingCost = Number(expense.shippingCost ?? 0);
  const itemsCost = Number(
    expense.itemsCost ??
      (expense.items ?? []).reduce((sum, item) => sum + Number(item.costAmount ?? 0), 0),
  );
  const totalCost = Number(expense.totalCost ?? itemsCost + shippingCost);
  const shippingProfit = Number(expense.shippingProfit ?? customerShipping - shippingCost);
  const profit = Number(expense.profit ?? revenue - totalCost);
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;
  const customerAddress = formatAddressLines(expense.customer?.address ?? undefined);

  const expenseFilename = `expense-${expense.number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  const whatsappMessage = `Expense report for invoice ${expense.number} — profit ${formatCurrency(profit, currency)}.`;

  return (
    <div className="expense-print mx-auto min-h-screen w-full max-w-[900px] overflow-x-hidden bg-white text-slate-800">
      {!embed && (
      <PrintPageToolbar
        backHref="/expenses"
        backLabel="Back to expenses"
        documentType="expenses"
        documentId={id}
        organizationId={organizationId}
        filename={expenseFilename}
        whatsappMessage={whatsappMessage}
        emailSubject={`Expense report ${expense.number}`}
        emailBody={whatsappMessage}
      />
      )}

      <div id="expense-capture-root" className="bg-white">
      <div className="px-8 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: RED }}>
              Expense report
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
              Invoice {expense.number}
            </h1>
            <p className="mt-1 text-sm text-slate-500">Issued {formatDate(expense.issueDate)}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-semibold text-slate-900">{expense.customer?.name}</p>
            {customerAddress.map((line) => (
              <p key={line} className="text-slate-600">
                {line}
              </p>
            ))}
          </div>
        </div>

        {(expense.shippingMethod ||
          expense.shippingTerms ||
          expense.shippingFromCountry ||
          expense.shippingToCountry) && (
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-3 text-center text-sm">
              <p className="text-xs text-slate-500">Method</p>
              <p className="mt-1 inline-flex items-center justify-center gap-1.5 font-semibold">
                {expense.shippingMethod === 'AIR' && (
                  <>
                    <Plane className="h-4 w-4 text-red-600" /> Air
                  </>
                )}
                {expense.shippingMethod === 'SEA' && (
                  <>
                    <Ship className="h-4 w-4 text-red-600" /> Ship
                  </>
                )}
                {!expense.shippingMethod && '—'}
              </p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-3 text-center text-sm">
              <p className="text-xs text-slate-500">Terms</p>
              <p className="mt-1 font-semibold">{expense.shippingTerms ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-3 text-center text-sm">
              <p className="text-xs text-slate-500">Route</p>
              <p className="mt-1 inline-flex items-center justify-center gap-1.5 font-semibold">
                {expense.shippingFromCountry || expense.shippingToCountry ? (
                  <>
                    <span>{expense.shippingFromCountry || '—'}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-red-500" />
                    <span>{expense.shippingToCountry || '—'}</span>
                  </>
                ) : (
                  '—'
                )}
              </p>
            </div>
          </div>
        )}

        <table className="mb-6 w-full border-collapse overflow-hidden rounded-xl text-sm shadow-sm ring-1 ring-slate-100">
          <thead>
            <tr style={{ backgroundColor: RED }} className="text-left text-white">
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Item</th>
              <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider">Qty</th>
              <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider">
                Sale
              </th>
              <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider">
                Cost each
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">
                Expense
              </th>
            </tr>
          </thead>
          <tbody>
            {(expense.items ?? []).map((item, index) => {
              const { name, description } = parseStoredLineItem(item);
              const imageSrc = resolveImageSrc(item.imageUrl ?? item.product?.imageUrl);
              const isEven = index % 2 === 0;
              return (
                <tr
                  key={item.id}
                  className={isEven ? 'bg-white' : 'bg-slate-50/60'}
                  style={{ borderBottom: '1px solid #f1f5f9' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      {imageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageSrc}
                          alt=""
                          className="h-10 w-10 rounded-md border object-cover"
                        />
                      ) : null}
                      <div>
                        <p className="font-semibold">{name || description || 'Item'}</p>
                        {description && name && (
                          <p className="text-xs text-slate-500">{description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{Number(item.quantity)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatCurrency(Number(item.unitPrice), currency)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums">
                    {formatCurrency(Number(item.amount), currency)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatCurrency(Number(item.unitCost ?? 0), currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-orange-700">
                    {formatCurrency(Number(item.costAmount ?? 0), currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-5 py-4 text-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: RED }}>
              Shipping
            </p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Customer shipping</span>
                <span className="font-medium">{formatCurrency(customerShipping, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Actual shipping cost</span>
                <span className="font-medium text-orange-700">
                  {formatCurrency(shippingCost, currency)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Shipping profit</span>
                <span className={shippingProfit >= 0 ? 'text-green-700' : 'text-red-600'}>
                  {formatCurrency(shippingProfit, currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white px-5 py-4 text-sm shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: RED }}>
              Summary
            </p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Invoice revenue</span>
                <span className="font-medium">{formatCurrency(revenue, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Item costs</span>
                <span className="font-medium text-orange-700">
                  {formatCurrency(itemsCost, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Shipping cost</span>
                <span className="font-medium text-orange-700">
                  {formatCurrency(shippingCost, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total expenses</span>
                <span className="font-medium text-orange-700">
                  {formatCurrency(totalCost, currency)}
                </span>
              </div>
              <div
                className="flex justify-between border-t-2 pt-3 text-base font-bold"
                style={{ borderColor: RED }}
              >
                <span>Profit</span>
                <span className={profit >= 0 ? 'text-green-700' : 'text-red-600'}>
                  {formatCurrency(profit, currency)}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({marginPercent.toFixed(1)}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .expense-print {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

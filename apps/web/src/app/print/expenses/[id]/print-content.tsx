'use client';

import Link from 'next/link';
import { use, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ORG_STORAGE_KEY, useOrganizationId } from '@/hooks/use-organization';
import { formatCurrency } from '@/lib/utils';
import { PrintPageToolbar } from '@/components/print/print-page-toolbar';
import { ExpensePrintView } from '@/components/print/expense-print-view';

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

  const profit = Number(
    expense.profit ??
      Number(expense.revenue ?? expense.total) - Number(expense.totalCost ?? 0),
  );
  const expenseFilename = `expense-${expense.number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  const whatsappMessage = `Expense report for invoice ${expense.number} — profit ${formatCurrency(profit, expense.currency)}.`;

  return (
    <>
      {!embed && (
        <PrintPageToolbar
          backHref="/expenses"
          backLabel="Back to expenses"
          captureElementId="expense-capture-root"
          filename={expenseFilename}
          whatsappMessage={whatsappMessage}
          emailSubject={`Expense report ${expense.number}`}
          emailBody={whatsappMessage}
        />
      )}

      <ExpensePrintView expense={expense} />

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
    </>
  );
}

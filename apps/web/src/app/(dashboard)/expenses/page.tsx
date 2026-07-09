'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useOrganizationId } from '@/hooks/use-organization';
import { Card, CardContent } from '@/components/ui/card';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function ExpensesPage() {
  const { data: session } = useSession();
  const { organizationId, isReady } = useOrganizationId();

  const { data, isLoading, error } = useQuery({
    queryKey: ['expenses', organizationId],
    queryFn: () => api.expenses.list(session!.accessToken!, organizationId!, { limit: 50 }),
    enabled: !!session?.accessToken && !!organizationId,
  });

  const expenses = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground">
          Record what you paid for each invoice and see profit per sale
        </p>
      </div>

      <Card className="border-orange-200 bg-orange-50/50 lg:hidden">
        <CardContent className="py-4 text-sm text-orange-950">
          <p className="font-medium">On phone: tap an invoice below</p>
          <p className="mt-1 text-orange-900/80">
            Enter purchase costs and actual shipping, then save. Open <strong>All Expenses</strong> from
            the home screen anytime.
          </p>
        </CardContent>
      </Card>

      {isReady && !organizationId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No organization selected</p>
            <Link href="/onboarding" className="text-primary hover:underline text-sm">
              Create your organization →
            </Link>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-6 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load expenses'}
          </CardContent>
        </Card>
      )}

      {isLoading && organizationId && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && organizationId && expenses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No invoices yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create an invoice first, then come here to enter purchase costs
            </p>
            <Link
              href="/invoices/new"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create invoice
            </Link>
          </CardContent>
        </Card>
      )}

      {expenses.length > 0 && (
        <div className="space-y-3">
          {expenses.map((row) => (
            <Link key={row.id} href={`/expenses/${row.id}`}>
              <Card className="transition-colors hover:bg-accent/30">
                <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{row.number}</span>
                      <InvoiceStatusBadge status={row.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {row.customer?.name ?? 'Unknown customer'} · {formatDate(row.issueDate)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm sm:gap-8">
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-semibold">{formatCurrency(row.revenue, row.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> Expense
                      </p>
                      <p className="font-semibold text-orange-700">
                        {formatCurrency(row.totalCost, row.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Profit
                      </p>
                      <p
                        className={`font-semibold ${row.profit >= 0 ? 'text-green-700' : 'text-destructive'}`}
                      >
                        {formatCurrency(row.profit, row.currency)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

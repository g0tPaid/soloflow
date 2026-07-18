'use client';

import Link from 'next/link';
import { use } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { Card, CardContent } from '@/components/ui/card';
import type { UpdateExpenseCostsInput } from '@flowbooks/shared';

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const { organizationId, organization, isReady } = useOrganizationId();
  const queryClient = useQueryClient();

  const { data: expense, isLoading, error } = useQuery({
    queryKey: ['expense', id, organizationId],
    queryFn: () => api.expenses.get(session!.accessToken!, organizationId!, id),
    enabled: !!session?.accessToken && !!organizationId,
  });

  async function handleSave(data: UpdateExpenseCostsInput) {
    await api.expenses.updateCosts(session!.accessToken!, organizationId!, id, data);
    await queryClient.invalidateQueries({ queryKey: ['expense', id, organizationId] });
    await queryClient.invalidateQueries({ queryKey: ['expenses', organizationId] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', organizationId] });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {expense ? `Expenses · ${expense.number}` : 'Invoice expenses'}
        </h1>
        <p className="text-muted-foreground">
          Enter purchase costs in{' '}
          {(organization?.settings?.costCurrency || 'CNY').toUpperCase()} against this invoice
        </p>
      </div>

      {isReady && !organizationId && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
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
            {error instanceof Error ? error.message : 'Failed to load expense'}
          </CardContent>
        </Card>
      )}

      {isLoading && organizationId && (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      )}

      {expense && organizationId && (
        <ExpenseForm
          expense={expense}
          organizationId={organizationId}
          costCurrency={organization?.settings?.costCurrency}
          fxRates={organization?.settings?.fxRates}
          fxEnabled={organization?.settings?.fxEnabled !== false}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}

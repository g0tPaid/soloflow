'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { AddExpenseForm } from '@/components/expenses/add-expense-form';
import { Card, CardContent } from '@/components/ui/card';
import type { CreateExpenseInput } from '@flowbooks/shared';

export default function NewExpensePage() {
  const { data: session } = useSession();
  const { organizationId, organization, businessCurrency, isReady } = useOrganizationId();
  const queryClient = useQueryClient();

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', organizationId],
    queryFn: () => api.customers.list(session!.accessToken!, organizationId!, { limit: 100 }),
    enabled: !!session?.accessToken && !!organizationId,
  });

  const customers = customersData?.data ?? [];

  async function handleCreate(data: CreateExpenseInput) {
    const created = await api.expenses.create(session!.accessToken!, organizationId!, data);
    await queryClient.invalidateQueries({ queryKey: ['expenses', organizationId] });
    await queryClient.invalidateQueries({ queryKey: ['invoices', organizationId] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', organizationId] });
    return created;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add expense</h1>
        <p className="text-muted-foreground">
          Enter a past invoice from outside this app, including sale prices and what you paid
        </p>
      </div>

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

      {isLoading && organizationId && (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      )}

      {!isLoading && organizationId && customers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-medium">No customers found</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add a customer before recording a past invoice expense
            </p>
            <Link
              href="/customers/new"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Add customer
            </Link>
          </CardContent>
        </Card>
      )}

      {!isLoading && organizationId && customers.length > 0 && (
        <AddExpenseForm
          customers={customers}
          defaultCurrency={businessCurrency}
          costCurrency={organization?.settings?.costCurrency}
          fxRates={organization?.settings?.fxRates}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}

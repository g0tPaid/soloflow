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
  const { data: session, status } = useSession();
  const { organizationId, organization, businessCurrency, isReady } = useOrganizationId();
  const queryClient = useQueryClient();

  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ['vendors', organizationId],
    queryFn: () => api.vendors.list(session!.accessToken!, organizationId!, { limit: 100 }),
    enabled: !!session?.accessToken && !!organizationId,
  });

  const vendors = vendorsData?.data ?? [];

  async function handleCreate(data: CreateExpenseInput) {
    const token = session?.accessToken;
    if (!token || !organizationId) {
      throw new Error('Session expired or not signed in. Please sign out and sign in again, then retry.');
    }
    const payload = JSON.parse(JSON.stringify(data, (_, value) => (value === null ? undefined : value))) as CreateExpenseInput;
    const created = await api.expenses.create(token, organizationId, payload);
    await queryClient.invalidateQueries({ queryKey: ['expenses', organizationId] });
    await queryClient.invalidateQueries({ queryKey: ['invoices', organizationId] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', organizationId] });
    return created;
  }

  if (status === 'authenticated' && !session?.accessToken) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-medium">Your session expired</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Sign in again to add expenses.
            </p>
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
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

      {!isLoading && organizationId && vendors.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-medium">No vendors found</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add a vendor before recording a past invoice expense
            </p>
            <Link
              href="/vendors/new"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Add vendor
            </Link>
          </CardContent>
        </Card>
      )}

      {!isLoading && organizationId && vendors.length > 0 && (
        <AddExpenseForm
          vendors={vendors}
          defaultCurrency={businessCurrency}
          costCurrency={organization?.settings?.costCurrency}
          fxRates={organization?.settings?.fxRates}
          fxEnabled={organization?.settings?.fxEnabled !== false}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}

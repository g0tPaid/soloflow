'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { loadCustomers, loadProducts } from '@/lib/offline/catalog';
import { offlineQueryOptions } from '@/lib/offline/network';
import { QuoteForm } from '@/components/quotes/quote-form';
import { Card, CardContent } from '@/components/ui/card';
import type { CreateQuoteInput } from '@flowbooks/shared';

export default function NewQuotePage() {
  const { data: session } = useSession();
  const { organizationId, businessCurrency, isReady } = useOrganizationId();

  const { data: customersData, isLoading: customersLoading, isError: customersError, error: customersLoadError } =
    useQuery({
      queryKey: ['customers', organizationId],
      queryFn: () => loadCustomers({ token: session!.accessToken!, organizationId: organizationId! }),
      enabled: !!session?.accessToken && !!organizationId,
      ...offlineQueryOptions,
    });

  const { data: productsData, isLoading: productsLoading, isError: productsError } = useQuery({
    queryKey: ['products', organizationId],
    queryFn: () => loadProducts({ token: session!.accessToken!, organizationId: organizationId! }),
    enabled: !!session?.accessToken && !!organizationId,
    ...offlineQueryOptions,
  });

  const { data: nextNumberData } = useQuery({
    queryKey: ['quote-next-number', organizationId],
    queryFn: () => api.quotes.nextNumber(session!.accessToken!, organizationId!),
    enabled: !!session?.accessToken && !!organizationId,
  });

  const customers = customersData?.data ?? [];
  const products = productsData?.data ?? [];
  const isLoading = customersLoading || productsLoading;

  async function handleCreate(data: CreateQuoteInput) {
    return api.quotes.create(session!.accessToken!, organizationId!, data);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New quote</h1>
        <p className="text-muted-foreground">Fill in the details below</p>
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

      {(customersError || productsError) && (
        <p className="text-sm text-destructive">
          {customersLoadError instanceof Error
            ? customersLoadError.message
            : 'Could not load customers or products. You can still open an unsaved draft and discard it.'}
        </p>
      )}

      {isLoading && organizationId && (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      )}

      {!isLoading && organizationId && customers.length === 0 && !customersError && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-medium">No customers found</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add a customer before creating a quote
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

      {!isLoading && organizationId && (
        <QuoteForm
          mode="create"
          customers={customers}
          products={products}
          defaultCurrency={businessCurrency}
          suggestedNumber={nextNumberData?.number}
          draftIdentity={
            session?.user?.id && organizationId
              ? { userId: session.user.id, organizationId }
              : null
          }
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}

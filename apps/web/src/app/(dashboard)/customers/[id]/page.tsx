'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { CustomerView } from '@/components/customers/customer-view';

export default function CustomerViewPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session, status } = useSession();
  const { organizationId, isReady } = useOrganizationId();

  const token = session?.accessToken;
  const canFetch = status === 'authenticated' && !!token && !!organizationId;

  const customerQuery = useQuery({
    queryKey: ['customer', organizationId, id],
    queryFn: () => api.customers.get(token!, organizationId!, id),
    enabled: canFetch,
  });

  const invoicesQuery = useQuery({
    queryKey: ['invoices', organizationId, 'customer', id],
    queryFn: () =>
      api.invoices.list(token!, organizationId!, { customerId: id, limit: 20 }),
    enabled: canFetch,
  });

  if (status === 'loading' || !isReady || customerQuery.isLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Please sign in again.</p>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Go to login →
        </Link>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Set up your business first.</p>
        <Link href="/onboarding" className="text-sm text-primary hover:underline">
          Create your organization →
        </Link>
      </div>
    );
  }

  if (customerQuery.isError || !customerQuery.data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <p className="text-destructive">
          {customerQuery.error instanceof Error ? customerQuery.error.message : 'Could not load customer'}
        </p>
        <Link href="/customers" className="text-sm text-primary hover:underline">
          Back to customers →
        </Link>
      </div>
    );
  }

  return (
    <CustomerView
      customer={customerQuery.data}
      invoices={invoicesQuery.data?.data ?? []}
      invoicesLoading={invoicesQuery.isLoading}
      invoicesError={
        invoicesQuery.isError
          ? invoicesQuery.error instanceof Error
            ? invoicesQuery.error.message
            : 'Could not load invoices'
          : null
      }
      invoiceTotal={invoicesQuery.data?.pagination.total}
    />
  );
}

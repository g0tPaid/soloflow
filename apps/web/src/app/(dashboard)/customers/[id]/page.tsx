'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type CreateCustomerInput } from '@flowbooks/shared';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { CustomerForm } from '@/components/customers/customer-form';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const { organizationId, businessCurrency, isReady } = useOrganizationId();

  const token = session?.accessToken;
  const canFetch = status === 'authenticated' && !!token && !!organizationId;

  const { data: customer, isLoading, isError, error } = useQuery({
    queryKey: ['customer', organizationId, id],
    queryFn: () => api.customers.get(token!, organizationId!, id),
    enabled: canFetch,
  });

  const mutation = useMutation({
    mutationFn: (data: CreateCustomerInput) =>
      api.customers.update(token!, organizationId!, id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers', organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['customer', organizationId, id] });
      router.push('/customers');
    },
  });

  if (status === 'loading' || !isReady || isLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center py-12">
        <p className="text-muted-foreground">Please sign in again.</p>
        <Link href="/login" className="text-primary hover:underline text-sm">
          Go to login →
        </Link>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center py-12">
        <p className="text-muted-foreground">Set up your business first.</p>
        <Link href="/onboarding" className="text-primary hover:underline text-sm">
          Create your organization →
        </Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center py-12">
        <p className="text-destructive">
          {error instanceof Error ? error.message : 'Could not load customer'}
        </p>
        <Link href="/customers" className="text-primary hover:underline text-sm">
          Back to customers →
        </Link>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit customer</h1>
        <p className="text-muted-foreground">{customer.name}</p>
      </div>

      <CustomerForm
        customer={customer}
        businessCurrency={businessCurrency}
        loading={mutation.isPending}
        errorMessage={mutation.isError && mutation.error instanceof Error ? mutation.error.message : null}
        onSubmit={(data) => mutation.mutate(data)}
      />
    </div>
  );
}

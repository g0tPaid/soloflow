'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type CreateCustomerInput } from '@flowbooks/shared';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { CustomerForm } from '@/components/customers/customer-form';

export default function NewCustomerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const { organizationId, businessCurrency, isReady } = useOrganizationId();

  const mutation = useMutation({
    mutationFn: (data: CreateCustomerInput) =>
      api.customers.create(session!.accessToken!, organizationId!, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers', organizationId] });
      router.push('/customers');
    },
  });

  if (status === 'loading' || !isReady) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }

  if (!session?.accessToken) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center py-12">
        <p className="text-muted-foreground">Please sign in again to add customers.</p>
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New customer</h1>
        <p className="text-muted-foreground">Add someone you bill or quote</p>
      </div>

      <CustomerForm
        businessCurrency={businessCurrency}
        loading={mutation.isPending}
        errorMessage={mutation.isError && mutation.error instanceof Error ? mutation.error.message : null}
        onSubmit={(data) => mutation.mutate(data)}
      />
    </div>
  );
}

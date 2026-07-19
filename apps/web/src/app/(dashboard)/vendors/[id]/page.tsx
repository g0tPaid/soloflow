'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type CreateVendorInput } from '@flowbooks/shared';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { VendorForm } from '@/components/vendors/vendor-form';

export default function EditVendorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const { organizationId, businessCurrency, isReady } = useOrganizationId();

  const token = session?.accessToken;
  const canFetch = status === 'authenticated' && !!token && !!organizationId;

  const { data: vendor, isLoading, isError, error } = useQuery({
    queryKey: ['vendor', organizationId, id],
    queryFn: () => api.vendors.get(token!, organizationId!, id),
    enabled: canFetch,
  });

  const mutation = useMutation({
    mutationFn: (data: CreateVendorInput) =>
      api.vendors.update(token!, organizationId!, id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vendors', organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['vendor', organizationId, id] });
      router.push('/vendors');
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
          {error instanceof Error ? error.message : 'Could not load vendor'}
        </p>
        <Link href="/vendors" className="text-primary hover:underline text-sm">
          Back to vendors →
        </Link>
      </div>
    );
  }

  if (!vendor) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit vendor</h1>
        <p className="text-muted-foreground">{vendor.name}</p>
      </div>

      <VendorForm
        vendor={vendor}
        businessCurrency={businessCurrency}
        loading={mutation.isPending}
        errorMessage={mutation.isError && mutation.error instanceof Error ? mutation.error.message : null}
        onSubmit={(data) => mutation.mutate(data)}
      />
    </div>
  );
}

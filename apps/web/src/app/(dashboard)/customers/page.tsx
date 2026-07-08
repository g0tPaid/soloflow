'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CustomersPage() {
  const { data: session, status } = useSession();
  const { organizationId, isReady, error: orgError } = useOrganizationId();

  const token = session?.accessToken;
  const canFetch = status === 'authenticated' && !!token && !!organizationId;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customers', organizationId],
    queryFn: () => api.customers.list(token!, organizationId!, { limit: 100 }),
    enabled: canFetch,
  });

  const customers = data?.data ?? [];

  if (status === 'loading' || !isReady) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }

  if (status === 'unauthenticated' || !token) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Session expired. Please sign in again.</p>
          <Link href="/login" className="text-primary hover:underline text-sm">
            Go to login →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">People and companies you invoice</p>
        </div>
        {organizationId && (
          <Button asChild>
            <Link href="/customers/new">
              <Plus className="h-4 w-4 mr-2" />
              Add customer
            </Link>
          </Button>
        )}
      </div>

      {!organizationId && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {orgError || 'No business workspace found.'}
            </p>
            <Link href="/onboarding" className="text-primary hover:underline text-sm">
              Set up your business →
            </Link>
          </CardContent>
        </Card>
      )}

      {orgError && organizationId && (
        <p className="text-sm text-amber-600">{orgError}</p>
      )}

      {isLoading && organizationId && (
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      )}

      {isError && organizationId && (
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center">
            <p className="font-medium text-destructive">Could not load customers</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && organizationId && customers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-medium">No customers yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add your first customer, then create an invoice
            </p>
            <Button asChild>
              <Link href="/customers/new">Add customer</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && customers.length > 0 && (
        <div className="rounded-lg border divide-y">
          {customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/customers/${customer.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[customer.email, customer.phone].filter(Boolean).join(' · ') || 'No contact info'}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">Edit →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

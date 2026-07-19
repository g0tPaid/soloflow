'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function VendorsPage() {
  const { data: session, status } = useSession();
  const { organizationId, isReady, error: orgError } = useOrganizationId();

  const token = session?.accessToken;
  const canFetch = status === 'authenticated' && !!token && !!organizationId;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['vendors', organizationId],
    queryFn: () => api.vendors.list(token!, organizationId!, { limit: 100 }),
    enabled: canFetch,
  });

  const vendors = data?.data ?? [];

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
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">Suppliers you buy from for expenses</p>
        </div>
        {organizationId && (
          <Button asChild>
            <Link href="/vendors/new">
              <Plus className="h-4 w-4 mr-2" />
              Add vendor
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
            <p className="font-medium text-destructive">Could not load vendors</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && organizationId && vendors.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-medium">No vendors yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add a vendor, then record expenses against them
            </p>
            <Button asChild>
              <Link href="/vendors/new">Add vendor</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && vendors.length > 0 && (
        <div className="rounded-lg border divide-y">
          {vendors.map((vendor) => (
            <Link
              key={vendor.id}
              href={`/vendors/${vendor.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">{vendor.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[vendor.email, vendor.phone].filter(Boolean).join(' · ') || 'No contact info'}
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

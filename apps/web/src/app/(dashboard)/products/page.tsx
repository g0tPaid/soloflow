'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type CreateProductInput } from '@flowbooks/shared';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { ProductForm } from '@/components/products/product-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

export default function ProductsPage() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const { organizationId, businessCurrency, isReady } = useOrganizationId();

  const token = session?.accessToken;
  const canFetch = status === 'authenticated' && !!token && !!organizationId;

  const { data, isLoading } = useQuery({
    queryKey: ['products', organizationId],
    queryFn: () => api.products.list(token!, organizationId!, { limit: 100 }),
    enabled: canFetch,
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateProductInput) =>
      api.products.create(token!, organizationId!, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products', organizationId] });
    },
  });

  const products = data?.data ?? [];

  if (status === 'loading' || !isReady) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-muted-foreground">Please sign in again.</p>
        <Link href="/login" className="text-primary hover:underline text-sm">
          Go to login →
        </Link>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-muted-foreground">Set up your business first.</p>
        <Link href="/onboarding" className="text-primary hover:underline text-sm">
          Create your organization →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="text-muted-foreground">Manage your product catalog</p>
      </div>

      <ProductForm
        businessCurrency={businessCurrency}
        loading={mutation.isPending}
        errorMessage={
          mutation.isError && mutation.error instanceof Error ? mutation.error.message : null
        }
        onSubmit={(formData) => mutation.mutate(formData)}
      />

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      ) : products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            No products yet. Add your first product above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="font-medium">Your products</h2>
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="flex items-center gap-4 py-4">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="h-14 w-14 rounded-lg border object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                    No photo
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{product.name}</p>
                  {product.description && (
                    <p className="truncate text-sm text-muted-foreground">{product.description}</p>
                  )}
                </div>
                <p className="text-sm font-medium">
                  {formatCurrency(Number(product.unitPrice), product.currency)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button variant="outline" asChild>
        <Link href="/invoices/new">Create invoice with products →</Link>
      </Button>
    </div>
  );
}

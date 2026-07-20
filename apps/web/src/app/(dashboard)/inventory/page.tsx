'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Boxes, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';

export default function InventoryPage() {
  const { data: session, status } = useSession();
  const { organizationId, isReady } = useOrganizationId();
  const queryClient = useQueryClient();
  const token = session?.accessToken;
  const canFetch = status === 'authenticated' && !!token && !!organizationId;

  const [q, setQ] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState('1');
  const [adjustNote, setAdjustNote] = useState('');

  const { data: summary } = useQuery({
    queryKey: ['inventory-summary', organizationId],
    queryFn: () => api.inventory.summary(token!, organizationId!),
    enabled: canFetch,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['inventory', organizationId, q, lowStockOnly],
    queryFn: () =>
      api.inventory.list(token!, organizationId!, {
        limit: 100,
        q: q.trim() || undefined,
        lowStockOnly,
      }),
    enabled: canFetch,
  });

  const adjustMutation = useMutation({
    mutationFn: () => {
      const quantityChange = Number(adjustQty);
      if (!adjustProductId || !Number.isFinite(quantityChange) || quantityChange === 0) {
        return Promise.reject(new Error('Enter a non-zero quantity change'));
      }
      return api.inventory.adjust(token!, organizationId!, adjustProductId, {
        quantityChange,
        note: adjustNote.trim() || undefined,
        type: quantityChange > 0 ? 'RECEIVE' : 'ADJUSTMENT',
      });
    },
    onSuccess: async () => {
      setAdjustProductId(null);
      setAdjustQty('1');
      setAdjustNote('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-summary', organizationId] }),
      ]);
    },
  });

  const items = data?.data ?? [];
  const currency = useMemo(() => items[0]?.currency || 'USD', [items]);

  if (status === 'loading' || !isReady) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }

  if (!token) {
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

  if (!organizationId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">No business workspace found.</p>
          <Link href="/onboarding" className="text-primary hover:underline text-sm">
            Set up your business →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Stock levels, low-stock alerts, and adjustments for tracked products
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/products">
            <Package className="mr-2 h-4 w-4" />
            Manage products
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tracked SKUs</CardDescription>
            <CardTitle className="text-2xl">{summary?.skuCount ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>On hand (units)</CardDescription>
            <CardTitle className="text-2xl">{summary?.onHandUnits ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inventory value</CardDescription>
            <CardTitle className="text-2xl">
              {summary
                ? formatCurrency(summary.inventoryValue, currency)
                : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={cn(summary && summary.lowStockCount > 0 && 'border-amber-300')}>
          <CardHeader className="pb-2">
            <CardDescription>Low / out of stock</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {summary ? summary.lowStockCount + summary.outOfStockCount : '—'}
              {summary && summary.lowStockCount + summary.outOfStockCount > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : null}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock list</CardTitle>
          <CardDescription>
            Marking a customer invoice as Paid automatically reduces stock for linked products.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="inv-q">Search</Label>
              <Input
                id="inv-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name or SKU"
              />
            </div>
            <label className="flex items-center gap-2 text-sm pb-2">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="accent-primary"
              />
              Low stock only
            </label>
          </div>

          {isLoading && <div className="h-40 animate-pulse rounded-lg bg-muted" />}

          {isError && (
            <div className="rounded-lg border border-destructive/40 p-4 text-center">
              <p className="text-destructive font-medium">Could not load inventory</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <Button variant="outline" className="mt-3" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="py-12 text-center">
              <Boxes className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">No products yet.</p>
              <Button asChild className="mt-4">
                <Link href="/products">Add a product</Link>
              </Button>
            </div>
          )}

          {!isLoading && items.length > 0 && (
            <div className="rounded-lg border divide-y">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/inventory/${item.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {item.sku ? `SKU ${item.sku} · ` : ''}
                      {item.trackInventory === false
                        ? 'Tracking off'
                        : item.outOfStock
                          ? 'Out of stock'
                          : item.lowStock
                            ? 'Low stock'
                            : 'In stock'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-right text-sm">
                      <p className="font-semibold tabular-nums">
                        {Number(item.quantityOnHand ?? 0)} on hand
                      </p>
                      <p className="text-muted-foreground">
                        Reorder at {Number(item.reorderLevel ?? 0)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAdjustProductId(item.id);
                        setAdjustQty('1');
                        setAdjustNote('');
                      }}
                      disabled={item.trackInventory === false}
                    >
                      Adjust
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/inventory/${item.id}`}>History</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {adjustProductId && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Adjust stock</CardTitle>
            <CardDescription>
              Use a positive number to receive stock, negative to remove.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="adj-qty">Quantity change</Label>
              <Input
                id="adj-qty"
                type="number"
                step="any"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adj-note">Note (optional)</Label>
              <Input
                id="adj-note"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Received shipment, count correction…"
              />
            </div>
            {adjustMutation.isError && (
              <p className="text-sm text-destructive">
                {adjustMutation.error instanceof Error
                  ? adjustMutation.error.message
                  : 'Adjustment failed'}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => adjustMutation.mutate()}
                disabled={adjustMutation.isPending}
              >
                {adjustMutation.isPending ? 'Saving…' : 'Save adjustment'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setAdjustProductId(null)}
                disabled={adjustMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

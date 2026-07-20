'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

export default function InventoryDetailPage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;
  const { data: session, status } = useSession();
  const { organizationId, isReady } = useOrganizationId();
  const queryClient = useQueryClient();
  const token = session?.accessToken;
  const canFetch = status === 'authenticated' && !!token && !!organizationId && !!productId;

  const [reorderLevel, setReorderLevel] = useState<string | null>(null);
  const [unitCost, setUnitCost] = useState<string | null>(null);
  const [trackInventory, setTrackInventory] = useState<boolean | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['inventory-item', organizationId, productId],
    queryFn: () => api.inventory.get(token!, organizationId!, productId),
    enabled: canFetch,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.inventory.update(token!, organizationId!, productId, {
        trackInventory: trackInventory ?? data?.trackInventory,
        reorderLevel:
          reorderLevel !== null ? Number(reorderLevel) : Number(data?.reorderLevel ?? 0),
        unitCost: unitCost !== null ? Number(unitCost) : Number(data?.unitCost ?? 0),
      }),
    onSuccess: async () => {
      setReorderLevel(null);
      setUnitCost(null);
      setTrackInventory(null);
      await queryClient.invalidateQueries({ queryKey: ['inventory-item', organizationId, productId] });
      await queryClient.invalidateQueries({ queryKey: ['inventory', organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['inventory-summary', organizationId] });
    },
  });

  if (status === 'loading' || !isReady || isLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive font-medium">Could not load product inventory</p>
          <p className="text-sm text-muted-foreground mt-1">
            {error instanceof Error ? error.message : 'Not found'}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/inventory">Back to inventory</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tracking = trackInventory ?? Boolean(data.trackInventory);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/inventory" className="text-sm text-muted-foreground hover:text-foreground">
          ← Inventory
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{data.name}</h1>
        <p className="text-muted-foreground">
          {data.sku ? `SKU ${data.sku} · ` : ''}
          {Number(data.quantityOnHand ?? 0)} on hand ·{' '}
          {formatCurrency(Number(data.inventoryValue ?? 0), data.currency)} value
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Reorder point and cost used for inventory valuation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={tracking}
              onChange={(e) => setTrackInventory(e.target.checked)}
              className="accent-primary"
            />
            Track inventory for this product
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reorder">Reorder level</Label>
              <Input
                id="reorder"
                type="number"
                min={0}
                step="any"
                value={reorderLevel ?? String(data.reorderLevel ?? 0)}
                onChange={(e) => setReorderLevel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Unit cost ({data.currency})</Label>
              <Input
                id="cost"
                type="number"
                min={0}
                step="any"
                value={unitCost ?? String(data.unitCost ?? 0)}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          </div>
          {saveMutation.isError && (
            <p className="text-sm text-destructive">
              {saveMutation.error instanceof Error ? saveMutation.error.message : 'Save failed'}
            </p>
          )}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent movements</CardTitle>
          <CardDescription>Last 50 stock changes for this product.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No movements yet.</p>
          ) : (
            <div className="rounded-lg border divide-y">
              {data.movements.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {m.type} · {m.quantityChange > 0 ? '+' : ''}
                      {m.quantityChange}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString()}
                      {m.note ? ` · ${m.note}` : ''}
                    </p>
                  </div>
                  <p className="tabular-nums text-muted-foreground">After {m.quantityAfter}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

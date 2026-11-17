'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { loadProducts } from '@/lib/offline/catalog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type StockRow = {
  id: string;
  name: string;
  sku: string | null;
  allocated: string;
  shipped: string;
  remaining: string;
};

export function DropshipStock({ customerId, organizationId }: { customerId: string; organizationId: string }) {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const queryClient = useQueryClient();
  const queryKey = ['dropship-stock', organizationId, customerId];
  const path = '/customers/' + customerId + '/dropship-stock';
  const [productId, setProductId] = useState('');
  const [allocated, setAllocated] = useState('');
  const stock = useQuery({
    queryKey,
    enabled: Boolean(token),
    queryFn: () => apiFetch<StockRow[]>(path, { token, organizationId }),
  });
  const products = useQuery({
    queryKey: ['products', organizationId],
    enabled: Boolean(token),
    queryFn: () => loadProducts({ token: token!, organizationId }),
  });
  const save = useMutation({
    mutationFn: () => apiFetch<StockRow[]>(path, {
      token, organizationId, method: 'PUT', body: JSON.stringify({ productId, allocated: Number(allocated) }),
    }),
    onSuccess: (rows) => queryClient.setQueryData(queryKey, rows),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Partner stock</CardTitle>
        <CardDescription>Record the total units allocated to this partner, including any already shipped. Use the same catalog product on shipment invoices.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stock.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th>Product</th><th className="px-2 text-right">Allocated</th><th className="px-2 text-right">Shipped</th><th className="px-2 text-right">Left</th></tr></thead>
              <tbody>{stock.data.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.name}{item.sku ? ' · ' + item.sku : ''}</td>
                  <td className="px-2 text-right">{item.allocated}</td><td className="px-2 text-right">{item.shipped}</td>
                  <td className="px-2 text-right font-semibold">{item.remaining}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted-foreground">{stock.isPending ? 'Loading stock…' : 'No stock allocated yet.'}</p>}
        <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); if (productId && allocated) save.mutate(); }}>
          <label className="grid min-w-40 flex-1 gap-1 text-sm">
            Product
            <select required className="h-9 rounded-md border bg-background px-2" value={productId} onChange={(event) => {
              const value = event.target.value;
              setProductId(value);
              setAllocated(stock.data?.find((row) => row.id === value)?.allocated ?? '');
            }}>
              <option value="">Choose product</option>
              {products.data?.data.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ' · ' + product.sku : ''}</option>)}
            </select>
          </label>
          <label className="grid w-32 gap-1 text-sm">
            Total allocated
            <Input type="number" min={0} max={99999999} step="0.0001" required value={allocated} onChange={(event) => setAllocated(event.target.value)} />
          </label>
          <Button type="submit" disabled={!productId || !allocated || save.isPending}>Save stock</Button>
        </form>
        {save.isSuccess ? <p role="status" className="text-sm text-muted-foreground">Stock saved.</p> : null}
        {stock.error || products.error || save.error ? <p role="alert" className="text-sm text-destructive">{(stock.error ?? products.error ?? save.error)?.message}</p> : null}
      </CardContent>
    </Card>
  );
}

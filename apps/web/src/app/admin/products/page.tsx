'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { adminApi } from '@/lib/admin-api';
import { formatCurrency } from '@/lib/utils';
import { AdminPageHeader, AdminTable } from '@/components/admin/admin-shell';
import { Input } from '@/components/ui/input';

export default function AdminProductsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', search],
    queryFn: () => adminApi.products(session!.accessToken!, { search: search || undefined }),
    enabled: !!session?.accessToken,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Products" description="All products across accounts" />
      <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <AdminTable
          columns={['Product', 'Company', 'Price', 'User']}
          rows={(data?.data ?? []).map((p) => {
            const row = p as { name: string; company: string; price: number; currency: string; user: string };
            return [row.name, row.company, formatCurrency(row.price, row.currency), row.user];
          })}
        />
      )}
    </div>
  );
}

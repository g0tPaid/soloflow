'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { formatCurrency } from '@/lib/utils';
import { AdminPageHeader, AdminTable } from '@/components/admin/admin-shell';
import { Input } from '@/components/ui/input';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function AdminExpensesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-expenses', search],
    queryFn: () => adminApi.expenses(session!.accessToken!, { search: search || undefined }),
    enabled: !!session?.accessToken,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Expenses" description="Invoice cost reports across all users" />
      <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <AdminTable
          columns={['User', 'Category', 'Company', 'Amount', 'Date']}
          rows={(data?.data ?? []).map((e) => [
            e.user,
            e.category,
            e.company,
            formatCurrency(e.amount, e.currency),
            formatDate(e.date),
          ])}
        />
      )}
    </div>
  );
}

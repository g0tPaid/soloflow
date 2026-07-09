'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { formatCurrency } from '@/lib/utils';
import { AdminPageHeader, AdminTable } from '@/components/admin/admin-shell';
import { Input } from '@/components/ui/input';

const STATUSES = ['', 'DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'VOID'];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function AdminInvoicesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-invoices', search, status, userId],
    queryFn: () =>
      adminApi.invoices(session!.accessToken!, {
        search: search || undefined,
        status: status || undefined,
        userId: userId || undefined,
      }),
    enabled: !!session?.accessToken,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Invoices" description="Every invoice across all accounts (view only)" />
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s || 'all'} value={s}>{s || 'All statuses'}</option>
          ))}
        </select>
        <Input placeholder="Filter by user ID" value={userId} onChange={(e) => setUserId(e.target.value)} className="max-w-xs" />
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <AdminTable
          columns={['Invoice #', 'Company', 'Customer', 'Amount', 'Status', 'Date']}
          rows={(data?.data ?? []).map((i) => [
            i.number,
            i.company,
            i.customer,
            formatCurrency(i.amount, i.currency),
            i.status,
            formatDate(i.date),
          ])}
        />
      )}
    </div>
  );
}

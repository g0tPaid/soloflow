'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { adminApi } from '@/lib/admin-api';
import { AdminPageHeader, AdminTable } from '@/components/admin/admin-shell';
import { Input } from '@/components/ui/input';

export default function AdminCustomersPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', search],
    queryFn: () => adminApi.customers(session!.accessToken!, { search: search || undefined }),
    enabled: !!session?.accessToken,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Customers" description="All customers from every account" />
      <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <AdminTable
          columns={['Customer', 'Company', 'User', 'Phone', 'Email']}
          rows={(data?.data ?? []).map((c) => {
            const row = c as { name: string; company: string; user: string; phone: string | null; email: string | null };
            return [row.name, row.company, row.user, row.phone ?? '—', row.email ?? '—'];
          })}
        />
      )}
    </div>
  );
}

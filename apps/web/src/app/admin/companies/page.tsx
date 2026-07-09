'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { adminApi } from '@/lib/admin-api';
import { AdminPageHeader, AdminTable } from '@/components/admin/admin-shell';
import { Input } from '@/components/ui/input';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function AdminCompaniesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-companies', search],
    queryFn: () => adminApi.companies(session!.accessToken!, { search: search || undefined }),
    enabled: !!session?.accessToken,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Companies" description="All registered organizations" />
      <Input placeholder="Search company name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <AdminTable
          columns={['Company', 'Owner', 'Email', 'Created', 'Currency']}
          rows={(data?.data ?? []).map((c) => {
            const row = c as { name: string; owner: string; email: string; createdDate: string; currency: string };
            return [row.name, row.owner, row.email, formatDate(row.createdDate), row.currency];
          })}
        />
      )}
    </div>
  );
}

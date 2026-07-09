'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { adminApi } from '@/lib/admin-api';
import { AdminPageHeader, SimpleBarChart } from '@/components/admin/admin-shell';

export default function AdminAnalyticsPage() {
  const { data: session } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.overview(session!.accessToken!),
    enabled: !!session?.accessToken,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Analytics" description="Simple usage trends for the last 30 days" />
      <div className="grid gap-4 lg:grid-cols-3">
        <SimpleBarChart title="User registrations" data={data.charts.userRegistrations} />
        <SimpleBarChart title="Invoices created" data={data.charts.invoicesCreated} />
        <SimpleBarChart title="Expenses created" data={data.charts.expensesCreated} />
      </div>
    </div>
  );
}

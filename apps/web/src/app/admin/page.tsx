'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { adminApi } from '@/lib/admin-api';
import { formatCurrency } from '@/lib/utils';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminTable,
  SimpleBarChart,
} from '@/components/admin/admin-shell';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.overview(session!.accessToken!),
    enabled: !!session?.accessToken,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  if (error) {
    return <p className="text-sm text-destructive">{error instanceof Error ? error.message : 'Failed to load'}</p>;
  }
  if (!data) return null;

  const { totals, latest, charts } = data;

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Super Admin Dashboard" description="Monitor SoloFlow usage across all accounts" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Total Users" value={totals.users} />
        <AdminStatCard label="New Users Today" value={totals.newUsersToday} />
        <AdminStatCard label="Active Users Today" value={totals.activeUsersToday} />
        <AdminStatCard label="Total Companies" value={totals.companies} />
        <AdminStatCard label="Total Invoices" value={totals.invoices} />
        <AdminStatCard label="Total Expenses" value={totals.expenses} />
        <AdminStatCard label="Total Receipts" value={totals.receipts} />
        <AdminStatCard label="Total Customers" value={totals.customers} />
        <AdminStatCard label="Total Products" value={totals.products} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <SimpleBarChart title="User registrations (30 days)" data={charts.userRegistrations} />
        <SimpleBarChart title="Invoices created (30 days)" data={charts.invoicesCreated} />
        <SimpleBarChart title="Expenses created (30 days)" data={charts.expensesCreated} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-medium">Latest Signups</h2>
          <AdminTable
            columns={['Name', 'Email', 'Company', 'Joined']}
            rows={latest.signups.map((u) => [
              <Link key={u.id} href={`/admin/users/${u.id}`} className="text-primary hover:underline">
                {u.name ?? '—'}
              </Link>,
              u.email,
              u.company,
              formatDate(u.createdAt),
            ])}
          />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-medium">Latest Invoices</h2>
          <AdminTable
            columns={['Number', 'Company', 'Amount', 'Status']}
            rows={latest.invoices.map((i) => [
              i.number,
              i.company,
              formatCurrency(i.amount, i.currency),
              i.status,
            ])}
          />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-medium">Latest Expenses</h2>
          <AdminTable
            columns={['Number', 'Company', 'Amount', 'Date']}
            rows={latest.expenses.map((e) => [
              e.number,
              e.company,
              formatCurrency(e.amount, e.currency),
              formatDate(e.date),
            ])}
          />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-medium">Latest Receipts</h2>
          <AdminTable
            columns={['Number', 'Company', 'User', 'Date']}
            rows={latest.receipts.map((r) => [
              r.number,
              r.company,
              r.user,
              formatDate(r.date),
            ])}
          />
        </section>
      </div>
    </div>
  );
}

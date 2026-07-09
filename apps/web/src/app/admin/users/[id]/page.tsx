'use client';

import Link from 'next/link';
import { use } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { adminApi } from '@/lib/admin-api';
import { formatCurrency } from '@/lib/utils';
import { AdminPageHeader, AdminStatCard, AdminTable } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function AdminUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => adminApi.user(session!.accessToken!, id),
    enabled: !!session?.accessToken,
  });

  const action = useMutation({
    mutationFn: async (type: 'suspend' | 'activate' | 'delete') => {
      if (type === 'suspend') return adminApi.suspendUser(session!.accessToken!, id);
      if (type === 'activate') return adminApi.activateUser(session!.accessToken!, id);
      return adminApi.deleteUser(session!.accessToken!, id);
    },
    onSuccess: async (_, type) => {
      if (type === 'delete') {
        window.location.href = '/admin/users';
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  if (error) return <p className="text-sm text-destructive">{error instanceof Error ? error.message : 'Error'}</p>;
  if (!data) return null;

  const profile = data as {
    user: { name: string | null; email: string; status: string; createdAt: string; lastActive: string; isSuperAdmin: boolean };
    company: { name: string; address: string | null; phone: string | null; email: string | null; currency: string } | null;
    statistics: {
      customers: number; products: number; invoices: number; expenses: number; receipts: number;
      revenue: number; totalInvoiceAmount: number; totalExpenseAmount: number; outstandingAmount: number; profit: number;
    };
    recent: {
      invoices: { number: string; company: string; amount: number; currency: string; status: string }[];
      expenses: { number: string; company: string; amount: number; currency: string }[];
      receipts: { number: string; company: string }[];
      customers: { name: string; company: string }[];
      products: { name: string; company: string; price: number; currency: string }[];
    };
  };

  const currency = profile.company?.currency ?? 'USD';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          title={profile.user.name ?? profile.user.email}
          description={`Joined ${formatDate(profile.user.createdAt)} · Last active ${formatDate(profile.user.lastActive)}`}
        />
        <div className="flex flex-wrap gap-2">
          {profile.user.status === 'active' ? (
            <Button variant="secondary" disabled={profile.user.isSuperAdmin || action.isPending} onClick={() => action.mutate('suspend')}>
              Suspend
            </Button>
          ) : (
            <Button variant="secondary" disabled={action.isPending} onClick={() => action.mutate('activate')}>
              Activate
            </Button>
          )}
          <Button variant="destructive" disabled={profile.user.isSuperAdmin || action.isPending} onClick={() => action.mutate('delete')}>
            Delete
          </Button>
        </div>
      </div>

      {profile.company ? (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium">Company</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Name</dt><dd>{profile.company.name}</dd></div>
            <div><dt className="text-muted-foreground">Currency</dt><dd>{profile.company.currency}</dd></div>
            <div><dt className="text-muted-foreground">Phone</dt><dd>{profile.company.phone ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">Email</dt><dd>{profile.company.email ?? '—'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-muted-foreground">Address</dt><dd>{profile.company.address ?? '—'}</dd></div>
          </dl>
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Customers" value={profile.statistics.customers} />
        <AdminStatCard label="Products" value={profile.statistics.products} />
        <AdminStatCard label="Invoices" value={profile.statistics.invoices} />
        <AdminStatCard label="Receipts" value={profile.statistics.receipts} />
        <AdminStatCard label="Revenue" value={formatCurrency(profile.statistics.revenue, currency)} />
        <AdminStatCard label="Total Invoice Amount" value={formatCurrency(profile.statistics.totalInvoiceAmount, currency)} />
        <AdminStatCard label="Total Expense Amount" value={formatCurrency(profile.statistics.totalExpenseAmount, currency)} />
        <AdminStatCard label="Outstanding" value={formatCurrency(profile.statistics.outstandingAmount, currency)} />
        <AdminStatCard label="Profit" value={formatCurrency(profile.statistics.profit, currency)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-medium">Latest Invoices</h2>
          <AdminTable columns={['Number', 'Company', 'Amount', 'Status']} rows={profile.recent.invoices.map((i) => [i.number, i.company, formatCurrency(i.amount, i.currency), i.status])} />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-medium">Latest Expenses</h2>
          <AdminTable columns={['Number', 'Company', 'Amount']} rows={profile.recent.expenses.map((e) => [e.number, e.company, formatCurrency(e.amount, e.currency)])} />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-medium">Latest Receipts</h2>
          <AdminTable columns={['Number', 'Company']} rows={profile.recent.receipts.map((r) => [r.number, r.company])} />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-medium">Latest Customers</h2>
          <AdminTable columns={['Name', 'Company']} rows={profile.recent.customers.map((c) => [c.name, c.company])} />
        </section>
        <section className="xl:col-span-2">
          <h2 className="mb-3 text-sm font-medium">Latest Products</h2>
          <AdminTable columns={['Name', 'Company', 'Price']} rows={profile.recent.products.map((p) => [p.name, p.company, formatCurrency(p.price, p.currency)])} />
        </section>
      </div>

      <Button variant="outline" asChild>
        <Link href="/admin/users">← Back to users</Link>
      </Button>
    </div>
  );
}

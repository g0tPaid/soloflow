'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { adminApi } from '@/lib/admin-api';
import { AdminPageHeader } from '@/components/admin/admin-shell';
import { Input } from '@/components/ui/input';

export default function AdminSearchPage() {
  const { data: session } = useSession();
  const [query, setQuery] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['admin-search', query],
    queryFn: () => adminApi.search(session!.accessToken!, query),
    enabled: !!session?.accessToken && query.trim().length > 1,
  });

  const sections = [
    { key: 'users', label: 'Users' },
    { key: 'companies', label: 'Companies' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'customers', label: 'Customers' },
    { key: 'products', label: 'Products' },
  ] as const;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Global Search" description="Search users, companies, invoices, and more" />
      <Input
        placeholder="Type to search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-lg"
        autoFocus
      />
      {isFetching ? <p className="text-sm text-muted-foreground">Searching…</p> : null}
      {data && query.trim().length > 1 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {sections.map((section) => {
            const items = data[section.key];
            return (
              <section key={section.key} className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-sm font-medium">{section.label}</h2>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No matches</p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item.id}>
                        <Link href={item.href} className="block rounded-lg px-2 py-2 hover:bg-accent">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.sub}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { adminApi } from '@/lib/admin-api';
import { AdminPageHeader, AdminTable } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => adminApi.users(session!.accessToken!, { search: search || undefined }),
    enabled: !!session?.accessToken,
  });

  const action = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'suspend' | 'activate' | 'delete' }) => {
      if (type === 'suspend') return adminApi.suspendUser(session!.accessToken!, id);
      if (type === 'activate') return adminApi.activateUser(session!.accessToken!, id);
      return adminApi.deleteUser(session!.accessToken!, id);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Users" description="All registered SoloFlow users" />
      <Input
        placeholder="Search name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : (
        <AdminTable
          columns={['Name', 'Email', 'Company', 'Joined', 'Last Active', 'Status', 'Actions']}
          rows={(data?.data ?? []).map((u) => [
            <Link key={u.id} href={`/admin/users/${u.id}`} className="text-primary hover:underline">
              {u.name}
            </Link>,
            u.email,
            u.company,
            formatDate(u.joinedDate),
            formatDate(u.lastActive),
            <span key={`${u.id}-status`} className={u.status === 'suspended' ? 'text-destructive' : 'text-emerald-500'}>
              {u.status}
            </span>,
            <div key={`${u.id}-actions`} className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/admin/users/${u.id}`}>View</Link>
              </Button>
              {u.status === 'active' ? (
                <Button size="sm" variant="secondary" disabled={action.isPending || u.isSuperAdmin} onClick={() => action.mutate({ id: u.id, type: 'suspend' })}>
                  Suspend
                </Button>
              ) : (
                <Button size="sm" variant="secondary" disabled={action.isPending} onClick={() => action.mutate({ id: u.id, type: 'activate' })}>
                  Activate
                </Button>
              )}
              <Button size="sm" variant="destructive" disabled={action.isPending || u.isSuperAdmin} onClick={() => action.mutate({ id: u.id, type: 'delete' })}>
                Delete
              </Button>
            </div>,
          ])}
        />
      )}
    </div>
  );
}

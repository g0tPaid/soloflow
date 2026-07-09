'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { adminApi } from '@/lib/admin-api';
import { AdminPageHeader, AdminTable } from '@/components/admin/admin-shell';
import { Input } from '@/components/ui/input';
import { resolveImageSrc } from '@/lib/organization-branding';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function AdminReceiptsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [preview, setPreview] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-receipts', search],
    queryFn: () => adminApi.receipts(session!.accessToken!, { search: search || undefined }),
    enabled: !!session?.accessToken,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Receipts" description="Paid invoices shown as receipts (view only)" />
      <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <AdminTable
          columns={['Receipt', 'User', 'Company', 'Date', 'OCR']}
          rows={(data?.data ?? []).map((r) => {
            const src = resolveImageSrc(r.imageUrl);
            return [
              src ? (
                <button key={r.id} type="button" onClick={() => setPreview(src)} className="block">
                  <img src={src} alt={r.number} className="h-12 w-12 rounded-lg border object-cover" />
                </button>
              ) : (
                <span key={r.id} className="text-muted-foreground">—</span>
              ),
              r.user,
              r.company,
              formatDate(r.date),
              'Not available',
            ];
          })}
        />
      )}

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
          <img src={preview} alt="Receipt preview" className="max-h-[90vh] max-w-full rounded-lg" />
        </div>
      ) : null}
    </div>
  );
}

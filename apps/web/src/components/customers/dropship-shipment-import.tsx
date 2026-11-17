'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DropshipShipmentImport({ customerId, organizationId }: { customerId: string; organizationId: string }) {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  async function upload() {
    if (!file || busy || !session?.accessToken) return;
    if (file.size > 1_000_000) {
      setStatus('Choose a CSV up to 1 MB.');
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      const result = await apiFetch<{ added: number; rows: number; total: number }>('/customers/' + customerId + '/dropship-shipment-import', {
        token: session.accessToken, organizationId, method: 'POST',
        body: JSON.stringify({ csv: await file.text() }),
      });
      setStatus('Imported ' + result.added + ' new shipments from ' + result.rows + ' rows. ' + result.total + ' shipments in history.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not import shipments.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import shipment history</CardTitle>
        <CardDescription>Upload a Sourcing Center shipment export for this dropshipper. Existing order and tracking pairs are updated in place.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept=".csv,text/csv" aria-label="Shipment CSV" disabled={busy} onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setStatus('');
          }} />
          <Button type="button" disabled={!file || busy || !session?.accessToken} onClick={() => void upload()}>
            {busy ? 'Importing…' : 'Import shipments'}
          </Button>
        </div>
        {status ? <p role="status" className="text-sm">{status}</p> : null}
      </CardContent>
    </Card>
  );
}

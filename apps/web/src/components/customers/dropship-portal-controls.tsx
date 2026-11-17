'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function DropshipPortalControls({ customerId, organizationId }: { customerId: string; organizationId: string }) {
  const { data: session } = useSession();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function changeLink(method: 'POST' | 'DELETE') {
    const token = session?.accessToken;
    if (!token || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await apiFetch<{ token?: string }>('/customers/' + customerId + '/dropship-portal', {
        token, organizationId, method,
      });
      setUrl(result.token ? new URL('/api/v1/partner-shipments/' + result.token, window.location.origin).href : '');
      setMessage(result.token ? 'New link created. Any previous link is now disabled.' : 'Private link disabled.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update the private link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dropshipping partner portal</CardTitle>
        <CardDescription>Share this link directly with the partner. Anyone with it can view this partner’s shipped orders.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void changeLink('POST')}>Create or replace link</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void changeLink('DELETE')}>Disable link</Button>
        </div>
        {url ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input aria-label="Private partner link" className="min-w-48 flex-1" readOnly value={url} onFocus={(event) => event.target.select()} />
            <Button type="button" variant="outline" onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setMessage('Link copied.');
              } catch {
                setMessage('Select the link to copy it manually.');
              }
            }}>Copy link</Button>
            <Button variant="outline" asChild><a href={url} target="_blank" rel="noreferrer">Open portal</a></Button>
          </div>
        ) : null}
        <p role="status" className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

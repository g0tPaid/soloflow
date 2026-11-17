'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function DropshipPortalControls({ customerId, organizationId }: { customerId: string; organizationId: string }) {
  const { data: session } = useSession();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = session?.accessToken;
    if (!token) return;
    let active = true;
    void apiFetch<{ token: string | null }>('/customers/' + customerId + '/dropship-portal', {
      token, organizationId,
    }).then((result) => {
      if (active && result.token) setUrl(new URL('/api/v1/partner-shipments/' + result.token, window.location.origin).href);
    }).catch(() => {
      if (active) setMessage('Could not load the private link.');
    });
    return () => { active = false; };
  }, [session?.accessToken, customerId, organizationId]);

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
    <div className="mt-3 space-y-2">
      <p className="text-xs text-muted-foreground">Private shipment and stock link. Anyone with the link can view it.</p>
        {url ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input aria-label="Private partner link" className="min-w-36 flex-1" readOnly value={url} onFocus={(event) => event.target.select()} />
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
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void changeLink('POST')}>{url ? 'Replace link' : 'Create or recover link'}</Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void changeLink('DELETE')}>Disable link</Button>
        </div>
        {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

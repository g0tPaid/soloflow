'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function customerPortalUrl(result: { token?: string | null; shortCode?: string | null }) {
  if (result.shortCode && /^[A-Za-z0-9_-]{22}$/.test(result.shortCode)) return 'https://sourcing.center/c/' + result.shortCode;
  return result.token ? new URL('/api/v1/partner-shipments/' + result.token, window.location.origin).href : '';
}

export function DropshipPortalControls({ customerId, organizationId, isDropshipper = false, invoiceMode = false }: { customerId: string; organizationId: string; isDropshipper?: boolean; invoiceMode?: boolean }) {
  const { data: session } = useSession();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = session?.accessToken;
    if (!token) return;
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    setUrl('');
    setMessage('');
    void apiFetch<{ token: string | null; shortCode?: string | null }>('/customers/' + customerId + '/dropship-portal', {
      token, organizationId,
    }).then((result) => {
      if (active) setUrl(customerPortalUrl(result));
    }).catch(() => {
      if (active) { setLoadFailed(true); setMessage('Could not load the private link. Check your permissions or connection.'); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.accessToken, customerId, organizationId]);

  async function changeLink(method: 'POST' | 'DELETE') {
    const token = session?.accessToken;
    if (!token || busy || loading) return;
    if (url && !window.confirm(method === 'POST' ? 'Replace the existing link? The previous link will stop working.' : 'Disable the existing private link?')) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await apiFetch<{ token?: string; shortCode?: string }>('/customers/' + customerId + '/dropship-portal', {
        token, organizationId, method,
      });
      setUrl(customerPortalUrl(result));
      setMessage(result.token ? 'New link created. Any previous link is now disabled.' : 'Private link disabled.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update the private link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="private-order-link" className={invoiceMode ? 'space-y-2 rounded-lg border bg-card p-3' : 'mt-3 scroll-mt-24 space-y-2 rounded-lg border p-3'}>
      <p className="font-semibold text-sm">Private customer order link</p>
      {invoiceMode ? <p className="text-xs text-muted-foreground">Shares this customer's entire private order dashboard, not just this invoice. Share only with this customer.</p> : <p className="text-xs text-muted-foreground">{isDropshipper ? "Shipment and stock history" : "All this customer’s sales invoices and shipping updates"}. Anyone who has the link can view it. Share only with this customer.</p>}
        {loading ? <p role="status" className="text-xs text-muted-foreground">Loading private link…</p> : null}
        {url ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input aria-label="Private customer order link" className="min-w-36 flex-1" readOnly value={url} onFocus={(event) => event.target.select()} />
            <Button type="button" variant="outline" onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setMessage('Link copied.');
              } catch {
                setMessage('Select the link to copy it manually.');
              }
            }}>Copy link</Button>
            <Button variant="outline" asChild><a href={url} target="_blank" rel="noreferrer">Open portal</a></Button>
            <Button asChild className="bg-[#25D366] text-white hover:bg-[#1ebe57] hover:text-white"><a href={'https://wa.me/?text=' + encodeURIComponent('Your private Sourcing Center order dashboard:\n' + url)} target="_blank" rel="noreferrer">Share link on WhatsApp</a></Button>
          </div>
        ) : null}
        {invoiceMode ? (!url && !loading && !loadFailed ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => void changeLink('POST')}>Generate private link</Button>
        ) : null) : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={url ? 'outline' : 'default'} disabled={busy || loading || loadFailed} onClick={() => void changeLink('POST')}>{url ? 'Replace link' : 'Generate private link'}</Button>
            <Button type="button" size="sm" variant="outline" disabled={busy || loading || !url} onClick={() => void changeLink('DELETE')}>Disable link</Button>
          </div>
        )}
        {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

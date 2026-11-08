'use client';

import { useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchServerPdfFile } from '@/lib/fetch-server-pdf';
import { shareInvoiceFile } from '@/lib/share-invoice-file';
import { cn, formatCurrency } from '@/lib/utils';

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, '');
}

export function buildQuoteWhatsAppMessage(quote: {
  number: string;
  total: string | number;
  currency: string;
  validUntil?: string | null;
  customer?: { name?: string | null } | null;
}) {
  const customerName = quote.customer?.name?.trim() || 'there';
  const amount = formatCurrency(Number(quote.total), quote.currency);
  const valid = quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : null;
  return [
    `Hi ${customerName},`,
    '',
    `Please find your quote *${quote.number}* for *${amount}*.`,
    valid ? `Valid until: ${valid}` : null,
    '',
    'Quote attached. Thank you!',
  ]
    .filter(Boolean)
    .join('\n');
}

export function ShareQuoteWhatsAppButton({
  quote,
  quoteId,
  organizationId,
  size = 'default',
  fullWidth,
}: {
  quote: {
    number: string;
    total: string | number;
    currency: string;
    validUntil?: string | null;
    customer?: { name?: string | null; phone?: string | null } | null;
  };
  quoteId: string;
  organizationId?: string;
  size?: 'default' | 'lg' | 'sm';
  fullWidth?: boolean;
}) {
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const phone = quote.customer?.phone?.trim() ? digitsOnly(quote.customer.phone) : '';
  const hasPhone = phone.length >= 8;

  async function handleShare() {
    if (!organizationId || sharing) return;
    setSharing(true);
    setStatus('Preparing quote PDF…');
    try {
      const safeName = quote.number.replace(/[^a-zA-Z0-9-_]/g, '_');
      const file = await fetchServerPdfFile('quotes', quoteId, {
        organizationId,
        filename: `${safeName}.pdf`,
      });
      const message = buildQuoteWhatsAppMessage(quote);
      setStatus('Opening WhatsApp…');
      const result = await shareInvoiceFile(file, message, hasPhone ? phone : undefined, {
        documentLabel: 'Quote',
      });
      if (result === 'shared') setStatus('Pick WhatsApp and send');
      else if (result === 'fallback') setStatus('PDF saved — attach it in WhatsApp');
      else setStatus(null);
    } catch {
      setStatus(null);
      const params = new URLSearchParams({ org: organizationId });
      if (hasPhone) params.set('phone', phone);
      window.location.href = `/print/quotes/${quoteId}?${params.toString()}`;
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
      <Button
        type="button"
        size={size}
        onClick={() => void handleShare()}
        disabled={!organizationId || sharing}
        className={cn(
          'gap-2 bg-[#25D366] text-white hover:bg-[#1ebe57] hover:text-white',
          fullWidth && 'w-full',
        )}
      >
        {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        {sharing ? 'Preparing…' : 'WhatsApp'}
      </Button>
      {status ? <p className="text-[11px] text-muted-foreground sm:text-right">{status}</p> : null}
    </div>
  );
}

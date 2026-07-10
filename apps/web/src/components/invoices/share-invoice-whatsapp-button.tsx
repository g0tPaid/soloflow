'use client';

import { useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { fetchServerPdfFile } from '@/lib/fetch-server-pdf';
import { shareInvoiceFile } from '@/lib/share-invoice-file';

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, '');
}

export function buildWhatsAppMessage(invoice: {
  number: string;
  total: string | number;
  currency: string;
  dueDate?: string | null;
  customer?: { name?: string | null } | null;
}) {
  const customerName = invoice.customer?.name?.trim() || 'there';
  const amount = formatCurrency(Number(invoice.total), invoice.currency);
  const due = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString()
    : null;

  const lines = [
    `Hi ${customerName},`,
    '',
    `Please find your invoice *${invoice.number}* for *${amount}*.`,
    due ? `Due date: ${due}` : null,
    '',
    'Invoice attached. Thank you!',
  ];

  return lines.filter(Boolean).join('\n');
}

export function ShareInvoiceWhatsAppButton({
  invoice,
  invoiceId,
  organizationId,
  size = 'default',
  className,
  fullWidth,
}: {
  invoice: {
    number: string;
    total: string | number;
    currency: string;
    dueDate?: string | null;
    customer?: { name?: string | null; phone?: string | null } | null;
  };
  invoiceId: string;
  organizationId?: string;
  size?: 'default' | 'lg' | 'sm';
  className?: string;
  fullWidth?: boolean;
}) {
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const phone = invoice.customer?.phone?.trim()
    ? digitsOnly(invoice.customer.phone)
    : '';
  const hasPhone = phone.length >= 8;

  async function handleShare() {
    if (!organizationId || sharing) return;

    setSharing(true);
    setStatus('Preparing invoice PDF…');

    try {
      const safeName = invoice.number.replace(/[^a-zA-Z0-9-_]/g, '_');
      const file = await fetchServerPdfFile('invoices', invoiceId, {
        organizationId,
        filename: `${safeName}.pdf`,
      });
      const message = buildWhatsAppMessage(invoice);

      setStatus('Opening WhatsApp…');
      const result = await shareInvoiceFile(file, message, hasPhone ? phone : undefined);

      if (result === 'shared') {
        setStatus('Pick WhatsApp and send');
      } else if (result === 'fallback') {
        setStatus('PDF saved — attach it in WhatsApp');
      } else {
        setStatus(null);
      }
    } catch {
      setStatus(null);
      const params = new URLSearchParams({
        org: organizationId,
        share: 'whatsapp',
      });
      if (hasPhone) params.set('phone', phone);
      window.location.href = `/print/invoices/${invoiceId}?${params.toString()}`;
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
          className,
        )}
      >
        {sharing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageCircle className="h-4 w-4" />
        )}
        {sharing ? 'Preparing…' : 'Share on WhatsApp'}
      </Button>
      <p className="text-[11px] text-muted-foreground sm:text-right">
        {status ??
          (hasPhone
            ? 'Attaches invoice PDF — pick WhatsApp in the share menu'
            : 'Attaches invoice PDF — add customer phone to message them directly')}
      </p>
    </div>
  );
}

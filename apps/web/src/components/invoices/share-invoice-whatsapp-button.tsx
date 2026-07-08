'use client';

import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, '');
}

function buildWhatsAppMessage(invoice: {
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
    'I am attaching the PDF invoice here. Thank you!',
  ];

  return lines.filter(Boolean).join('\n');
}

export function ShareInvoiceWhatsAppButton({
  invoice,
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
  size?: 'default' | 'lg' | 'sm';
  className?: string;
  fullWidth?: boolean;
}) {
  const phone = invoice.customer?.phone?.trim()
    ? digitsOnly(invoice.customer.phone)
    : '';
  const message = buildWhatsAppMessage(invoice);
  const hasPhone = phone.length >= 8;

  function handleShare() {
    const text = encodeURIComponent(message);
    const url = hasPhone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href = url;
    }
  }

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
      <Button
        type="button"
        size={size}
        onClick={handleShare}
        className={cn(
          'gap-2 bg-[#25D366] text-white hover:bg-[#1ebe57] hover:text-white',
          fullWidth && 'w-full',
          className,
        )}
      >
        <MessageCircle className="h-4 w-4" />
        Share on WhatsApp
      </Button>
      <p className="text-[11px] text-muted-foreground sm:text-right">
        {hasPhone
          ? 'Opens WhatsApp with your customer — attach the PDF after download'
          : 'Add a phone number on the customer to message them directly'}
      </p>
    </div>
  );
}

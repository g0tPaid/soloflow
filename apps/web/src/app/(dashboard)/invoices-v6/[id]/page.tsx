import { redirect } from 'next/navigation';
import InvoiceDetailPage from '../../invoices/[id]/page';

/**
 * Invoice 6 is a receipt-first workflow: opening an invoice goes straight to
 * the approved mobile receipt. Editing stays available via ?edit=1.
 */
export default async function InvoiceV6DetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; org?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  if (query.edit === '1') {
    return <InvoiceDetailPage params={params} />;
  }

  const pdfQuery = new URLSearchParams({ version: '6' });
  if (query.org) pdfQuery.set('org', query.org);
  redirect(`/print/invoices/${encodeURIComponent(id)}?${pdfQuery.toString()}`);
}

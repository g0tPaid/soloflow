import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { api } from '@/lib/api';
import { InvoicePrintView } from '@/components/print/invoice-print-view';
import { quoteAsInvoiceForPrint } from '@/lib/quote-print';
import { resolveRequestBaseUrl } from '@/lib/resolve-base-url';

export default async function QuotePdfSourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const session = await auth();
  if (!session?.accessToken) {
    redirect('/login');
  }

  const { id } = await params;
  const { org } = await searchParams;
  if (!org) notFound();

  const [quote, organization] = await Promise.all([
    api.quotes.get(session.accessToken, org, id),
    api.organizations.get(session.accessToken, org),
  ]);

  return (
    <InvoicePrintView
      invoice={quoteAsInvoiceForPrint(quote)}
      org={organization}
      baseUrl={await resolveRequestBaseUrl()}
      documentLabel="QUOTE"
      numberLabel="Quote #"
      dueDateLabel="Valid Until"
    />
  );
}

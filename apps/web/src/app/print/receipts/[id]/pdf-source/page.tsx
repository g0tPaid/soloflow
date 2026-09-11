import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { api } from '@/lib/api';
import { ReceiptPrintView } from '@/components/print/receipt-print-view';
import { resolveRequestBaseUrl } from '@/lib/resolve-base-url';
import { isReceiptEligible } from '@flowbooks/shared';

export default async function ReceiptPdfSourcePage({
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

  const [invoice, organization] = await Promise.all([
    api.invoices.get(session.accessToken, org, id),
    api.organizations.get(session.accessToken, org),
  ]);

  if (!isReceiptEligible(invoice)) notFound();

  return (
    <ReceiptPrintView invoice={invoice} org={organization} baseUrl={await resolveRequestBaseUrl()} />
  );
}

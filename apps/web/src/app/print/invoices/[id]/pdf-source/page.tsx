import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { api } from '@/lib/api';
import { InvoicePrintView } from '@/components/print/invoice-print-view';
import { resolveRequestBaseUrl } from '@/lib/resolve-base-url';

export default async function InvoicePdfSourcePage({
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

  return (
    <InvoicePrintView invoice={invoice} org={organization} baseUrl={await resolveRequestBaseUrl()} />
  );
}

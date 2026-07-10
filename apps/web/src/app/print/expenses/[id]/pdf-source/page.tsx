import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { api } from '@/lib/api';
import { ExpensePrintView } from '@/components/print/expense-print-view';
import { resolveRequestBaseUrl } from '@/lib/resolve-base-url';

export default async function ExpensePdfSourcePage({
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

  const expense = await api.expenses.get(session.accessToken, org, id);

  return <ExpensePrintView expense={expense} baseUrl={await resolveRequestBaseUrl()} />;
}

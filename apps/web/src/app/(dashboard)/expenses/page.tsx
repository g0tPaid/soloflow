'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import { api, type OperatingExpenseCategory, type OperatingExpense } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useOrganizationId } from '@/hooks/use-organization';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CURRENCIES } from '@flowbooks/shared';
import { Label } from '@/components/ui/label';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

const categories = [
  { key: 'INVOICE', label: 'Invoice Customer Costs' },
  { key: 'EMPLOYEE', label: 'Employee compensation & benefits' },
  { key: 'OFFICE', label: 'Premises, Office & Admin' },
  { key: 'MARKETING', label: 'Marketing and Promotion' },
] as const;
type Category = typeof categories[number]['key'];

export default function ExpensesPage() {
  return <Suspense fallback={<p>Loading expenses…</p>}><ExpensesContent /></Suspense>;
}

function ExpensesContent() {
  const { data: session } = useSession();
  const { organizationId, isReady, businessCurrency } = useOrganizationId();
  const params = useSearchParams();
  const initialCategory = categories.find((item) => item.key === params.get('category'))?.key ?? 'INVOICE';
  const [category, setCategory] = useState<Category>(initialCategory);
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [page, setPage] = useState(1);
  useEffect(() => { setCategory(initialCategory); setSearch(params.get('search') ?? ''); setPage(1); }, [params, initialCategory]);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  const invoiceCategory = category === 'INVOICE';
  const operatingCategory = category === 'INVOICE' ? undefined : category;

  const { data, isLoading, error } = useQuery({
    queryKey: ['expenses', organizationId, page, debouncedSearch],
    queryFn: () => api.expenses.list(session!.accessToken!, organizationId!, { limit: 50, page, search: debouncedSearch }),
    enabled: !!session?.accessToken && !!organizationId && invoiceCategory,
  });

  const expenses = data?.data ?? [];
  const operating = useQuery({ queryKey: ['operating-expenses', organizationId, category, page, debouncedSearch], queryFn: () => api.expenses.listOperating(session!.accessToken!, organizationId!, { category: operatingCategory, page, limit: 50, search: debouncedSearch }), enabled: !!session?.accessToken && !!organizationId && !invoiceCategory });
  const pagination = invoiceCategory ? data?.pagination : operating.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Record what you paid for each invoice and see profit per sale
          </p>
        </div>
        {organizationId && invoiceCategory && (
          <Button asChild className="shrink-0">
            <Link href="/expenses/new">
              <Plus className="mr-2 h-4 w-4" />
              Add expense
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {categories.map((item) => <Button key={item.key} type="button" variant={category === item.key ? 'default' : 'outline'} className="h-auto min-h-12 whitespace-normal text-left" onClick={() => { setCategory(item.key); setPage(1); }}>{item.label}</Button>)}
      </div>
      <div className="flex flex-wrap items-center gap-3"><Input aria-label="Filter expenses" placeholder={invoiceCategory ? 'Search invoice number, customer, item or vendor' : 'Search description, payee or reference'} value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-xl" />{search && <Button variant="outline" onClick={() => setSearch('')}>Clear</Button>}</div>
      {!invoiceCategory && organizationId && session?.accessToken && operatingCategory && <OperatingExpenses key={operatingCategory} category={operatingCategory} token={session.accessToken} organizationId={organizationId} currency={businessCurrency} rows={operating.data?.data ?? []} loading={operating.isLoading} error={operating.error} />}
      {invoiceCategory && <><Card className="border-orange-200 bg-orange-50/50 lg:hidden">
        <CardContent className="py-4 text-sm text-orange-950">
          <p className="font-medium">On phone: tap an invoice below, or Add expense</p>
          <p className="mt-1 text-orange-900/80">
            Use <strong>Add expense</strong> for old invoices made outside this app. Or open an
            existing invoice to enter purchase costs.
          </p>
        </CardContent>
      </Card>

      {isReady && !organizationId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No organization selected</p>
            <Link href="/onboarding" className="text-primary hover:underline text-sm">
              Create your organization →
            </Link>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-6 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load expenses'}
          </CardContent>
        </Card>
      )}

      {isLoading && organizationId && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && organizationId && expenses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">{debouncedSearch ? 'No matching invoice costs' : 'No expenses yet'}</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">
              Add a past invoice from outside this app, or create an invoice first and enter costs
              here
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/expenses/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add expense
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/invoices/new">Create invoice</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {expenses.length > 0 && (
        <div className="space-y-3">
          {expenses.map((row) => (
            <Link key={row.id} href={`/expenses/${row.id}`}>
              <Card className="transition-colors hover:bg-accent/30">
                <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{row.number}</span>
                      <InvoiceStatusBadge status={row.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {row.vendor?.name ?? row.customer?.name ?? 'Unknown vendor'} · {formatDate(row.issueDate)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm sm:gap-8">
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-semibold">{formatCurrency(row.revenue, row.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> Expense
                      </p>
                      <p className="font-semibold text-orange-700">
                        {formatCurrency(row.totalCost, row.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Profit
                      </p>
                      <p
                        className={`font-semibold ${row.profit >= 0 ? 'text-green-700' : 'text-destructive'}`}
                      >
                        {formatCurrency(row.profit, row.currency)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}</>}
      {pagination && pagination.totalPages > 1 && <div className="flex items-center justify-between"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span><Button variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div>}
    </div>
  );
}

function OperatingExpenses({ category, token, organizationId, currency, rows, loading, error }: { category: OperatingExpenseCategory; token: string; organizationId: string; currency: string; rows: OperatingExpense[]; loading: boolean; error: unknown }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [payee, setPayee] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryCurrency, setEntryCurrency] = useState(currency || 'USD');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    if (!description.trim() || !date || !Number.isFinite(Number(amount)) || Number(amount) <= 0) { setMessage('Enter a description, date and positive amount.'); return; }
    setBusy(true);
    try {
      await api.expenses.createOperating(token, organizationId, { category, description, payee, reference, notes, expenseDate: date, currency: entryCurrency, amount: Number(amount) });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['operating-expenses', organizationId] }), queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', organizationId] }), queryClient.invalidateQueries({ queryKey: ['workspace-search', organizationId] })]);
      setOpen(false); setDescription(''); setPayee(''); setReference(''); setNotes(''); setAmount('');
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not save expense'); } finally { setBusy(false); }
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">{categories.find((item) => item.key === category)?.label}</h2><Button onClick={() => setOpen(!open)}>{open ? 'Close' : 'Add expense'}</Button></div>
    {open && <Card><CardContent className="p-4"><form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <div><Label htmlFor="operating-description">Description *</Label><Input id="operating-description" value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={200} /></div>
      <div><Label htmlFor="operating-payee">Payee / employee / supplier</Label><Input id="operating-payee" value={payee} onChange={(e) => setPayee(e.target.value)} maxLength={200} /></div>
      <div><Label htmlFor="operating-date">Date *</Label><Input id="operating-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
      <div><Label htmlFor="operating-reference">Reference / receipt number</Label><Input id="operating-reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={200} /></div>
      <div><Label htmlFor="operating-currency">Currency</Label><select id="operating-currency" value={entryCurrency} onChange={(e) => setEntryCurrency(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3">{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}</select></div>
      <div><Label htmlFor="operating-amount">Amount *</Label><Input id="operating-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
      <div className="sm:col-span-2"><Label htmlFor="operating-notes">Notes</Label><Input id="operating-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} /></div>
      {message && <p role="alert" className="sm:col-span-2 text-sm text-destructive">{message}</p>}<Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save expense'}</Button>
    </form></CardContent></Card>}
    {loading ? <p>Loading…</p> : error ? <p className="text-destructive">Could not load expenses.</p> : rows.length === 0 ? <Card><CardContent className="p-6 text-center text-muted-foreground">No expenses found in this category.</CardContent></Card> : rows.map((row) => <Card key={row.id}><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="font-medium">{row.description}</p><p className="text-sm text-muted-foreground">{[formatDate(row.expenseDate), row.payee, row.reference].filter(Boolean).join(' · ')}</p>{row.notes && <p className="text-xs text-muted-foreground">{row.notes}</p>}</div><p className="font-semibold text-orange-700">{formatCurrency(row.amount, row.currency)}</p></CardContent></Card>)}
  </div>;
}

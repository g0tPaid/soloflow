import Link from 'next/link';
import { FilePlus, Pencil } from 'lucide-react';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Customer, Invoice, QuoteStatus } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

function formatAddress(address?: Customer['address'] | null): string {
  if (!address) return '';
  const cityLine = [address.city, address.state, address.postalCode].filter(Boolean).join(', ');
  return [address.line1, address.line2, cityLine, address.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join('\n');
}

function contactRows(customer: Customer): Array<[string, string]> {
  const address = formatAddress(customer.address);
  const rows: Array<[string, string | null | undefined]> = [
    ['Email', customer.email],
    ['Phone', customer.phone],
    ['TRN', customer.taxId],
    ['Currency', customer.currency],
    ['Address', address],
    ['Notes', customer.notes],
  ];
  return rows.flatMap(([label, value]) => {
    const text = value?.trim();
    return text ? [[label, text]] : [];
  });
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

type CustomerQuoteRow = {
  id: string;
  number: string;
  status: QuoteStatus;
  total: string | number;
  currency: string;
  validUntil?: string | null;
  issueDate: string;
};

type BalanceGroup = {
  currency: string;
  balanceDue: number;
  invoiceCount: number;
};

type Props = {
  customer: Customer;
  invoices: Invoice[];
  invoicesLoading?: boolean;
  invoicesError?: string | null;
  invoiceTotal?: number;
  balances?: BalanceGroup[];
  balancesLoading?: boolean;
  balancesError?: string | null;
  quotes?: CustomerQuoteRow[];
  quoteCount?: number;
};

export function CustomerView({
  customer,
  invoices,
  invoicesLoading = false,
  invoicesError = null,
  invoiceTotal,
  balances = [],
  balancesLoading = false,
  balancesError = null,
  quotes = [],
  quoteCount,
}: Props) {
  const rows = contactRows(customer);
  const shownTotal = invoiceTotal ?? invoices.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Customer</p>
          <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Button asChild className="gap-2 bg-[#E40046] text-white hover:bg-[#c4003c]">
            <Link href={`/invoices/new?customer=${customer.id}`}>
              <FilePlus className="h-4 w-4" />
              New invoice
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/customers/${customer.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Balance due</CardTitle>
        </CardHeader>
        <CardContent>
          {balancesLoading ? <div className="h-10 animate-pulse rounded-md bg-muted" /> : null}
          {balancesError ? <p className="text-sm text-destructive">{balancesError}</p> : null}
          {!balancesLoading && !balancesError && balances.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing outstanding. Cancelled, void, and draft invoices are not included.</p>
          ) : null}
          {balances.length > 0 ? (
            <ul className="space-y-2">
              {balances.map((group) => (
                <li key={group.currency} className="flex items-baseline justify-between gap-3">
                  <span className="text-lg font-medium tabular-nums">
                    {formatCurrency(group.balanceDue, group.currency)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {group.invoiceCount} open {group.invoiceCount === 1 ? 'invoice' : 'invoices'}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact details</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contact details yet.</p>
          ) : (
            <dl className="space-y-3">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 whitespace-pre-line text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotes yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {quotes.map((quote) => (
                <li key={quote.id}>
                  <Link
                    href={`/quotes/${quote.id}`}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{quote.number}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(quote.issueDate)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <QuoteStatusBadge status={quote.status} />
                      <span className="text-sm tabular-nums">{formatCurrency(Number(quote.total), quote.currency)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {quoteCount != null && quoteCount > quotes.length ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing the latest {quotes.length} of {quoteCount} quotes.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? <div className="h-16 animate-pulse rounded-md bg-muted" /> : null}
          {invoicesError ? <p className="text-sm text-destructive">{invoicesError}</p> : null}
          {!invoicesLoading && !invoicesError && invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : null}
          {invoices.length > 0 ? (
            <ul className="divide-y rounded-lg border">
              {invoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    aria-label={invoice.number}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{invoice.number}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(invoice.issueDate)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <InvoiceStatusBadge status={invoice.status} />
                      <span className="text-sm tabular-nums">
                        {formatCurrency(Number(invoice.total), invoice.currency)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {shownTotal > invoices.length ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing the latest {invoices.length} of {shownTotal} invoices.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Link href="/customers" className="inline-block text-sm text-primary hover:underline">
        ← Back to customers
      </Link>
    </div>
  );
}

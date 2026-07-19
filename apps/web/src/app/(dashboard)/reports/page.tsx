'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function quarterRange(offset = 0): { from: string; to: string; label: string } {
  const now = new Date();
  const month = now.getUTCMonth() + offset * 3;
  const year = now.getUTCFullYear() + Math.floor(month / 12);
  const m = ((month % 12) + 12) % 12;
  const qStart = Math.floor(m / 3) * 3;
  const from = new Date(Date.UTC(year, qStart, 1));
  const to = new Date(Date.UTC(year, qStart + 3, 0));
  const q = Math.floor(qStart / 3) + 1;
  return { from: isoDate(from), to: isoDate(to), label: `Q${q} ${year}` };
}

function monthRange(offset = 0): { from: string; to: string; label: string } {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const from = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const to = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  const label = from.toLocaleString('en-AE', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return { from: isoDate(from), to: isoDate(to), label };
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const { organizationId, organization, isReady } = useOrganizationId();
  const filingFrequency =
    organization?.settings?.taxConfig?.filingFrequency === 'monthly' ? 'monthly' : 'quarterly';

  const currentPreset = useMemo(
    () => (filingFrequency === 'monthly' ? monthRange(0) : quarterRange(0)),
    [filingFrequency],
  );
  const previousPreset = useMemo(
    () => (filingFrequency === 'monthly' ? monthRange(-1) : quarterRange(-1)),
    [filingFrequency],
  );

  const [from, setFrom] = useState(currentPreset.from);
  const [to, setTo] = useState(currentPreset.to);

  const token = session?.accessToken;
  const canFetch = status === 'authenticated' && !!token && !!organizationId;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports-vat', organizationId, from, to],
    queryFn: () => api.reports.vat(token!, organizationId!, { from, to }),
    enabled: canFetch && !!from && !!to,
  });

  if (status === 'loading' || !isReady) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }

  if (!token) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Session expired. Please sign in again.</p>
          <Link href="/login" className="text-primary hover:underline text-sm">
            Go to login →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">UAE VAT return</h1>
          <p className="text-muted-foreground">
            VAT-201 worksheet in AED for EmaraTax filing
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="https://eservices.tax.gov.ae" target="_blank" rel="noreferrer">
            Open EmaraTax
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>

      {!organizationId && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No business workspace found.</p>
            <Link href="/onboarding" className="text-primary hover:underline text-sm">
              Set up your business →
            </Link>
          </CardContent>
        </Card>
      )}

      {organizationId && (
        <Card>
          <CardHeader>
            <CardTitle>Tax period</CardTitle>
            <CardDescription>
              Filing is due within 28 days after the period ends. Frequency:{' '}
              {filingFrequency === 'monthly' ? 'Monthly' : 'Quarterly'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFrom(currentPreset.from);
                  setTo(currentPreset.to);
                }}
              >
                {currentPreset.label} (current)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFrom(previousPreset.from);
                  setTo(previousPreset.to);
                }}
              >
                {previousPreset.label} (previous)
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="from">From</Label>
                <Input
                  id="from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">To</Label>
                <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && organizationId && (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      )}

      {isError && organizationId && (
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center">
            <p className="font-medium text-destructive">Could not load VAT report</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Company TRN</CardDescription>
                <CardTitle className="text-base">
                  {data.companyTrn || (
                    <Link href="/settings" className="text-primary hover:underline">
                      Add in Company Details →
                    </Link>
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Period</CardDescription>
                <CardTitle className="text-base">
                  {data.period.from} → {data.period.to}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Filing due</CardDescription>
                <CardTitle className="text-base">{data.period.filingDueDate}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Emirate (Box 1 label)</CardDescription>
                <CardTitle className="text-base">
                  {data.boxes.box1.emirate || 'Not set'}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Box 1</CardDescription>
                <CardTitle className="text-lg">Standard rated supplies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount (ex VAT)</span>
                  <span className="font-medium">
                    {formatCurrency(data.boxes.box1.amountExVat, 'AED')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Output VAT</span>
                  <span className="font-medium">
                    {formatCurrency(data.boxes.box1.vatAmount, 'AED')}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Box 9</CardDescription>
                <CardTitle className="text-lg">Input VAT</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recoverable</span>
                  <span className="font-medium text-green-700">
                    {formatCurrency(data.boxes.box9.vatAmount, 'AED')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Non-recoverable (no vendor TRN)</span>
                  <span className="font-medium text-amber-700">
                    {formatCurrency(data.boxes.box9.nonRecoverableVatAmount, 'AED')}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                data.boxes.box14.payable ? 'border-red-200 bg-red-50/40' : 'border-green-200 bg-green-50/40',
              )}
            >
              <CardHeader>
                <CardDescription>Boxes 12–14</CardDescription>
                <CardTitle className="text-lg">{data.boxes.box14.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Box 12 output</span>
                  <span>{formatCurrency(data.boxes.box12.vatAmount, 'AED')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Box 13 recoverable</span>
                  <span>{formatCurrency(data.boxes.box13.vatAmount, 'AED')}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base">
                  <span className="font-medium">Net</span>
                  <span className="font-semibold">
                    {formatCurrency(data.boxes.box14.vatAmount, 'AED')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sales contributing to output VAT</CardTitle>
              <CardDescription>{data.counts.salesInvoices} invoices in period</CardDescription>
            </CardHeader>
            <CardContent>
              {data.outputLines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales invoices in this period.</p>
              ) : (
                <div className="rounded-lg border divide-y">
                  {data.outputLines.map((row) => (
                    <Link
                      key={row.id}
                      href={row.href}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{row.number}</p>
                        <p className="text-sm text-muted-foreground">
                          {row.partyName} · {row.issueDate.slice(0, 10)}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p>Net {formatCurrency(row.netAmountAed ?? 0, 'AED')}</p>
                        <p className="text-muted-foreground">
                          VAT {formatCurrency(row.vatAmountAed, 'AED')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchases contributing to input VAT</CardTitle>
              <CardDescription>{data.counts.purchaseExpenses} expenses in period</CardDescription>
            </CardHeader>
            <CardContent>
              {data.inputLines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No vendor expenses in this period.</p>
              ) : (
                <div className="rounded-lg border divide-y">
                  {data.inputLines.map((row) => (
                    <Link
                      key={row.id}
                      href={row.href}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{row.number}</p>
                        <p className="text-sm text-muted-foreground">
                          {row.partyName}
                          {row.vendorTrn ? ` · TRN ${row.vendorTrn}` : ' · No TRN'} ·{' '}
                          {row.issueDate.slice(0, 10)}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p
                          className={
                            row.recoverable ? 'text-green-700 font-medium' : 'text-amber-700'
                          }
                        >
                          {formatCurrency(row.vatAmountAed, 'AED')}
                        </p>
                        <p className="text-muted-foreground">
                          {row.recoverable ? 'Recoverable' : 'Non-recoverable'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Filing tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {data.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

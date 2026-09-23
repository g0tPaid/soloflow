'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2, Search, Users } from 'lucide-react';
import { WORKSPACE_SEARCH_MIN_QUERY_LENGTH, normalizeWorkspaceSearchQuery } from '@flowbooks/shared';
import { api, type InvoiceStatus, type WorkspaceSearchResponse } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { cn, formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';

const INVOICE_STATUSES: InvoiceStatus[] = [
  'DRAFT',
  'SENT',
  'VIEWED',
  'PARTIAL',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'VOID',
];

type SearchHit = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  kind: 'customer' | 'invoice';
  status?: string;
  amount?: string;
};

function asInvoiceStatus(status: string): InvoiceStatus | null {
  return INVOICE_STATUSES.includes(status as InvoiceStatus) ? (status as InvoiceStatus) : null;
}

export function workspaceSearchHits(data: WorkspaceSearchResponse | undefined): SearchHit[] {
  if (!data) return [];
  return [
    ...data.customers.map((customer) => ({
      key: `customer:${customer.id}`,
      href: customer.href,
      title: customer.name,
      subtitle: customer.subtitle,
      kind: 'customer' as const,
    })),
    ...data.invoices.map((invoice) => ({
      key: `invoice:${invoice.id}`,
      href: invoice.href,
      title: invoice.number,
      subtitle: invoice.subtitle,
      kind: 'invoice' as const,
      status: invoice.status,
      amount: formatCurrency(invoice.total, invoice.currency),
    })),
  ];
}

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { organizationId, isReady } = useOrganizationId();
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const token = session?.accessToken;
  const workspaceReady = status === 'authenticated' && !!token && !!organizationId && isReady;
  const normalized = normalizeWorkspaceSearchQuery(debouncedQuery);
  const canSearch = workspaceReady && !!normalized;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['workspace-search', organizationId, normalized],
    queryFn: () => api.search.query(token!, organizationId!, normalized!),
    enabled: canSearch,
    staleTime: 15_000,
  });

  const hits = useMemo(() => (canSearch ? workspaceSearchHits(data) : []), [canSearch, data]);
  const customerHits = hits.filter((hit) => hit.kind === 'customer');
  const invoiceHits = hits.filter((hit) => hit.kind === 'invoice');
  const showPanel = open && query.trim().length > 0;
  const activeHit = hits[activeIndex];

  useEffect(() => {
    setActiveIndex(0);
  }, [normalized]);

  function go(href: string) {
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
    router.push(href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!showPanel || hits.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % hits.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + hits.length) % hits.length);
    } else if (event.key === 'Enter' && activeHit) {
      event.preventDefault();
      go(activeHit.href);
    }
  }

  return (
    <form
      ref={rootRef}
      role="search"
      className="relative min-w-0 w-full max-w-xl flex-1 lg:flex-none"
      onSubmit={(event) => {
        event.preventDefault();
        if (activeHit) go(activeHit.href);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        role="combobox"
        aria-label="Search customers or invoices"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showPanel && activeHit ? `${listId}-${activeHit.key}` : undefined}
        placeholder="Search customers or invoices"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(event.target.value.trim().length > 0);
        }}
        onFocus={() => {
          if (query.trim()) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="h-9 bg-card pl-9 pr-9"
      />
      {isFetching && canSearch ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : null}

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-50 max-h-[min(24rem,70vh)] overflow-auto rounded-lg border border-border bg-card text-card-foreground shadow-lg"
        >
          {query.trim().length < WORKSPACE_SEARCH_MIN_QUERY_LENGTH ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Type at least 2 characters</p>
          ) : !workspaceReady && status !== 'loading' && isReady ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Sign in to search this business</p>
          ) : isError ? (
            <p className="px-3 py-3 text-sm text-destructive">Couldn&apos;t search right now</p>
          ) : !normalized || (isFetching && !data) ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">No matching customers or invoices</p>
          ) : (
            <div className="py-1">
              <SearchGroup label="Customers" hits={customerHits} listId={listId} activeKey={activeHit?.key} onSelect={go} />
              <SearchGroup label="Invoices" hits={invoiceHits} listId={listId} activeKey={activeHit?.key} onSelect={go} />
            </div>
          )}
        </div>
      ) : null}
    </form>
  );
}

function SearchGroup({
  label,
  hits,
  listId,
  activeKey,
  onSelect,
}: {
  label: string;
  hits: SearchHit[];
  listId: string;
  activeKey?: string;
  onSelect: (href: string) => void;
}) {
  if (hits.length === 0) return null;
  return (
    <div className="px-1 py-1">
      <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <ul>
        {hits.map((hit) => {
          const active = hit.key === activeKey;
          const status = hit.status ? asInvoiceStatus(hit.status) : null;
          const Icon = hit.kind === 'customer' ? Users : FileText;
          return (
            <li key={hit.key}>
              <Link
                id={`${listId}-${hit.key}`}
                href={hit.href}
                role="option"
                aria-selected={active}
                aria-label={`${hit.title}, ${hit.subtitle}`}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2 py-2 text-sm',
                  active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground',
                )}
                onClick={(event) => {
                  event.preventDefault();
                  onSelect(hit.href);
                }}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{hit.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{hit.subtitle}</span>
                </span>
                {status ? <InvoiceStatusBadge status={status} /> : null}
                {hit.amount ? (
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{hit.amount}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

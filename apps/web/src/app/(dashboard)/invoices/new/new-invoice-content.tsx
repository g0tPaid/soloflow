'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { loadCustomers, loadProducts } from '@/lib/offline/catalog';
import { offlineQueryOptions } from '@/lib/offline/network';
import { createInvoiceWithOfflineFallback } from '@/lib/offline/create-invoice';
import { loadInvoiceScreen } from '@/lib/offline/load-invoice';
import { draftContentFromInvoice } from '@/lib/copy-invoice';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  NEW_DOCUMENT_DRAFT_ID,
  type FormDraftContent,
  type FormDraftSnapshot,
} from '@/lib/form-draft/model';
import { getFormDraftRepository } from '@/lib/form-draft/repository';
import type { CreateInvoiceInput } from '@flowbooks/shared';

export function NewInvoicePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromId = searchParams.get('from');
  const customerFromQuery = searchParams.get('customer');
  const { data: session, status: sessionStatus } = useSession();
  const { organizationId, businessCurrency, isReady } = useOrganizationId();
  const online = useOnlineStatus();
  const userId = session?.user?.id;
  const [draftCheck, setDraftCheck] = useState<'loading' | 'ready'>('loading');
  const [existingDraft, setExistingDraft] = useState<FormDraftSnapshot | null>(null);
  const [copyChoice, setCopyChoice] = useState<'pending' | 'keep' | 'replace'>('pending');
  const [copyError, setCopyError] = useState('');

  const { data: customersData, isLoading: customersLoading, isError: customersError, error: customersLoadError } =
    useQuery({
      queryKey: ['customers', organizationId],
      queryFn: () => loadCustomers({ token: session!.accessToken!, organizationId: organizationId! }),
      enabled: !!session?.accessToken && !!organizationId,
      ...offlineQueryOptions,
    });

  const { data: productsData, isLoading: productsLoading, isError: productsError } = useQuery({
    queryKey: ['products', organizationId],
    queryFn: () => loadProducts({ token: session!.accessToken!, organizationId: organizationId! }),
    enabled: !!session?.accessToken && !!organizationId,
    ...offlineQueryOptions,
  });

  const { data: nextNumberData } = useQuery({
    queryKey: ['invoice-next-number', organizationId],
    queryFn: () => api.invoices.nextNumber(session!.accessToken!, organizationId!),
    enabled: !!session?.accessToken && !!organizationId && online,
  });

  const sourceQuery = useQuery({
    queryKey: ['invoice-copy-source', organizationId, fromId],
    queryFn: () =>
      loadInvoiceScreen({
        token: session!.accessToken!,
        organizationId: organizationId!,
        invoiceId: fromId!,
      }),
    enabled: !!session?.accessToken && !!organizationId && !!fromId && copyChoice !== 'keep',
    ...offlineQueryOptions,
  });

  useEffect(() => {
    if (sessionStatus === 'loading' || !isReady) return;
    if (!userId || !organizationId) {
      setDraftCheck('ready');
      setCopyChoice(fromId ? 'pending' : 'replace');
      return;
    }
    let cancelled = false;
    void getFormDraftRepository()
      .read({
        userId,
        organizationId,
        kind: 'invoice',
        documentId: NEW_DOCUMENT_DRAFT_ID,
      })
      .then((stored) => {
        if (cancelled) return;
        setExistingDraft(stored);
        setCopyChoice(fromId && stored ? 'pending' : 'replace');
        setDraftCheck('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setCopyError('Could not read the unsaved draft. Autosave stays paused until it can be read.');
        setDraftCheck('ready');
        setCopyChoice('replace');
      });
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, isReady, userId, organizationId, fromId]);

  const customers = customersData?.data ?? [];
  const products = productsData?.data ?? [];
  const catalogsSettled = !customersLoading && !productsLoading;
  const copyReady = !fromId || copyChoice === 'keep' || sourceQuery.isSuccess || sourceQuery.isError;
  const showForm = catalogsSettled && draftCheck === 'ready' && copyChoice !== 'pending' && copyReady;

  const today = new Date().toISOString().slice(0, 10);
  let initialDraft: FormDraftContent | undefined;
  if (copyChoice === 'replace' && sourceQuery.data?.invoice && fromId) {
    initialDraft = draftContentFromInvoice(sourceQuery.data.invoice, today);
  }

  async function handleCreate(data: CreateInvoiceInput) {
    const customer = customers.find((entry) => entry.id === data.customerId) ?? null;
    return createInvoiceWithOfflineFallback({
      token: session!.accessToken!,
      organizationId: organizationId!,
      data,
      customer,
    });
  }

  async function replaceDraft() {
    if (!userId || !organizationId) return;
    setCopyError('');
    try {
      await getFormDraftRepository().remove({
        userId,
        organizationId,
        kind: 'invoice',
        documentId: NEW_DOCUMENT_DRAFT_ID,
      });
      setExistingDraft(null);
      setCopyChoice('replace');
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : 'Could not clear the existing draft.');
    }
  }

  function keepDraft() {
    setCopyChoice('keep');
    router.replace('/invoices/new');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
        <p className="text-muted-foreground">Fill in the details below</p>
      </div>

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

      {copyChoice === 'pending' && existingDraft && fromId && (
        <Card className="border-[#E40046]/30">
          <CardContent className="space-y-3 py-5 text-sm">
            <p>
              You already have an unsaved invoice on this device from{' '}
              {new Date(existingDraft.savedAt).toLocaleString()}. Using invoice{' '}
              {sourceQuery.data?.invoice.number ?? 'this order'} as a new invoice would replace that draft.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" className="bg-[#E40046] text-white hover:bg-[#c4003c]" onClick={() => void replaceDraft()}>
                Replace draft
              </Button>
              <Button type="button" variant="outline" onClick={keepDraft}>
                Keep unsaved invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(customersError || productsError) && (
        <p className="text-sm text-destructive">
          {customersLoadError instanceof Error
            ? customersLoadError.message
            : 'Could not load customers or products. You can still open an unsaved draft and discard it.'}
        </p>
      )}

      {sourceQuery.isError && copyChoice !== 'keep' && (
        <p className="text-sm text-destructive">
          {sourceQuery.error instanceof Error ? sourceQuery.error.message : 'Could not load that invoice to copy.'}
        </p>
      )}
      {copyError ? <p className="text-sm text-destructive">{copyError}</p> : null}

      {((!catalogsSettled && organizationId) || (fromId && copyChoice !== 'keep' && sourceQuery.isLoading)) && (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      )}

      {showForm && organizationId && customers.length === 0 && !customersError && !existingDraft && !initialDraft && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <p className="font-medium">No customers found</p>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">Add a customer before creating an invoice</p>
            <Link
              href="/customers/new"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Add customer
            </Link>
          </CardContent>
        </Card>
      )}

      {showForm && organizationId && (customers.length > 0 || existingDraft || initialDraft || customersError) && (
        <InvoiceForm
          key={`${copyChoice}-${fromId ?? ''}-${customerFromQuery ?? ''}`}
          mode="create"
          customers={customers}
          products={products}
          defaultCurrency={businessCurrency}
          suggestedNumber={nextNumberData?.number}
          initialCustomerId={copyChoice === 'keep' ? undefined : customerFromQuery ?? undefined}
          initialDraft={initialDraft}
          catalogTruncated={customersData?.truncated === true || productsData?.truncated === true}
          draftIdentity={
            userId && organizationId ? { userId, organizationId } : null
          }
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}

'use client';

import { invoiceBasePath, invoiceVersionForPath } from '@/lib/invoice-version';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  isProvisionalInvoiceNumber,
  PROVISIONAL_INVOICE_NUMBER,
  type CreateInvoiceInput,
  type UpdateInvoiceInput,
} from '@flowbooks/shared';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useDocumentDraft, usePublishFormDraft, type DocumentDraftController } from '@/hooks/use-document-draft';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencySelect } from '@/components/currency-select';
import { DraftStatus } from '@/components/invoices/draft-status';
import { LineItemsEditor } from '@/components/invoices/line-items-editor';
import { ShippingFields } from '@/components/invoices/shipping-fields';
import { VatFields } from '@/components/invoices/vat-fields';
import { type LineItemInput, parseStoredLineItem } from '@/lib/line-items';
import type { Customer, Invoice, Product } from '@/lib/api';
import {
  NEW_DOCUMENT_DRAFT_ID,
  draftLineFromInput,
  formDraftContent,
  formDraftFingerprint,
  lineInputFromDraft,
  type FormDraftContent,
} from '@/lib/form-draft/model';
import type { FormDraftRepository } from '@/lib/form-draft/repository';
import { cn } from '@/lib/utils';

const selectClassName = cn(
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const textareaClassName = cn(
  'flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

function toDateInput(value?: string | Date | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function toLineItems(items?: Invoice['items']): LineItemInput[] {
  if (!items?.length) {
    return [{ name: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0 }];
  }
  return items.map((item) => {
    const { name, description } = parseStoredLineItem(item);
    return {
      productId: item.productId,
      name,
      description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      imageUrl: item.imageUrl ?? undefined,
    };
  });
}

const createInvoiceFormSchema = createInvoiceSchema.omit({ items: true });
type CreateInvoiceFormValues = Omit<CreateInvoiceInput, 'items'>;

const INVOICE_STATUSES = [
  'DRAFT',
  'SENT',
  'VIEWED',
  'PARTIAL',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'VOID',
] as const;

interface DraftFormExtras {
  /** Signed-in user and organization. Drafts are stored only when both are present. */
  draftIdentity?: { userId: string; organizationId: string } | null;
  draftRepository?: FormDraftRepository;
  onSaved?: () => void | Promise<void>;
}

interface CreateInvoiceFormProps extends DraftFormExtras {
  mode: 'create';
  customers: Customer[];
  products: Product[];
  defaultCurrency?: string;
  suggestedNumber?: string;
  /** Prefill from a customer card. A saved draft on this device still wins. */
  initialCustomerId?: string;
  /** Copy of another invoice. Applied only after the page has consent to replace a draft. */
  initialDraft?: FormDraftContent;
  catalogTruncated?: boolean;
  onSubmit: (data: CreateInvoiceInput) => Promise<{ id: string; offlinePending?: boolean }>;
}

interface EditInvoiceFormProps extends DraftFormExtras {
  mode: 'edit';
  invoice: Invoice;
  customers: Customer[];
  products: Product[];
  defaultCurrency?: string;
  onSubmit: (data: UpdateInvoiceInput) => Promise<void>;
}

type InvoiceFormProps = CreateInvoiceFormProps | EditInvoiceFormProps;

function buildInvoiceBaseline(props: InvoiceFormProps, today: string): FormDraftContent {
  if (props.mode === 'edit') {
    const invoice = props.invoice;
    return formDraftContent({
      customerId: invoice.customerId ?? '',
      number: invoice.number ?? '',
      issueDate: toDateInput(invoice.issueDate) || today,
      dueDate: toDateInput(invoice.dueDate),
      notes: invoice.notes ?? '',
      discount: Number(invoice.discount ?? 0),
      shipping: Number(invoice.shipping ?? 0),
      taxRate: Number(invoice.taxRate ?? 0),
      shippingMethod: invoice.shippingMethod ?? null,
      shippingTerms: invoice.shippingTerms ?? null,
      shippingFromCountry: invoice.shippingFromCountry ?? '',
      shippingToCountry: invoice.shippingToCountry ?? '',
      status: invoice.status ?? 'DRAFT',
      currency: invoice.currency,
      currencyTouched: true,
      items: toLineItems(invoice.items).map(draftLineFromInput),
    });
  }
  if (props.initialDraft) {
    return formDraftContent({
      ...props.initialDraft,
      number: props.initialDraft.number || props.suggestedNumber || '',
      issueDate: props.initialDraft.issueDate || today,
    });
  }
  const prefilled = props.customers.find((customer) => customer.id === props.initialCustomerId);
  return formDraftContent({
    customerId: props.initialCustomerId ?? '',
    number: props.suggestedNumber ?? '',
    issueDate: today,
    currency: prefilled?.currency || props.defaultCurrency || 'INR',
    currencyTouched: false,
  });
}

export function InvoiceForm(props: InvoiceFormProps) {
  const today = useRef(toDateInput(new Date())).current;
  const baseline = useMemo(
    () => buildInvoiceBaseline(props, today),
    // Suggested numbers and saved invoices update the baseline for a new session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      props.mode,
      props.mode === 'edit' ? props.invoice.id : props.suggestedNumber,
      props.mode === 'edit' ? props.invoice.updatedAt : props.defaultCurrency,
      'initialCustomerId' in props ? props.initialCustomerId ?? '' : '',
      'initialDraft' in props ? formDraftFingerprint(props.initialDraft ?? formDraftContent({})) : '',
      today,
    ],
  );
  const identity = props.draftIdentity;
  const scope =
    identity?.userId && identity.organizationId
      ? {
          userId: identity.userId,
          organizationId: identity.organizationId,
          kind: 'invoice' as const,
          documentId: props.mode === 'edit' ? props.invoice.id : NEW_DOCUMENT_DRAFT_ID,
        }
      : null;
  const draft = useDocumentDraft({
    scope,
    baseline,
    repository: props.draftRepository,
  });
  if (scope && !draft.ready) {
    return (
      <div
        className="h-64 animate-pulse rounded-lg bg-muted"
        aria-busy="true"
        aria-label="Checking for a saved draft"
      />
    );
  }
  return (
    <InvoiceFormEditor
      key={draft.generation}
      {...props}
      initialContent={scope ? draft.initialContent : undefined}
      draft={draft.controller}
    />
  );
}

function InvoiceFormEditor(
  props: InvoiceFormProps & {
    initialContent?: FormDraftContent;
    draft: DocumentDraftController;
  },
) {
  const router = useRouter();
  const invoicePath = invoiceBasePath(invoiceVersionForPath(usePathname()));
  const isEdit = props.mode === 'edit';
  const invoice = isEdit ? props.invoice : undefined;
  const businessCurrency = props.defaultCurrency ?? 'INR';
  const seed = props.initialContent;
  const draftRef = useRef(props.draft);
  draftRef.current = props.draft;

  const [items, setItems] = useState<LineItemInput[]>(() =>
    seed ? seed.items.map(lineInputFromDraft) : toLineItems(invoice?.items),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [invoiceCurrency, setInvoiceCurrency] = useState(
    seed?.currency ?? (isEdit ? invoice!.currency : businessCurrency),
  );
  const [shipping, setShipping] = useState(seed ? seed.shipping : isEdit ? Number(invoice!.shipping ?? 0) : 0);
  const [taxRate, setTaxRate] = useState(seed ? seed.taxRate : isEdit ? Number(invoice!.taxRate ?? 0) : 0);
  const currencyTouched = useRef(seed ? seed.currencyTouched : isEdit);
  const online = useOnlineStatus();

  const createForm = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceFormSchema),
    defaultValues: {
      customerId: seed?.customerId ?? '',
      number: seed?.number ?? (props.mode === 'create' ? props.suggestedNumber ?? '' : ''),
      issueDate: seed?.issueDate || toDateInput(new Date()),
      dueDate: seed?.dueDate ?? '',
      currency: seed?.currency ?? (isEdit ? invoice!.currency : businessCurrency),
      notes: seed?.notes ?? '',
      discount: seed?.discount ?? 0,
      shipping: seed?.shipping ?? 0,
      taxRate: seed?.taxRate ?? 0,
      shippingMethod: seed?.shippingMethod ?? null,
      shippingTerms: seed?.shippingTerms ?? null,
      shippingFromCountry: seed?.shippingFromCountry ?? '',
      shippingToCountry: seed?.shippingToCountry ?? '',
    },
  });

  const editForm = useForm<UpdateInvoiceInput>({
    resolver: zodResolver(updateInvoiceSchema),
    defaultValues: {
      number: seed?.number ?? invoice?.number ?? '',
      status: (seed?.status || invoice?.status || 'DRAFT') as UpdateInvoiceInput['status'],
      dueDate: seed ? seed.dueDate || null : toDateInput(invoice?.dueDate) || null,
      notes: seed?.notes ?? invoice?.notes ?? '',
      discount: seed?.discount ?? Number(invoice?.discount ?? 0),
      shipping: seed?.shipping ?? Number(invoice?.shipping ?? 0),
      taxRate: seed?.taxRate ?? Number(invoice?.taxRate ?? 0),
      shippingMethod: seed?.shippingMethod ?? invoice?.shippingMethod ?? null,
      shippingTerms: seed?.shippingTerms ?? invoice?.shippingTerms ?? null,
      shippingFromCountry: seed?.shippingFromCountry ?? invoice?.shippingFromCountry ?? '',
      shippingToCountry: seed?.shippingToCountry ?? invoice?.shippingToCountry ?? '',
    },
  });

  const currency = invoiceCurrency;
  const discount = isEdit
    ? Number(editForm.watch('discount') ?? 0)
    : Number(createForm.watch('discount') ?? 0);
  const editShipping = isEdit ? Number(editForm.watch('shipping') ?? 0) : shipping;
  const editTaxRate = isEdit ? Number(editForm.watch('taxRate') ?? 0) : taxRate;

  const suggestedNumber = props.mode === 'create' ? props.suggestedNumber : undefined;
  const createValues = createForm.watch();
  const editValues = editForm.watch();
  const draftContent = isEdit
    ? formDraftContent({
        customerId: invoice?.customerId ?? '',
        number: editValues.number ?? '',
        issueDate: toDateInput(invoice?.issueDate),
        dueDate: editValues.dueDate ?? '',
        notes: editValues.notes ?? '',
        discount: editValues.discount,
        shipping: editValues.shipping,
        taxRate: editValues.taxRate,
        shippingMethod: editValues.shippingMethod ?? null,
        shippingTerms: editValues.shippingTerms ?? null,
        shippingFromCountry: editValues.shippingFromCountry ?? '',
        shippingToCountry: editValues.shippingToCountry ?? '',
        status: editValues.status ?? '',
        currency: invoiceCurrency,
        currencyTouched: currencyTouched.current,
        items: items.map(draftLineFromInput),
      })
    : formDraftContent({
        customerId: createValues.customerId ?? '',
        number: createValues.number ?? '',
        issueDate: createValues.issueDate ?? '',
        dueDate: createValues.dueDate ?? '',
        notes: createValues.notes ?? '',
        discount: createValues.discount,
        shipping,
        taxRate,
        shippingMethod: createValues.shippingMethod ?? null,
        shippingTerms: createValues.shippingTerms ?? null,
        shippingFromCountry: createValues.shippingFromCountry ?? '',
        shippingToCountry: createValues.shippingToCountry ?? '',
        currency: invoiceCurrency,
        currencyTouched: currencyTouched.current,
        items: items.map(draftLineFromInput),
      });
  const draftContentRef = useRef(draftContent);
  draftContentRef.current = draftContent;
  usePublishFormDraft(props.draft, draftContent);

  useEffect(() => {
    if (props.mode !== 'create') return;
    const current = createForm.getValues('number');
    if (!online) {
      if (!current || isProvisionalInvoiceNumber(current)) {
        createForm.setValue('number', PROVISIONAL_INVOICE_NUMBER);
        draftRef.current.adoptBaseline({ number: PROVISIONAL_INVOICE_NUMBER });
      }
      return;
    }
    if ((!current || isProvisionalInvoiceNumber(current)) && suggestedNumber) {
      createForm.setValue('number', suggestedNumber);
      draftRef.current.adoptBaseline({ number: suggestedNumber });
    }
  }, [props.mode, online, suggestedNumber, createForm]);

  async function handleCreateSubmit(data: CreateInvoiceFormValues) {
    if (props.mode !== 'create') return;
    setSubmitting(true);
    setError('');
    try {
      const sanitizedItems = items.map((item) => ({
        ...item,
        quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
        unitPrice: Number.isFinite(item.unitPrice) ? Math.max(0, item.unitPrice) : 0,
        taxRate: Number.isFinite(item.taxRate) ? item.taxRate : 0,
      }));

      const submittedDraft = draftContentRef.current;
      const created = await props.onSubmit({
        ...data,
        currency: invoiceCurrency,
        items: sanitizedItems,
        discount: Number.isFinite(data.discount) ? Math.max(0, data.discount!) : 0,
        shipping: Number.isFinite(shipping) ? Math.max(0, shipping) : 0,
        taxRate: Number.isFinite(taxRate) ? Math.max(0, Math.min(100, taxRate)) : 0,
        shippingMethod: data.shippingMethod ?? null,
        shippingTerms: data.shippingTerms ?? null,
        shippingFromCountry: data.shippingFromCountry?.trim() || null,
        shippingToCountry: data.shippingToCountry?.trim() || null,
        dueDate: data.dueDate || null,
        notes: data.notes || null,
      });
      try {
        await props.draft.markExplicitSave(submittedDraft);
      } catch {
        setError(
          'The invoice was saved, but the on-device draft could not be cleared. Discard the draft before leaving so it is not applied again.',
        );
        return;
      }
      await props.onSaved?.();
      if (created.offlinePending) {
        router.push(invoicePath);
        return;
      }
      router.push(`${invoicePath}/${created.id}?new=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSubmit(data: UpdateInvoiceInput) {
    if (props.mode !== 'edit') return;
    if (!items.length || !items.some((item) => item.name.trim() || item.description.trim())) {
      setError('Add at least one line item with a name');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const sanitizedItems = items.map((item) => ({
        ...item,
        quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
        unitPrice: Number.isFinite(item.unitPrice) ? Math.max(0, item.unitPrice) : 0,
        taxRate: Number.isFinite(item.taxRate) ? item.taxRate : 0,
      }));

      const submittedDraft = draftContentRef.current;
      await props.onSubmit({
        ...data,
        currency: invoiceCurrency,
        dueDate: data.dueDate || null,
        notes: data.notes || null,
        shipping: Number.isFinite(Number(data.shipping)) ? Math.max(0, Number(data.shipping)) : 0,
        taxRate: Number.isFinite(Number(data.taxRate))
          ? Math.max(0, Math.min(100, Number(data.taxRate)))
          : 0,
        items: sanitizedItems,
      });
      try {
        await props.draft.markExplicitSave(submittedDraft);
      } catch {
        setError(
          'The invoice was saved, but the on-device draft could not be cleared. Discard the draft before leaving so it is not applied again.',
        );
        return;
      }
      await props.onSaved?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice');
    } finally {
      setSubmitting(false);
    }
  }

  if (isEdit) {
    return (
      <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-6">
        <Card id="edit-line-items" className="scroll-mt-20 border-[#E40046]/40">
          <CardHeader>
            <CardTitle>Line items</CardTitle>
            <CardDescription>
              Change quantity or price, or add another item — then click Save changes at the bottom.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LineItemsEditor
              items={items}
              onChange={setItems}
              currency={currency}
              products={props.products}
              discount={discount}
              shipping={editShipping}
              onShippingChange={(value) => editForm.setValue('shipping', value)}
              taxRate={editTaxRate}
              onTaxRateChange={(value) => editForm.setValue('taxRate', value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice details</CardTitle>
            <CardDescription>
              Number, status, currency, due date, discount, and notes
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-number">Invoice number</Label>
              <Input id="edit-number" {...editForm.register('number')} />
              {editForm.formState.errors.number && (
                <p className="text-sm text-destructive">{editForm.formState.errors.number.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" className={selectClassName} {...editForm.register('status')}>
                {INVOICE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                For half payments use Record payment above. Marking Paid here records the remaining balance.
                Changing the status does not delete payments. Remove a payment from the list above.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" {...editForm.register('dueDate')} />
            </div>
            <div className="sm:col-span-2">
              <CurrencySelect
                id="edit-currency"
                value={invoiceCurrency}
                onChange={(value) => {
                  currencyTouched.current = true;
                  setInvoiceCurrency(value);
                }}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                step="any"
                {...editForm.register('discount', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea id="notes" className={textareaClassName} {...editForm.register('notes')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping details</CardTitle>
            <CardDescription>Method, terms, and route — shown on the invoice PDF</CardDescription>
          </CardHeader>
          <CardContent>
            <ShippingFields
              idPrefix="edit-shipping"
              method={editForm.watch('shippingMethod')}
              terms={editForm.watch('shippingTerms')}
              fromCountry={editForm.watch('shippingFromCountry')}
              toCountry={editForm.watch('shippingToCountry')}
              onMethodChange={(value) => editForm.setValue('shippingMethod', value ?? null)}
              onTermsChange={(value) => editForm.setValue('shippingTerms', value ?? null)}
              onFromCountryChange={(value) => editForm.setValue('shippingFromCountry', value)}
              onToCountryChange={(value) => editForm.setValue('shippingToCountry', value)}
            />
          </CardContent>
        </Card>

        <Card className="border-[#E40046]/30">
          <CardHeader>
            <CardTitle>VAT</CardTitle>
            <CardDescription>Optional — switch on and set the percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <VatFields
              idPrefix="edit-vat"
              taxRate={editTaxRate}
              onTaxRateChange={(value) => editForm.setValue('taxRate', value)}
            />
          </CardContent>
        </Card>

        <DraftStatus kind="invoice" draft={props.draft} />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={submitting} size="lg" className="bg-[#E40046] text-white hover:bg-[#c4003c]">
            {submitting ? 'Saving...' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/invoices">Back to invoices</Link>
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={createForm.handleSubmit(
        (data) => {
          if (!items.length || !items.some((item) => item.name.trim() || item.description.trim())) {
            setError('Add at least one line item with a name');
            return;
          }
          return handleCreateSubmit(data);
        },
        (formErrors) => {
          const first = Object.values(formErrors)[0];
          const message =
            first && typeof first === 'object' && 'message' in first
              ? String(first.message)
              : 'Please check the form and try again';
          setError(message);
        },
      )}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>New invoice</CardTitle>
          <CardDescription>Create an invoice for a customer</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="number">Invoice number</Label>
            <Input
              id="number"
              placeholder="e.g. INV-00001"
              disabled={!online}
              {...createForm.register('number')}
            />
            {createForm.formState.errors.number && (
              <p className="text-sm text-destructive">{createForm.formState.errors.number.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {online
                ? 'You can change this to any number you like'
                : 'You are offline. This invoice is saved on this phone and shows as Pending sync. SoloFlow assigns the real number when it syncs.'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerId">Customer *</Label>
            <select
              id="customerId"
              className={selectClassName}
              {...createForm.register('customerId', {
                onChange: (e) => {
                  const customer = props.customers.find((c) => c.id === e.target.value);
                  if (customer?.currency && !currencyTouched.current) {
                    setInvoiceCurrency(customer.currency);
                    createForm.setValue('currency', customer.currency);
                  }
                },
              })}
            >
              <option value="">Select customer</option>
              {createForm.watch('customerId') &&
              !props.customers.some((customer) => customer.id === createForm.watch('customerId')) ? (
                <option value={createForm.watch('customerId')}>Saved customer</option>
              ) : null}
              {props.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {createForm.formState.errors.customerId && (
              <p className="text-sm text-destructive">
                {createForm.formState.errors.customerId.message}
              </p>
            )}
            {props.catalogTruncated ? (
              <p className="text-xs text-muted-foreground">
                Showing the first 2,000 customers and products. Use search if someone is missing.
              </p>
            ) : null}
          </div>

          <CurrencySelect
            id="currency"
            value={invoiceCurrency}
            onChange={(value) => {
              currencyTouched.current = true;
              setInvoiceCurrency(value);
              createForm.setValue('currency', value);
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue date</Label>
              <Input id="issueDate" type="date" {...createForm.register('issueDate')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" {...createForm.register('dueDate')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount">Discount</Label>
            <Input
              id="discount"
              type="number"
              min="0"
              step="any"
              {...createForm.register('discount', { valueAsNumber: true })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipping details</CardTitle>
          <CardDescription>Air, ship, or local delivery — plus terms and country route</CardDescription>
        </CardHeader>
        <CardContent>
          <ShippingFields
            method={createForm.watch('shippingMethod')}
            terms={createForm.watch('shippingTerms')}
            fromCountry={createForm.watch('shippingFromCountry')}
            toCountry={createForm.watch('shippingToCountry')}
            onMethodChange={(value) => createForm.setValue('shippingMethod', value ?? null)}
            onTermsChange={(value) => createForm.setValue('shippingTerms', value ?? null)}
            onFromCountryChange={(value) => createForm.setValue('shippingFromCountry', value)}
            onToCountryChange={(value) => createForm.setValue('shippingToCountry', value)}
          />
        </CardContent>
      </Card>

      <Card className="border-[#E40046]/30">
        <CardHeader>
          <CardTitle>VAT</CardTitle>
          <CardDescription>Optional — switch on and set the percentage</CardDescription>
        </CardHeader>
        <CardContent>
          <VatFields taxRate={taxRate} onTaxRateChange={setTaxRate} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItemsEditor
            items={items}
            onChange={setItems}
            currency={currency}
            products={props.products}
            discount={discount}
            shipping={shipping}
            onShippingChange={setShipping}
            taxRate={taxRate}
            onTaxRateChange={setTaxRate}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea id="notes" className={textareaClassName} {...createForm.register('notes')} />
          </div>
        </CardContent>
      </Card>

      <DraftStatus kind="invoice" draft={props.draft} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create invoice'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/invoices">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}

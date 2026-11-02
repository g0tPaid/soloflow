'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createQuoteSchema,
  updateQuoteSchema,
  type CreateQuoteInput,
  type UpdateQuoteInput,
} from '@flowbooks/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencySelect } from '@/components/currency-select';
import { LineItemsEditor } from '@/components/invoices/line-items-editor';
import { ShippingFields } from '@/components/invoices/shipping-fields';
import { VatFields } from '@/components/invoices/vat-fields';
import { type LineItemInput, linesForSave, parseStoredLineItem } from '@/lib/line-items';
import type { Customer, Quote, Product } from '@/lib/api';
import { clearQuoteDraft, readQuoteDraft, writeQuoteDraft, type QuoteDraft } from '@/lib/quote-draft';
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

function toLineItems(items?: Quote['items']): LineItemInput[] {
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

/** Empty number inputs become NaN with valueAsNumber. Treat that as 0 so Save still runs. */
function finiteOrZero(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

const moneyField = z.preprocess(finiteOrZero, z.number().min(0));
const taxField = z.preprocess(
  (value) => Math.min(100, Math.max(0, finiteOrZero(value))),
  z.number().min(0).max(100),
);

const createQuoteFormSchema = createQuoteSchema.omit({ items: true }).extend({
  discount: moneyField.optional(),
  shipping: moneyField.optional(),
  taxRate: taxField.optional(),
});
type CreateQuoteFormValues = Omit<CreateQuoteInput, 'items'>;

const editQuoteFormSchema = updateQuoteSchema.extend({
  discount: moneyField.optional(),
  shipping: moneyField.optional(),
  taxRate: taxField.optional(),
});

function firstFormError(errors: Record<string, unknown>): string {
  for (const value of Object.values(errors)) {
    if (value && typeof value === 'object' && 'message' in value && value.message) {
      return String(value.message);
    }
  }
  return 'Please check the form and try again';
}

function prepareItems(items: LineItemInput[]): LineItemInput[] {
  return linesForSave(items).map((item) => ({
    ...item,
    productId: item.productId || null,
    quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
    unitPrice: Number.isFinite(item.unitPrice) ? Math.max(0, item.unitPrice) : 0,
    taxRate: Number.isFinite(item.taxRate) ? item.taxRate : 0,
  }));
}

const QUOTE_STATUSES = [
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
  'CONVERTED',
] as const;

interface CreateQuoteFormProps {
  mode: 'create';
  customers: Customer[];
  products: Product[];
  defaultCurrency?: string;
  suggestedNumber?: string;
  onSubmit: (data: CreateQuoteInput) => Promise<{ id: string }>;
}

interface EditQuoteFormProps {
  mode: 'edit';
  quote: Quote;
  customers: Customer[];
  products: Product[];
  defaultCurrency?: string;
  onSubmit: (data: UpdateQuoteInput) => Promise<void>;
}

type QuoteFormProps = CreateQuoteFormProps | EditQuoteFormProps;

export function QuoteForm(props: QuoteFormProps) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const quote = isEdit ? props.quote : undefined;
  const businessCurrency = props.defaultCurrency ?? 'INR';

  const [items, setItems] = useState<LineItemInput[]>(() => toLineItems(quote?.items));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [quoteCurrency, setQuoteCurrency] = useState(
    isEdit ? quote!.currency : businessCurrency,
  );
  const [shipping, setShipping] = useState(
    isEdit ? Number(quote!.shipping ?? 0) : 0,
  );
  const [taxRate, setTaxRate] = useState(
    isEdit ? Number(quote!.taxRate ?? 0) : 0,
  );
  const currencyTouched = useRef(isEdit);
  const draftId = isEdit ? quote!.id : 'new';
  const baseline = useRef<QuoteDraft | null>(null);
  const restoredDraft = useRef(false);

  const createForm = useForm<CreateQuoteFormValues>({
    resolver: zodResolver(createQuoteFormSchema),
    defaultValues: {
      customerId: '',
      number: props.mode === 'create' ? props.suggestedNumber ?? '' : '',
      issueDate: toDateInput(new Date()),
      validUntil: '',
      currency: isEdit ? quote!.currency : businessCurrency,
      notes: '',
      discount: 0,
      shipping: 0,
      taxRate: 0,
      shippingMethod: null,
      shippingTerms: null,
      shippingFromCountry: '',
      shippingToCountry: '',
    },
  });

  const editForm = useForm<UpdateQuoteInput>({
    resolver: zodResolver(editQuoteFormSchema),
    defaultValues: {
      number: quote?.number ?? '',
      status: quote?.status ?? 'DRAFT',
      validUntil: toDateInput(quote?.validUntil) || null,
      notes: quote?.notes ?? '',
      discount: Number(quote?.discount ?? 0),
      shipping: Number(quote?.shipping ?? 0),
      taxRate: Number(quote?.taxRate ?? 0),
      shippingMethod: quote?.shippingMethod ?? null,
      shippingTerms: quote?.shippingTerms ?? null,
      shippingFromCountry: quote?.shippingFromCountry ?? '',
      shippingToCountry: quote?.shippingToCountry ?? '',
    },
  });

  const currency = quoteCurrency;
  const discount = finiteOrZero(isEdit ? editForm.watch('discount') : createForm.watch('discount'));
  const editShipping = isEdit ? Number(editForm.watch('shipping') ?? 0) : shipping;
  const editTaxRate = isEdit ? Number(editForm.watch('taxRate') ?? 0) : taxRate;
  const createValues = createForm.watch();
  const editValues = editForm.watch();

  function buildDraft(): QuoteDraft {
    if (isEdit) {
      const values = editForm.getValues();
      const status = QUOTE_STATUSES.includes(values.status as (typeof QUOTE_STATUSES)[number])
        ? values.status
        : quote?.status ?? 'DRAFT';
      return {
        items,
        currency: quoteCurrency,
        shipping: finiteOrZero(values.shipping),
        taxRate: Math.min(100, Math.max(0, finiteOrZero(values.taxRate))),
        number: values.number ?? '',
        status,
        validUntil: typeof values.validUntil === 'string' ? values.validUntil : '',
        notes: values.notes ?? '',
        discount: finiteOrZero(values.discount),
        shippingMethod: values.shippingMethod ?? null,
        shippingTerms: values.shippingTerms ?? null,
        shippingFromCountry: values.shippingFromCountry ?? '',
        shippingToCountry: values.shippingToCountry ?? '',
      };
    }

    const values = createForm.getValues();
    return {
      items,
      currency: quoteCurrency,
      shipping: finiteOrZero(shipping),
      taxRate: Math.min(100, Math.max(0, finiteOrZero(taxRate))),
      number: values.number ?? '',
      validUntil: typeof values.validUntil === 'string' ? values.validUntil : '',
      notes: values.notes ?? '',
      discount: finiteOrZero(values.discount),
      shippingMethod: values.shippingMethod ?? null,
      shippingTerms: values.shippingTerms ?? null,
      shippingFromCountry: values.shippingFromCountry ?? '',
      shippingToCountry: values.shippingToCountry ?? '',
    };
  }

  function applyDraft(draft: QuoteDraft) {
    if (draft.items.length > 0) setItems(draft.items);
    if (draft.currency) setQuoteCurrency(draft.currency);
    setShipping(finiteOrZero(draft.shipping));
    setTaxRate(Math.min(100, Math.max(0, finiteOrZero(draft.taxRate))));
    const shared = {
      validUntil: draft.validUntil || null,
      notes: draft.notes ?? '',
      discount: finiteOrZero(draft.discount),
      shipping: finiteOrZero(draft.shipping),
      taxRate: Math.min(100, Math.max(0, finiteOrZero(draft.taxRate))),
      shippingMethod: draft.shippingMethod ?? null,
      shippingTerms: draft.shippingTerms ?? null,
      shippingFromCountry: draft.shippingFromCountry ?? '',
      shippingToCountry: draft.shippingToCountry ?? '',
    };
    if (isEdit) {
      const status = QUOTE_STATUSES.includes(draft.status as (typeof QUOTE_STATUSES)[number])
        ? (draft.status as (typeof QUOTE_STATUSES)[number])
        : quote?.status ?? 'DRAFT';
      editForm.reset({ ...editForm.getValues(), ...shared, number: draft.number, status });
      return;
    }
    createForm.reset({
      ...createForm.getValues(),
      ...shared,
      number: draft.number,
      currency: draft.currency || businessCurrency,
    });
  }

  function rememberDraft() {
    const draft = buildDraft();
    baseline.current = draft;
    writeQuoteDraft(draftId, draft);
  }

  function discardDraft() {
    clearQuoteDraft(draftId);
    baseline.current = null;
    restoredDraft.current = false;
    setItems(toLineItems(quote?.items));
    setQuoteCurrency(isEdit ? quote!.currency : businessCurrency);
    setShipping(isEdit ? Number(quote!.shipping ?? 0) : 0);
    setTaxRate(isEdit ? Number(quote!.taxRate ?? 0) : 0);
    setError('');
    setNotice('');
    if (isEdit) {
      editForm.reset();
      return;
    }
    createForm.reset();
    const suggested = props.mode === 'create' ? props.suggestedNumber : '';
    if (suggested) createForm.setValue('number', suggested);
  }

  useEffect(() => {
    if (props.mode !== 'create') return;
    const suggested = props.suggestedNumber;
    if (!suggested) return;
    if (!createForm.getValues('number')) {
      createForm.setValue('number', suggested);
    }
  }, [props, createForm]);

  useEffect(() => {
    const draft = readQuoteDraft(draftId);
    if (!draft?.items.length) return;
    restoredDraft.current = true;
    applyDraft(draft);
    setNotice('Restored unsaved quote');
    // Restore once, from the draft written before this page loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  useEffect(() => {
    if (restoredDraft.current) {
      restoredDraft.current = false;
      return;
    }
    const draft = buildDraft();
    if (!baseline.current) {
      baseline.current = draft;
      return;
    }
    if (JSON.stringify(draft) === JSON.stringify(baseline.current)) return;
    writeQuoteDraft(draftId, draft);
    // Persist after each edit so leaving the page does not drop the quote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, items, quoteCurrency, shipping, taxRate, createValues, editValues]);

  async function handleCreateSubmit(data: CreateQuoteFormValues) {
    if (props.mode !== 'create') return;
    const sanitizedItems = prepareItems(items);
    if (!sanitizedItems.length) {
      setError('Add at least one line item with a name');
      rememberDraft();
      return;
    }
    setSubmitting(true);
    setError('');
    rememberDraft();
    try {
      const created = await props.onSubmit({
        ...data,
        currency: quoteCurrency,
        items: sanitizedItems,
        discount: Number.isFinite(data.discount) ? Math.max(0, data.discount!) : 0,
        shipping: Number.isFinite(shipping) ? Math.max(0, shipping) : 0,
        taxRate: Number.isFinite(taxRate) ? Math.max(0, Math.min(100, taxRate)) : 0,
        shippingMethod: data.shippingMethod ?? null,
        shippingTerms: data.shippingTerms ?? null,
        shippingFromCountry: data.shippingFromCountry?.trim() || null,
        shippingToCountry: data.shippingToCountry?.trim() || null,
        validUntil: data.validUntil || null,
        notes: data.notes || null,
      });
      clearQuoteDraft(draftId);
      router.push(`/quotes/${created.id}?new=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quote');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSubmit(data: UpdateQuoteInput) {
    if (props.mode !== 'edit') return;
    const sanitizedItems = prepareItems(items);
    if (!sanitizedItems.length) {
      setError('Add at least one line item with a name');
      rememberDraft();
      return;
    }
    setSubmitting(true);
    setError('');
    rememberDraft();
    try {
      await props.onSubmit({
        ...data,
        currency: quoteCurrency,
        validUntil: data.validUntil || null,
        notes: data.notes || null,
        shipping: Number.isFinite(Number(data.shipping)) ? Math.max(0, Number(data.shipping)) : 0,
        taxRate: Number.isFinite(Number(data.taxRate))
          ? Math.max(0, Math.min(100, Number(data.taxRate)))
          : 0,
        items: sanitizedItems,
      });
      clearQuoteDraft(draftId);
      baseline.current = buildDraft();
      setNotice('Quote saved');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quote');
    } finally {
      setSubmitting(false);
    }
  }

  if (isEdit) {
    return (
      <form
        noValidate
        onSubmit={editForm.handleSubmit(handleEditSubmit, (formErrors) => {
          rememberDraft();
          setNotice('');
          setError(firstFormError(formErrors as Record<string, unknown>));
        })}
        className="space-y-6"
      >
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
            <CardTitle>Quote details</CardTitle>
            <CardDescription>
              Number, status, currency, valid until, discount, and notes
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-number">Quote number</Label>
              <Input id="edit-number" {...editForm.register('number')} />
              {editForm.formState.errors.number && (
                <p className="text-sm text-destructive">{editForm.formState.errors.number.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" className={selectClassName} {...editForm.register('status')}>
                {QUOTE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid until</Label>
              <Input id="validUntil" type="date" {...editForm.register('validUntil')} />
            </div>
            <div className="sm:col-span-2">
              <CurrencySelect
                id="edit-currency"
                value={quoteCurrency}
                onChange={(value) => {
                  currencyTouched.current = true;
                  setQuoteCurrency(value);
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
            <CardDescription>Method, terms, and route — shown on the quote PDF</CardDescription>
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

        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={submitting} size="lg" className="bg-[#E40046] text-white hover:bg-[#c4003c]">
            {submitting ? 'Saving...' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" onClick={discardDraft}>
            Discard changes
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/quotes">Back to quotes</Link>
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      noValidate
      onSubmit={createForm.handleSubmit(handleCreateSubmit, (formErrors) => {
        rememberDraft();
        setNotice('');
        setError(firstFormError(formErrors as Record<string, unknown>));
      })}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>New quote</CardTitle>
          <CardDescription>Create a quote for a customer</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="number">Quote number</Label>
            <Input
              id="number"
              placeholder="e.g. QT-00001"
              {...createForm.register('number')}
            />
            {createForm.formState.errors.number && (
              <p className="text-sm text-destructive">{createForm.formState.errors.number.message}</p>
            )}
            <p className="text-xs text-muted-foreground">You can change this to any number you like</p>
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
                    setQuoteCurrency(customer.currency);
                    createForm.setValue('currency', customer.currency);
                  }
                },
              })}
            >
              <option value="">Select customer</option>
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
          </div>

          <CurrencySelect
            id="currency"
            value={quoteCurrency}
            onChange={(value) => {
              currencyTouched.current = true;
              setQuoteCurrency(value);
              createForm.setValue('currency', value);
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue date</Label>
              <Input id="issueDate" type="date" {...createForm.register('issueDate')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid until</Label>
              <Input id="validUntil" type="date" {...createForm.register('validUntil')} />
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

      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create quote'}
        </Button>
        <Button type="button" variant="outline" onClick={discardDraft}>
          Discard changes
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/quotes">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { QuoteForm } from '@/components/quotes/quote-form';
import { formDraftContent, type FormDraftScope } from '@/lib/form-draft/model';
import { createFormDraftRepository, type FormDraftRepository } from '@/lib/form-draft/repository';
import type { Customer, Invoice } from '@/lib/api';
import type { StoredFormDraft } from '@/lib/offline/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const customer = { id: 'cus_1', name: 'Ada' } as Customer;
const identity = { userId: 'user_a', organizationId: 'org_a' };

class MemoryDurable {
  rows = new Map<string, StoredFormDraft>();
  async get(key: string) {
    return this.rows.get(key) ?? null;
  }
  async put(record: StoredFormDraft) {
    this.rows.set(record.key, record);
  }
  async delete(key: string) {
    this.rows.delete(key);
  }
}

function repository() {
  const local = window.localStorage;
  local.clear();
  return createFormDraftRepository({ durable: new MemoryDurable(), localStorage: local });
}

function invoiceScope(documentId = 'new'): FormDraftScope {
  return { userId: identity.userId, organizationId: identity.organizationId, kind: 'invoice', documentId };
}

describe('invoice and quote draft recovery', () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it('restores an invoice draft and does not show it on a quote or another invoice', async () => {
    const repo = repository();
    await repo.write({
      version: 1,
      scope: invoiceScope(),
      savedAt: Date.parse('2026-11-07T02:15:00Z'),
      imagesOmitted: false,
      content: formDraftContent({
        customerId: 'cus_1',
        number: 'INV-00042',
        currency: 'AED',
        currencyTouched: true,
        notes: 'Call the customer',
        discount: 3,
        shipping: 8,
        taxRate: 5,
        shippingMethod: 'AIR',
        shippingFromCountry: 'China',
        shippingToCountry: 'UAE',
        items: [
          {
            productId: null,
            name: 'Brass lamp',
            description: 'Matte finish',
            quantity: 2,
            unitPrice: 40,
            taxRate: 0,
            imageUrl: null,
          },
        ],
      }),
    });

    const created = render(
      <InvoiceForm
        mode="create"
        customers={[customer]}
        products={[]}
        defaultCurrency="USD"
        suggestedNumber="INV-00099"
        draftIdentity={identity}
        draftRepository={repo}
        onSubmit={async () => ({ id: 'inv_new' })}
      />,
    );
    expect(await screen.findByText(/Recovered unsaved invoice changes/)).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toHaveValue('Call the customer');
    expect(screen.getByLabelText('Customer *')).toHaveValue('cus_1');
    expect(screen.getByLabelText('Invoice number')).toHaveValue('INV-00042');
    expect(screen.getByLabelText('Currency')).toHaveValue('AED');
    expect(screen.getByPlaceholderText('Product or service name')).toHaveValue('Brass lamp');
    expect(screen.getByPlaceholderText(/Extra details/)).toHaveValue('Matte finish');
    created.unmount();

    const quoted = render(
      <QuoteForm
        mode="create"
        customers={[customer]}
        products={[]}
        defaultCurrency="USD"
        suggestedNumber="QUO-00001"
        draftIdentity={identity}
        draftRepository={repo}
        onSubmit={async () => ({ id: 'quo_new' })}
      />,
    );
    expect(await screen.findByLabelText('Notes')).toHaveValue('');
    expect(screen.queryByText(/Recovered unsaved quote changes/)).not.toBeInTheDocument();
    quoted.unmount();

    render(
      <InvoiceForm
        mode="edit"
        invoice={{ id: 'inv_2', number: 'INV-2', status: 'DRAFT', currency: 'USD', notes: '', items: [] } as unknown as Invoice}
        customers={[customer]}
        products={[]}
        draftIdentity={identity}
        draftRepository={repo}
        onSubmit={async () => undefined}
      />,
    );
    expect(await screen.findByLabelText('Notes')).toHaveValue('');
    expect(screen.queryByText(/Recovered unsaved invoice changes/)).not.toBeInTheDocument();
  });

  it('writes a draft 5 seconds after a change and does not submit the invoice', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'Date'] });
    vi.setSystemTime(new Date('2026-11-07T02:00:00Z'));
    const repo = repository();
    let writes = 0;
    const counting: FormDraftRepository = {
      read: (scope) => repo.read(scope),
      write: async (snapshot) => {
        writes += 1;
        return repo.write(snapshot);
      },
      remove: (scope) => repo.remove(scope),
    };
    const onSubmit = vi.fn(async () => ({ id: 'inv_new' }));
    render(
      <InvoiceForm
        mode="create"
        customers={[customer]}
        products={[]}
        defaultCurrency="USD"
        suggestedNumber="INV-00001"
        draftIdentity={identity}
        draftRepository={counting}
        onSubmit={onSubmit}
      />,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(writes).toBe(0);
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Do not lose this' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_999);
    });
    expect(writes).toBe(0);
    expect(onSubmit).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(writes).toBe(1);
    expect(onSubmit).not.toHaveBeenCalled();
    expect((await repo.read(invoiceScope()))?.content.notes).toBe('Do not lose this');
  });

  it('clears the draft after a successful explicit save and keeps it when save fails', async () => {
    const repo = repository();
    const onSubmit = vi.fn(async () => ({ id: 'inv_new' }));
    const view = render(
      <InvoiceForm
        mode="create"
        customers={[customer]}
        products={[]}
        defaultCurrency="USD"
        suggestedNumber="INV-00001"
        draftIdentity={identity}
        draftRepository={repo}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(await screen.findByLabelText('Customer *'), { target: { value: 'cus_1' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Ready to send' } });
    fireEvent.change(screen.getByPlaceholderText('Product or service name'), { target: { value: 'Lamp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create invoice' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(await repo.read(invoiceScope())).toBeNull();

    view.unmount();
    const failing = vi.fn(async () => {
      throw new Error('Network down');
    });
    render(
      <InvoiceForm
        mode="create"
        customers={[customer]}
        products={[]}
        defaultCurrency="USD"
        suggestedNumber="INV-00001"
        draftIdentity={identity}
        draftRepository={repo}
        onSubmit={failing}
      />,
    );
    fireEvent.change(await screen.findByLabelText('Notes'), { target: { value: 'Still here' } });
    fireEvent.change(screen.getByLabelText('Customer *'), { target: { value: 'cus_1' } });
    fireEvent.change(screen.getByPlaceholderText('Product or service name'), { target: { value: 'Lamp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create invoice' }));
    expect(await screen.findByText('Network down')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toHaveValue('Still here');
  });

  it('discards a restored draft only when asked', async () => {
    const repo = repository();
    await repo.write({
      version: 1,
      scope: invoiceScope('inv_9'),
      savedAt: Date.parse('2026-11-07T02:20:00Z'),
      imagesOmitted: false,
      content: formDraftContent({
        number: 'INV-9',
        status: 'DRAFT',
        currency: 'USD',
        currencyTouched: true,
        notes: 'Unsaved edit',
        items: [
          {
            productId: null,
            name: 'Edited line',
            description: '',
            quantity: 1,
            unitPrice: 5,
            taxRate: 0,
            imageUrl: null,
          },
        ],
      }),
    });
    render(
      <InvoiceForm
        mode="edit"
        invoice={
          {
            id: 'inv_9',
            number: 'INV-9',
            status: 'DRAFT',
            currency: 'USD',
            notes: 'Server note',
            items: [{ name: 'Server line', description: '', quantity: 1, unitPrice: 5, taxRate: 0 }],
          } as unknown as Invoice
        }
        customers={[customer]}
        products={[]}
        draftIdentity={identity}
        draftRepository={repo}
        onSubmit={async () => undefined}
      />,
    );
    expect(await screen.findByLabelText('Notes')).toHaveValue('Unsaved edit');
    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
    await waitFor(() => expect(screen.getByLabelText('Notes')).toHaveValue('Server note'));
    expect(screen.getByPlaceholderText('Product or service name')).toHaveValue('Server line');
    expect(await repo.read(invoiceScope('inv_9'))).toBeNull();
  });

  it('keeps the saved customer and lines when the customer list fails to load and a different customer is suggested', async () => {
    const repo = repository();
    await repo.write({
      version: 1,
      scope: invoiceScope(),
      savedAt: Date.parse('2026-11-08T01:00:00Z'),
      imagesOmitted: false,
      content: formDraftContent({
        customerId: 'cus_1',
        notes: 'Keep this draft',
        currency: 'AED',
        currencyTouched: true,
        items: [
          {
            productId: 'prod_1',
            name: 'Saved lamp',
            description: 'Do not wipe',
            quantity: 2,
            unitPrice: 15,
            taxRate: 0,
            imageUrl: null,
          },
        ],
      }),
    });
    const onSubmit = vi.fn(async () => ({ id: 'inv_new' }));
    render(
      <InvoiceForm
        mode="create"
        customers={[]}
        products={[]}
        defaultCurrency="USD"
        suggestedNumber="INV-00999"
        initialCustomerId="cus_other"
        draftIdentity={identity}
        draftRepository={repo}
        onSubmit={onSubmit}
      />,
    );
    expect(await screen.findByLabelText('Notes')).toHaveValue('Keep this draft');
    expect(screen.getByLabelText('Customer *')).toHaveValue('cus_1');
    expect(screen.getByPlaceholderText('Product or service name')).toHaveValue('Saved lamp');
    expect(screen.getByPlaceholderText(/Extra details/)).toHaveValue('Do not wipe');
    expect(onSubmit).not.toHaveBeenCalled();
    const stored = await repo.read(invoiceScope());
    expect(stored?.content.notes).toBe('Keep this draft');
    expect(stored?.content.customerId).toBe('cus_1');
    expect(stored?.content.items[0]?.name).toBe('Saved lamp');
  });
});

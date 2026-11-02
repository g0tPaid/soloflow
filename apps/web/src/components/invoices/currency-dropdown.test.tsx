import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { QuoteForm } from '@/components/quotes/quote-form';
import type { Customer, Invoice, Quote } from '@/lib/api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const customer = { id: 'cus_1', name: 'Ada' } as Customer;

beforeEach(() => {
  sessionStorage.clear();
});

describe('invoice and quote currency dropdown', () => {
  it('lets you choose a currency while creating an invoice', () => {
    render(
      <InvoiceForm
        mode="create"
        customers={[customer]}
        products={[]}
        defaultCurrency="USD"
        suggestedNumber="INV-00001"
        onSubmit={async () => ({ id: 'inv_1' })}
      />,
    );

    const menu = screen.getByLabelText('Currency');
    expect(menu).toHaveValue('USD');
    fireEvent.change(menu, { target: { value: 'AED' } });
    expect(menu).toHaveValue('AED');
  });

  it('lets you choose a currency while editing an invoice', () => {
    render(
      <InvoiceForm
        mode="edit"
        invoice={{ id: 'inv_1', number: 'INV-1', status: 'DRAFT', currency: 'CNY', items: [] } as unknown as Invoice}
        customers={[customer]}
        products={[]}
        onSubmit={async () => undefined}
      />,
    );

    expect(screen.getByLabelText('Currency')).toHaveValue('CNY');
  });

  it('lets you choose a currency while creating a quote', () => {
    render(
      <QuoteForm
        mode="create"
        customers={[customer]}
        products={[]}
        defaultCurrency="EUR"
        suggestedNumber="QUO-00001"
        onSubmit={async () => ({ id: 'quo_1' })}
      />,
    );

    const menu = screen.getByLabelText('Currency');
    expect(menu).toHaveValue('EUR');
    fireEvent.change(menu, { target: { value: 'GBP' } });
    expect(menu).toHaveValue('GBP');
  });

  it('lets you choose a currency while editing a quote', () => {
    render(
      <QuoteForm
        mode="edit"
        quote={{ id: 'quo_1', number: 'QUO-1', status: 'DRAFT', currency: 'AED', items: [] } as unknown as Quote}
        customers={[customer]}
        products={[]}
        onSubmit={async () => undefined}
      />,
    );

    expect(screen.getByLabelText('Currency')).toHaveValue('AED');
  });
});

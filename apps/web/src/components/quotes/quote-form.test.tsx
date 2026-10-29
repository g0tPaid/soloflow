import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteForm } from '@/components/quotes/quote-form';
import { writeQuoteDraft } from '@/lib/quote-draft';
import type { Customer, Quote } from '@/lib/api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const customer = { id: 'cus_1', name: 'Ada' } as Customer;

const quote = {
  id: 'quo_1',
  number: 'QUO-1',
  status: 'DRAFT',
  currency: 'AED',
  discount: 0,
  shipping: 0,
  taxRate: 0,
  notes: '',
  validUntil: null,
  items: [
    {
      id: 'li_1',
      name: 'Widget',
      description: 'Widget',
      quantity: 1,
      unitPrice: 10,
      taxRate: 0,
    },
  ],
} as unknown as Quote;

function renderEdit(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(
    <QuoteForm
      mode="edit"
      quote={quote}
      customers={[customer]}
      products={[]}
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('QuoteForm save', () => {
  it('saves a renamed line and keeps the name when the save fails', async () => {
    const onSubmit = renderEdit(vi.fn().mockRejectedValue(new Error('Could not save quote')));

    fireEvent.change(screen.getByPlaceholderText('Product or service name'), {
      target: { value: 'Special crate' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].items).toEqual([
      expect.objectContaining({ name: 'Special crate', description: 'Widget' }),
    ]);
    expect(screen.getByPlaceholderText('Product or service name')).toHaveValue('Special crate');
    expect(screen.getByText('Could not save quote')).toBeInTheDocument();
    expect(sessionStorage.getItem('soloflow-quote-draft:quo_1')).toContain('Special crate');
  });

  it('does not send a blank extra row', async () => {
    const onSubmit = renderEdit();

    fireEvent.click(screen.getByRole('button', { name: 'Add line' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].items).toHaveLength(1);
    expect(onSubmit.mock.calls[0][0].items[0].name).toBe('Widget');
  });

  it('still saves when the discount field is cleared', async () => {
    const onSubmit = renderEdit();

    fireEvent.change(screen.getByLabelText('Discount'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].discount).toBe(0);
  });

  it('shows a quote number error and does not save when the number is empty', async () => {
    const onSubmit = renderEdit();

    fireEvent.change(screen.getByLabelText('Quote number'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findAllByText('Quote number is required')).not.toHaveLength(0);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Product or service name')).toHaveValue('Widget');
  });

  it('restores an unsaved quote from this tab', () => {
    writeQuoteDraft('quo_1', {
      items: [{ name: 'Recovered crate', description: 'Rush', quantity: 2, unitPrice: 8, taxRate: 0 }],
      currency: 'AED',
      shipping: 15,
      taxRate: 5,
      number: 'QUO-1',
      status: 'DRAFT',
      validUntil: '',
      notes: 'Call before delivery',
      discount: 3,
      shippingMethod: 'AIR',
      shippingTerms: 'DDP',
      shippingFromCountry: 'CN',
      shippingToCountry: 'AE',
    });

    renderEdit();

    expect(screen.getByPlaceholderText('Product or service name')).toHaveValue('Recovered crate');
    expect(screen.getByText('Restored unsaved quote')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toHaveValue('Call before delivery');
  });
});

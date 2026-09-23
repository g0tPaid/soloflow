import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { InvoiceListFilterBar } from '@/components/invoices/invoice-list-filter-bar';

describe('InvoiceListFilterBar', () => {
  it('renders the status guide under the invoices header', () => {
    render(<InvoiceListFilterBar value={null} onChange={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Waiting for payment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paid' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Canceled' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'On the way' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Order complete/received' })).toBeInTheDocument();
  });

  it('selects a chip and clears it when clicked again', () => {
    const onChange = vi.fn();
    const { rerender } = render(<InvoiceListFilterBar value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'On the way' }));
    expect(onChange).toHaveBeenCalledWith('on_the_way');

    rerender(<InvoiceListFilterBar value="on_the_way" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'On the way' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'On the way' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
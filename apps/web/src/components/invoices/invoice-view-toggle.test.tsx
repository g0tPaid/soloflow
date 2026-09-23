import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  INVOICE_LIST_VIEW_STORAGE_KEY,
  InvoiceViewToggle,
  readInvoiceListView,
  writeInvoiceListView,
} from '@/components/invoices/invoice-view-toggle';

describe('InvoiceViewToggle', () => {
  it('switches between cards and list', () => {
    const onChange = vi.fn();
    render(<InvoiceViewToggle value="card" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Cards' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('remembers the preferred view in localStorage', () => {
    const storage = {
      getItem: vi.fn(() => 'list'),
      setItem: vi.fn(),
    };
    expect(readInvoiceListView(storage)).toBe('list');
    expect(readInvoiceListView({ getItem: () => 'card' })).toBe('card');
    expect(readInvoiceListView({ getItem: () => 'nope' })).toBe('card');
    writeInvoiceListView(storage, 'list');
    expect(storage.setItem).toHaveBeenCalledWith(INVOICE_LIST_VIEW_STORAGE_KEY, 'list');
  });
});
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CustomerView } from '@/components/customers/customer-view';
import type { Customer, Invoice } from '@/lib/api';

const customer: Customer = {
  id: 'cus_1',
  name: 'Acme Corp',
  email: 'billing@acme.com',
  phone: '+971500000',
  taxId: 'TRN-9',
  currency: 'AED',
  address: { line1: '1 Harbour', city: 'Dubai', country: 'UAE' },
};

const invoice = {
  id: 'inv_1',
  number: 'INV-1042',
  status: 'SENT',
  total: 120,
  currency: 'AED',
  issueDate: '2026-10-01T00:00:00.000Z',
} as Invoice;

describe('CustomerView', () => {
  it('shows contact details and invoices, with edit on a separate screen', () => {
    render(<CustomerView customer={customer} invoices={[invoice]} />);

    expect(screen.getByRole('heading', { name: 'Acme Corp' })).toBeInTheDocument();
    expect(screen.getByText('billing@acme.com')).toBeInTheDocument();
    expect(screen.getByText('+971500000')).toBeInTheDocument();
    expect(screen.getByText('TRN-9')).toBeInTheDocument();
    expect(screen.getByText(/1 Harbour/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'INV-1042' })).toHaveAttribute('href', '/invoices/inv_1');
    expect(screen.getByText('sent')).toBeInTheDocument();

    const edit = screen.getByRole('link', { name: 'Edit' });
    expect(edit).toHaveAttribute('href', '/customers/cus_1/edit');
    expect(edit.getAttribute('href')).not.toBe('/customers/cus_1');
  });
});

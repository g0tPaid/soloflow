import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';

describe('InvoiceStatusBadge', () => {
  it('shows a clear Cancelled label without striking it out', () => {
    render(<InvoiceStatusBadge status="CANCELLED" />);
    const badge = screen.getByText('Cancelled');
    expect(badge.className).not.toContain('line-through');
    expect(badge.className).toContain('bg-rose-600');
  });
});
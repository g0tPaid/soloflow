import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  applyOrderAction,
  applyOrderActionToPage,
  patchOrderActionCaches,
  restoreOrderActionCaches,
} from '@/lib/invoice-status-cache';

const sent = {
  id: 'inv-1',
  status: 'SENT',
  total: 80,
  amountPaid: 0,
  fulfillmentStatus: 'QC_COMPLETED',
  customFields: { note: 'keep' },
};

describe('order status cache', () => {
  it('cancels one invoice and remembers the status to restore', () => {
    expect(applyOrderAction(sent, 'cancel')).toEqual({
      ...sent,
      status: 'CANCELLED',
      customFields: { note: 'keep', statusBeforeCancel: 'SENT' },
    });
    expect(applyOrderAction({ ...sent, status: 'VOID' }, 'cancel').status).toBe('VOID');
  });

  it('reopens from the saved status and drops cancelled orders out of unpaid filters', () => {
    const cancelled = applyOrderAction(sent, 'cancel');
    expect(applyOrderAction(cancelled, 'reopen')).toMatchObject({
      status: 'SENT',
      customFields: { note: 'keep' },
    });

    const page = { data: [sent, { id: 'inv-2', status: 'DRAFT', total: 10, amountPaid: 0 }] };
    expect(applyOrderActionToPage(page, 'inv-1', 'cancel', 'waiting_for_payment')).toEqual({
      data: [{ id: 'inv-2', status: 'DRAFT', total: 10, amountPaid: 0 }],
    });
    expect(applyOrderActionToPage(undefined, 'inv-1', 'cancel', null)).toBeUndefined();
  });

  it('rolls the detail and list caches back when the request fails', () => {
    const client = new QueryClient();
    client.setQueryData(['invoice', 'inv-1', 'org-1'], { invoice: sent, syncState: 'synced' });
    client.setQueryData(['invoices', 'org-1', null], { data: [sent] });

    const context = patchOrderActionCaches(client, 'org-1', 'inv-1', 'cancel');
    expect(client.getQueryData<{ invoice: { status: string } }>(['invoice', 'inv-1', 'org-1'])?.invoice.status).toBe(
      'CANCELLED',
    );

    restoreOrderActionCaches(client, context);
    expect(client.getQueryData<{ invoice: { status: string } }>(['invoice', 'inv-1', 'org-1'])?.invoice.status).toBe(
      'SENT',
    );
    expect(client.getQueryData<{ data: Array<{ status: string }> }>(['invoices', 'org-1', null])?.data[0].status).toBe(
      'SENT',
    );
  });
});

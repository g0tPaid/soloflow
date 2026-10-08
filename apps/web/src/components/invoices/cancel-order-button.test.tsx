import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CancelOrderButton } from '@/components/invoices/cancel-order-button';

const cancelOrder = vi.fn();
const reopenOrder = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { accessToken: 'tok' }, status: 'authenticated' }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    invoices: {
      cancelOrder: (...args: unknown[]) => cancelOrder(...args),
      reopenOrder: (...args: unknown[]) => reopenOrder(...args),
    },
  },
}));

function renderButton(status: 'SENT' | 'CANCELLED' | 'VOID', online = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CancelOrderButton invoice={{ id: 'inv-1', status }} organizationId="org-1" online={online} />
    </QueryClientProvider>,
  );
  return client;
}

describe('CancelOrderButton', () => {
  beforeEach(() => {
    cancelOrder.mockReset();
    reopenOrder.mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('asks before cancelling and calls the cancel endpoint', async () => {
    cancelOrder.mockResolvedValue({ id: 'inv-1', status: 'CANCELLED' });
    renderButton('SENT');
    fireEvent.click(screen.getByRole('button', { name: 'Order cancelled' }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(cancelOrder).toHaveBeenCalledWith('tok', 'org-1', 'inv-1');
    });
    expect(reopenOrder).not.toHaveBeenCalled();
  });

  it('does nothing when confirmation is dismissed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderButton('SENT');
    fireEvent.click(screen.getByRole('button', { name: 'Order cancelled' }));
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it('becomes Reopen order on a cancelled invoice', async () => {
    reopenOrder.mockResolvedValue({ id: 'inv-1', status: 'SENT' });
    renderButton('CANCELLED');
    fireEvent.click(screen.getByRole('button', { name: 'Reopen order' }));
    await waitFor(() => {
      expect(reopenOrder).toHaveBeenCalledWith('tok', 'org-1', 'inv-1');
    });
  });

  it('stays disabled offline with a connection tooltip and does not call the API', () => {
    renderButton('SENT', false);
    const button = screen.getByRole('button', { name: 'Order cancelled' });
    expect(button).toBeDisabled();
    expect(screen.getByTitle('Needs a connection')).toBeInTheDocument();
    fireEvent.click(button);
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it('hides the action on a void invoice', () => {
    renderButton('VOID');
    expect(screen.queryByRole('button', { name: 'Order cancelled' })).not.toBeInTheDocument();
  });
});

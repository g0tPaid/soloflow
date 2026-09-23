import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalSearch, workspaceSearchHits } from '@/components/layout/global-search';
import { TopBar } from '@/components/layout/sidebar';

const push = vi.fn();
const searchQuery = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/dashboard',
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { accessToken: 'tok' }, status: 'authenticated' }),
}));

vi.mock('@/hooks/use-organization', () => ({
  useOrganizationId: () => ({ organizationId: 'org-1', isReady: true }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    search: {
      query: (...args: unknown[]) => searchQuery(...args),
    },
  },
}));

const results = {
  query: 'acme',
  customers: [
    {
      id: 'c1',
      name: 'Acme Corp',
      email: 'billing@acme.com',
      phone: null,
      subtitle: 'billing@acme.com',
      href: '/customers/c1',
    },
  ],
  invoices: [
    {
      id: 'i1',
      number: 'INV-1042',
      status: 'SENT',
      customerName: 'Acme Corp',
      total: 120,
      currency: 'USD',
      subtitle: 'Acme Corp · sent',
      href: '/invoices/i1',
    },
  ],
};

function renderSearch() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <GlobalSearch />
    </QueryClientProvider>,
  );
}

describe('workspaceSearchHits', () => {
  it('lists customers before invoices with detail links', () => {
    expect(workspaceSearchHits(results).map((hit) => hit.href)).toEqual(['/customers/c1', '/invoices/i1']);
  });
});

describe('TopBar', () => {
  it('keeps customer and invoice search in the dashboard header', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <TopBar />
      </QueryClientProvider>,
    );
    const search = screen.getByRole('combobox', { name: 'Search customers or invoices' });
    expect(search.closest('header')).not.toBeNull();
  });
});

describe('GlobalSearch', () => {
  beforeEach(() => {
    push.mockReset();
    searchQuery.mockReset();
    searchQuery.mockResolvedValue(results);
  });

  it('waits for two characters before searching', async () => {
    renderSearch();
    fireEvent.change(screen.getByRole('combobox', { name: 'Search customers or invoices' }), {
      target: { value: 'a' },
    });
    expect(await screen.findByText('Type at least 2 characters')).toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    expect(searchQuery).not.toHaveBeenCalled();
  });

  it('shows customer and invoice matches and opens the selected record', async () => {
    renderSearch();
    fireEvent.change(screen.getByRole('combobox', { name: 'Search customers or invoices' }), {
      target: { value: 'acme' },
    });

    expect(await screen.findByRole('option', { name: 'Acme Corp, billing@acme.com' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'INV-1042, Acme Corp · sent' })).toBeInTheDocument();
    expect(searchQuery).toHaveBeenCalledWith('tok', 'org-1', 'acme');

    fireEvent.click(screen.getByRole('option', { name: 'INV-1042, Acme Corp · sent' }));
    expect(push).toHaveBeenCalledWith('/invoices/i1');
  });
});

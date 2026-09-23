import { SearchService } from './search.service';

describe('SearchService', () => {
  const prisma = {
    customer: { findMany: jest.fn() },
    invoice: { findMany: jest.fn() },
  };
  const service = new SearchService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not query when the term is too short or the organization is missing', async () => {
    await expect(service.search('org-1', ' a ')).resolves.toEqual({
      query: '',
      customers: [],
      invoices: [],
    });
    await expect(service.search('', 'acme')).resolves.toEqual({
      query: 'acme',
      customers: [],
      invoices: [],
    });
    expect(prisma.customer.findMany).not.toHaveBeenCalled();
    expect(prisma.invoice.findMany).not.toHaveBeenCalled();
  });

  it('scopes name, email, phone, and invoice number lookups to the organization', async () => {
    prisma.customer.findMany.mockResolvedValue([
      { id: 'cus_1', name: 'Acme Corp', email: 'billing@acme.com', phone: null },
    ]);
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: 'inv_1',
        number: 'INV-1042',
        status: 'SENT',
        total: '120.50',
        currency: 'USD',
        customer: { name: 'Acme Corp' },
      },
    ]);

    const result = await service.search('org-1', '  Acme  ');

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org-1',
          isActive: true,
          OR: [
            { name: { contains: 'Acme', mode: 'insensitive' } },
            { email: { contains: 'Acme', mode: 'insensitive' } },
            { phone: { contains: 'Acme', mode: 'insensitive' } },
          ],
        },
      }),
    );
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org-1',
          OR: [
            { number: { contains: 'Acme', mode: 'insensitive' } },
            { customer: { name: { contains: 'Acme', mode: 'insensitive' } } },
            { customer: { email: { contains: 'Acme', mode: 'insensitive' } } },
          ],
        },
      }),
    );
    expect(result).toEqual({
      query: 'Acme',
      customers: [
        {
          id: 'cus_1',
          name: 'Acme Corp',
          email: 'billing@acme.com',
          phone: null,
          subtitle: 'billing@acme.com',
          href: '/customers/cus_1',
        },
      ],
      invoices: [
        {
          id: 'inv_1',
          number: 'INV-1042',
          status: 'SENT',
          customerName: 'Acme Corp',
          total: 120.5,
          currency: 'USD',
          subtitle: 'Acme Corp · sent',
          href: '/invoices/inv_1',
        },
      ],
    });
  });
});

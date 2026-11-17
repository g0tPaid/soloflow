import { BadRequestException, ConflictException } from '@nestjs/common';
import { InvoiceStatus, QuoteStatus } from '@flowbooks/database';
import { QuotesService } from './quotes.service';

describe('revising an invoiced quote', () => {
  const issuedQuote = {
    id: 'quote_1',
    organizationId: 'org_1',
    status: QuoteStatus.CONVERTED,
    convertedInvoiceId: 'invoice_1',
    number: 'QUO-00001',
    updatedAt: new Date('2026-11-17T00:00:00Z'),
    createdAt: new Date('2026-11-16T00:00:00Z'),
    issueDate: new Date('2026-11-16T00:00:00Z'),
    customerId: 'customer_1',
    customer: { id: 'customer_1', name: 'Buyer' },
    currency: 'USD',
    subtotal: 20,
    discount: 0,
    shipping: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 20,
    items: [{ name: 'Widget', description: 'Widget', quantity: 1, unitPrice: 20, amount: 20 }],
  };

  let currentQuote: { status: QuoteStatus } & Omit<typeof issuedQuote, 'status'>;
  let claimed: { count: number };
  let service: QuotesService;
  let versions: Array<{ quoteId: string; version: number; savedAt: Date; snapshot: { quote: { shipping: number; total: number }; organization: { name: string } } }>;
  const quote = {
    update: jest.fn(async ({ data }) => {
      currentQuote = { ...currentQuote, ...data };
      return currentQuote;
    }),
    updateMany: jest.fn(async () => claimed),
  };
  const invoice = { create: jest.fn(async () => ({ id: 'invoice_2' })) };
  const organizationSettings = {
    findUnique: jest.fn(async () => ({ invoiceNextNum: 2 })),
    upsert: jest.fn(),
  };
  const organization = { findUniqueOrThrow: jest.fn(async () => ({ id: 'org_1', name: 'Example Company' })) };
  const quotePdfVersion = {
    findFirst: jest.fn(async ({ where }) => where.version
      ? versions.find((entry) => entry.version === where.version) ?? null
      : versions.at(-1) ?? null),
    create: jest.fn(async ({ data }) => { versions.push(data); return data; }),
  };
  const tx = { quote, invoice, organizationSettings, organization, quotePdfVersion };
  const prisma = {
    ...tx,
    $transaction: (run: (transaction: typeof tx) => unknown) => run(tx),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    currentQuote = { ...issuedQuote };
    claimed = { count: 1 };
    versions = [];
    service = new QuotesService(prisma as never);
    jest.spyOn(service, 'findOne').mockImplementation(async () => currentQuote as never);
  });

  it('requires a saved edit before invoicing the quote again', async () => {
    await expect(service.convertToInvoice('org_1', 'quote_1')).rejects.toThrow(BadRequestException);
    await expect(service.update('org_1', 'quote_1', { status: QuoteStatus.DRAFT })).rejects.toThrow(BadRequestException);
    expect(invoice.create).not.toHaveBeenCalled();
  });

  it('opens a converted quote for revision and creates a new draft with the saved values', async () => {
    const revised = await service.update('org_1', 'quote_1', { status: QuoteStatus.CONVERTED, shipping: 5 });
    expect(revised).toMatchObject({ status: QuoteStatus.DRAFT, total: 25, convertedInvoiceId: 'invoice_1' });

    const result = await service.convertToInvoice('org_1', 'quote_1');
    expect(result.quote).toMatchObject({ status: QuoteStatus.CONVERTED, convertedInvoiceId: 'invoice_2' });
    expect(invoice.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ number: 'INV-00002', shipping: 5, total: 25, status: InvoiceStatus.DRAFT }),
    }));
    await expect(service.convertToInvoice('org_1', 'quote_1')).rejects.toThrow(BadRequestException);
    expect(invoice.create).toHaveBeenCalledTimes(1);
  });

  it('blocks a concurrent conversion before creating a duplicate invoice', async () => {
    currentQuote = { ...issuedQuote, status: QuoteStatus.DRAFT };
    claimed = { count: 0 };
    await expect(service.convertToInvoice('org_1', 'quote_1')).rejects.toThrow(ConflictException);
    expect(invoice.create).not.toHaveBeenCalled();
  });

  it('preserves the original quote and then saves only distinct PDF revisions', async () => {
    await service.update('org_1', 'quote_1', { shipping: 5 });
    await service.update('org_1', 'quote_1', { shipping: 10 });
    await service.update('org_1', 'quote_1', { shipping: 10 });
    await service.update('org_1', 'quote_1', { status: QuoteStatus.SENT });

    expect(versions.map(({ version, snapshot }) => [version, snapshot.quote.shipping, snapshot.quote.total]))
      .toEqual([[1, 0, 20], [2, 5, 25], [3, 10, 30]]);
    await expect(service.getPdfVersion('org_1', 'quote_1', 1)).resolves.toMatchObject({
      quote: { total: 20 }, organization: { name: 'Example Company' },
    });
    await expect(service.getPdfVersion('org_1', 'quote_1', 3)).resolves.toMatchObject({ quote: { total: 30 } });
  });
});

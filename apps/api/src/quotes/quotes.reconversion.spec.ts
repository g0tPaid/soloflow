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
    customerId: 'customer_1',
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
  const prisma = {
    quote,
    organizationSettings,
    $transaction: (run: (tx: { quote: typeof quote; invoice: typeof invoice; organizationSettings: typeof organizationSettings }) => unknown) =>
      run({ quote, invoice, organizationSettings }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    currentQuote = { ...issuedQuote };
    claimed = { count: 1 };
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
});

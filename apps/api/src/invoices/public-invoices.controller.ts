import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { verifyPublicInvoiceToken } from './public-invoice-token';

/** Expose only invoice fields a recipient needs. Never expose internal costs,
 * vendor data, audit logs, authentication tokens or organization memberships. */
function pick(source: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  const object = source as Record<string, unknown>;
  return Object.fromEntries(keys.filter((key) => object[key] !== undefined).map((key) => [key, object[key]]));
}

@Controller('public/invoices')
export class PublicInvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('download/:token')
  async getForDownload(@Param('token') token: string) {
    const claims = verifyPublicInvoiceToken(token);
    if (!claims) throw new NotFoundException('This invoice link is invalid or expired.');

    const [record, org] = await Promise.all([
      this.invoices.findOne(claims.organizationId, claims.invoiceId),
      this.prisma.organization.findUnique({
        where: { id: claims.organizationId },
        include: { settings: true },
      }),
    ]);
    if (!org || record.organizationId !== org.id) {
      throw new NotFoundException('Invoice not found');
    }

    const invoice = record as unknown as Record<string, unknown>;
    const branding = org.settings?.branding;
    const itemFields = [
      'id', 'name', 'description', 'imageUrl', 'quantity', 'unitPrice', 'taxRate', 'amount',
    ];
    const invoiceFields = [
      'id', 'organizationId', 'number', 'status', 'issueDate', 'dueDate',
      'currency', 'subtotal', 'taxAmount', 'taxRate', 'shipping', 'discount',
      'total', 'amountPaid', 'shippingMethod', 'shippingTerms',
      'shippingFromCountry', 'shippingToCountry', 'notes', 'createdAt', 'updatedAt',
      'endRecipientName', 'endRecipientAddress', 'shipmentContact',
    ];

    return {
      invoice: {
        ...pick(invoice, invoiceFields),
        customer: pick(invoice.customer, ['id', 'name', 'email', 'phone', 'taxId', 'address', 'isDropshipper']),
        items: Array.isArray(invoice.items)
          ? invoice.items.map((item: unknown) => ({
              ...pick(item, itemFields),
              product: pick(
                item && typeof item === 'object' ? (item as Record<string, unknown>).product : null,
                ['imageUrl'],
              ),
            }))
          : [],
        payments: Array.isArray(invoice.payments)
          ? invoice.payments.map((payment: unknown) =>
              pick(payment, ['id', 'amount', 'paidAt', 'voidedAt', 'method', 'createdAt']))
          : [],
      },
      org: {
        id: org.id,
        name: org.name,
        logo: org.logo,
        settings: {
          branding: pick(branding, [
            'address', 'phone', 'email', 'trn', 'website',
            'invoiceAccent', 'invoiceSignature', 'invoiceBanner',
            'invoiceOffer1', 'invoiceOffer2', 'invoiceOffer3', 'invoiceOffer4',
          ]),
        },
      },
    };
  }
}

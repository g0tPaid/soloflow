import { Prisma, QuoteStatus } from '@flowbooks/database';

export const quotePdfRelations = {
  customer: true,
  items: { include: { product: true }, orderBy: { sortOrder: 'asc' as const } },
} as const;

type QuoteWithDetails = Prisma.QuoteGetPayload<{ include: typeof quotePdfRelations }>;

export function quoteForPdfHistory(quote: QuoteWithDetails) {
  const { id, organizationId, customerId, number, issueDate, validUntil, currency, subtotal,
    taxAmount, taxRate, shipping, discount, total, shippingMethod, shippingTerms,
    shippingFromCountry, shippingToCountry, notes, createdAt, customer, items } = quote;
  return {
    id, organizationId, customerId, number, issueDate, validUntil, currency, subtotal,
    taxAmount, taxRate, shipping, discount, total, shippingMethod, shippingTerms,
    shippingFromCountry, shippingToCountry, notes, createdAt, updatedAt: createdAt,
    status: QuoteStatus.DRAFT,
    customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, taxId: customer.taxId, address: customer.address },
    items: items.map((item, index) => ({
      id: `${id}-pdf-${index}`,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl ?? item.product?.imageUrl ?? null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      amount: item.amount,
    })),
  };
}

export function quotePdfOrganization(prisma: Prisma.TransactionClient, id: string) {
  return prisma.organization.findUniqueOrThrow({
    where: { id },
    select: {
      id: true, name: true, slug: true, logo: true,
      settings: { select: { currency: true, timezone: true, branding: true } },
    },
  });
}

export function quotePdfSnapshot(quote: QuoteWithDetails, organization: Awaited<ReturnType<typeof quotePdfOrganization>>) {
  return JSON.parse(JSON.stringify({ quote: quoteForPdfHistory(quote), organization })) as Prisma.InputJsonValue;
}

/** Keep equality stable after JSONB has reordered object keys. */
export function canonicalJson(_key: string, value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}

import { Prisma } from '@flowbooks/database';

/**
 * Sales invoices only. Vendor expenses are invoice rows with a vendor and no customer.
 * A row that has a customer stays, even when vendorId is also set.
 */
export function salesInvoiceWhere(organizationId: string): Prisma.InvoiceWhereInput {
  return {
    organizationId,
    NOT: {
      AND: [{ vendorId: { not: null } }, { customerId: null }],
    },
  };
}

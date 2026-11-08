/**
 * Expense records are vendor bills stored on the invoice table:
 * a vendor is set and no customer is. A customer invoice stays in the
 * sales list even if a vendor id is also present.
 */
export function isVendorExpenseInvoice(record: {
  customerId?: string | null;
  vendorId?: string | null;
}): boolean {
  const vendorId = typeof record.vendorId === 'string' ? record.vendorId.trim() : '';
  const customerId = typeof record.customerId === 'string' ? record.customerId.trim() : '';
  return vendorId.length > 0 && customerId.length === 0;
}

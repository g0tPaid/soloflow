import type { ExpenseDetail, Invoice, Organization } from '@/lib/api';

/** Data the shared PDF documents render. Safe to import from the browser. */
export type LoadedPrintDocument =
  | { type: 'invoices'; invoice: Invoice; org: Organization }
  | { type: 'receipts'; invoice: Invoice; org: Organization }
  | { type: 'expenses'; expense: ExpenseDetail }
  | { type: 'quotes'; invoice: Invoice; org: Organization };

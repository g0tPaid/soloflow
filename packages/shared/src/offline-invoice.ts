/** Shown on the device until the server assigns a real invoice number. */
export const PROVISIONAL_INVOICE_NUMBER = 'Pending';

const PROVISIONAL_NUMBERS = new Set(['pending', 'offline']);

/**
 * Offline invoices must not reserve a server number. These labels are display-only
 * and are never stored as the invoice number.
 */
export function isProvisionalInvoiceNumber(number: string | null | undefined): boolean {
  if (!number) return false;
  return PROVISIONAL_NUMBERS.has(number.trim().toLowerCase());
}

/** UUID-shaped keys and other URL-safe ids from the device. */
export const CLIENT_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;

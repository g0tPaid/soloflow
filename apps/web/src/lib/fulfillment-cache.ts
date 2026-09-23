import type { FulfillmentStatus } from '@flowbooks/shared';

type InvoiceLike = {
  id: string;
  fulfillmentStatus?: FulfillmentStatus | null;
};

type InvoicePage<T extends InvoiceLike> = {
  data: T[];
};

/** Clicking the active stage sends null. Tracking-only saves omit the field. */
export function fulfillmentStatusPatch(
  data: { fulfillmentStatus?: FulfillmentStatus | null },
): FulfillmentStatus | null | undefined {
  return data.fulfillmentStatus;
}

export function applyFulfillmentStatus<T extends InvoiceLike>(
  invoice: T,
  fulfillmentStatus: FulfillmentStatus | null,
): T {
  return { ...invoice, fulfillmentStatus };
}

export function applyFulfillmentStatusToPage<T extends InvoiceLike>(
  page: InvoicePage<T> | undefined,
  invoiceId: string,
  fulfillmentStatus: FulfillmentStatus | null,
): InvoicePage<T> | undefined {
  if (!page) return page;
  return {
    ...page,
    data: page.data.map((invoice) =>
      invoice.id === invoiceId ? applyFulfillmentStatus(invoice, fulfillmentStatus) : invoice,
    ),
  };
}

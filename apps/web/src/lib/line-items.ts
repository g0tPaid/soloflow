export interface LineItemInput {
  productId?: string | null;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  imageUrl?: string | null;
}



export function calcLineAmount(item: LineItemInput): number {

  return item.quantity * item.unitPrice;

}



export function calcLineTotal(item: LineItemInput): number {

  return calcLineAmount(item);

}



export function calcInvoiceTotals(items: LineItemInput[], discount = 0, shipping = 0) {

  const subtotal = items.reduce((sum, item) => sum + calcLineAmount(item), 0);

  const total = subtotal + shipping - discount;

  return { subtotal, shipping, total: Math.max(0, total) };

}

export function calcLineCost(quantity: number, unitCost: number): number {
  const qty = Number.isFinite(quantity) ? quantity : 0;
  const cost = Number.isFinite(unitCost) ? unitCost : 0;
  return qty * cost;
}

export function calcInvoiceCostTotal(
  items: Array<{ quantity: number | string; unitCost?: number | string | null }>,
): number {
  return items.reduce(
    (sum, item) => sum + calcLineCost(Number(item.quantity), Number(item.unitCost ?? 0)),
    0,
  );
}

export function calcProfit(revenue: number, totalCost: number): number {
  return revenue - totalCost;
}

function sanitizeNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/** Split stored invoice line item into name + description (handles legacy merged rows). */
export function parseStoredLineItem(item: {
  name?: string | null;
  description?: string | null;
}): { name: string; description: string } {
  const name = item.name?.trim() || '';
  let description = item.description?.trim() || '';

  if (name && description.startsWith(`${name} — `)) {
    description = description.slice(name.length + 3).trim();
  } else if (!name && description.includes(' — ')) {
    const splitAt = description.indexOf(' — ');
    return {
      name: description.slice(0, splitAt).trim(),
      description: description.slice(splitAt + 3).trim(),
    };
  }

  if (!name && description) {
    return { name: description, description: '' };
  }

  return { name, description };
}

/** Map UI line items to the API payload. */
export function toApiLineItems(
  items: Array<
    Partial<LineItemInput> & {
      description?: string;
      quantity: number;
      unitPrice: number;
    }
  >,
) {
  return items.map((item) => {
    const name = item.name?.trim() || '';
    const details = item.description?.trim() || '';

    return {
      productId: item.productId ?? null,
      name: name || undefined,
      description: details || name || 'Item',
      quantity: Math.max(sanitizeNumber(item.quantity, 1), 0.0001),
      unitPrice: Math.max(sanitizeNumber(item.unitPrice), 0),
      taxRate: sanitizeNumber(item.taxRate),
      imageUrl: item.imageUrl ?? null,
    };
  });
}



import { describe, expect, it } from 'vitest';
import { linesForSave, toApiLineItems, type LineItemInput } from '@/lib/line-items';

function line(patch: Partial<LineItemInput> = {}): LineItemInput {
  return {
    name: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    taxRate: 0,
    ...patch,
  };
}

describe('linesForSave', () => {
  it('drops a blank extra row and keeps a named line', () => {
    const saved = linesForSave([line({ name: 'Crate' }), line()]);
    expect(saved).toEqual([line({ name: 'Crate' })]);
  });

  it('keeps a priced line that has no name yet', () => {
    expect(linesForSave([line({ unitPrice: 12 })])).toHaveLength(1);
  });
});

describe('toApiLineItems', () => {
  it('turns an empty product id into null and fills a description', () => {
    expect(
      toApiLineItems([line({ name: 'Crate', productId: '', quantity: 2, unitPrice: 5 })]),
    ).toEqual([
      {
        productId: null,
        name: 'Crate',
        description: 'Crate',
        quantity: 2,
        unitPrice: 5,
        taxRate: 0,
        imageUrl: null,
      },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { balanceGroupsFromSums } from './customer-balance';

describe('balanceGroupsFromSums', () => {
  it('keeps each currency separate and drops a fully paid group', () => {
    expect(
      balanceGroupsFromSums([
        { currency: 'usd', total: 100, amountPaid: 40, count: 2 },
        { currency: 'CNY', total: 70, amountPaid: 70, count: 1 },
        { currency: 'AED', total: 25, amountPaid: 0, count: 1 },
      ]),
    ).toEqual([
      { currency: 'AED', balanceDue: 25, invoiceCount: 1 },
      { currency: 'USD', balanceDue: 60, invoiceCount: 2 },
    ]);
  });
});

import { roundMoney } from './fx';
import { toMoneyNumber } from './invoice-balance';

/** Statuses that are not money the customer currently owes. */
export const BALANCE_EXCLUDED_STATUSES = ['CANCELLED', 'VOID', 'DRAFT'] as const;

const PAID_EPS = 0.005;

export interface CustomerBalanceGroup {
  currency: string;
  balanceDue: number;
  invoiceCount: number;
}

/**
 * Turn per-currency sums into balances. Currencies are never added together.
 * A group with nothing left to pay is omitted.
 */
export function balanceGroupsFromSums(
  rows: Array<{ currency?: string | null; total?: unknown; amountPaid?: unknown; count?: number }>,
): CustomerBalanceGroup[] {
  return rows
    .map((row) => {
      const total = toMoneyNumber(row.total as never);
      const paid = toMoneyNumber(row.amountPaid as never);
      return {
        currency: (row.currency || 'USD').toUpperCase(),
        balanceDue: roundMoney(Math.max(0, total - paid)),
        invoiceCount: row.count ?? 0,
      };
    })
    .filter((row) => row.balanceDue > PAID_EPS)
    .sort((left, right) => left.currency.localeCompare(right.currency));
}

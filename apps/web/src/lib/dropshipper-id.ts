import type { Customer } from '@/lib/api';

export function customerDropshipperId(customer: Customer) {
  if (!customer.isDropshipper || !customer.dropshipperNumber) return null;
  return [customer.dropshipperPrefix, customer.dropshipperNumber].filter(Boolean).join('-');
}

export const CUSTOMER_TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const;
export type CustomerTier = typeof CUSTOMER_TIERS[number];
export const CUSTOMER_TIER_LABELS: Record<CustomerTier, string> = {
  BRONZE: 'Bronze Tier', SILVER: 'Silver Tier', GOLD: 'Gold Tier', PLATINUM: 'Platinum Tier',
};

export function isCustomerTier(value: unknown): value is CustomerTier {
  return typeof value === 'string' && (CUSTOMER_TIERS as readonly string[]).includes(value);
}

export function customerTierFromFields(fields: unknown): CustomerTier {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return 'SILVER';
  const value = (fields as Record<string, unknown>).customerTier;
  return isCustomerTier(value) ? value : 'SILVER';
}

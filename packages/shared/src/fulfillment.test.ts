import { describe, expect, it } from 'vitest';
import { FULFILLMENT_STATUS_VALUES } from './constants';
import {
  canEditInternationalTracking,
  canEditLocalTracking,
  fulfillmentRank,
  fulfillmentStatusLabel,
  fulfillmentTrackingError,
  normalizeTrackingNumber,
} from './fulfillment';

describe('fulfillment', () => {
  it('keeps the six stages in merchant order', () => {
    expect(FULFILLMENT_STATUS_VALUES).toEqual([
      'LOCAL_ORDERING_COMPLETED',
      'QC_COMPLETED',
      'SHIPPED_TO_CHINA_CENTER',
      'SHIPPED_INTERNATIONAL',
      'CUSTOMER_RECEIVED',
      'ORDER_COMPLETED',
    ]);
    expect(fulfillmentRank(null)).toBe(-1);
    expect(fulfillmentRank('ORDER_COMPLETED')).toBe(5);
    expect(fulfillmentStatusLabel(null)).toBe('Not started');
    expect(fulfillmentStatusLabel('QC_COMPLETED')).toBe('QC completed');
  });

  it('unlocks local tracking at the China shipping-center stage', () => {
    expect(canEditLocalTracking('QC_COMPLETED')).toBe(false);
    expect(canEditLocalTracking('SHIPPED_TO_CHINA_CENTER')).toBe(true);
    expect(canEditLocalTracking('ORDER_COMPLETED')).toBe(true);
    expect(canEditInternationalTracking('SHIPPED_TO_CHINA_CENTER')).toBe(false);
    expect(canEditInternationalTracking('SHIPPED_INTERNATIONAL')).toBe(true);
    expect(canEditInternationalTracking('CUSTOMER_RECEIVED')).toBe(true);
  });

  it('normalizes blank tracking numbers to null', () => {
    expect(normalizeTrackingNumber('  SF123  ')).toBe('SF123');
    expect(normalizeTrackingNumber('   ')).toBeNull();
    expect(normalizeTrackingNumber(null)).toBeNull();
  });

  it('rejects tracking numbers before the matching ship step', () => {
    expect(
      fulfillmentTrackingError({
        status: 'QC_COMPLETED',
        localTrackingNumber: 'SF1',
      }),
    ).toMatch(/China/);
    expect(
      fulfillmentTrackingError({
        status: 'SHIPPED_TO_CHINA_CENTER',
        localTrackingNumber: 'SF1',
        internationalTrackingNumber: 'INT1',
      }),
    ).toMatch(/international/i);
    expect(
      fulfillmentTrackingError({
        status: 'SHIPPED_INTERNATIONAL',
        localTrackingNumber: 'SF1',
        internationalTrackingNumber: 'INT1',
      }),
    ).toBeNull();
    expect(
      fulfillmentTrackingError({
        status: 'QC_COMPLETED',
        localTrackingNumber: '   ',
      }),
    ).toBeNull();
  });
});
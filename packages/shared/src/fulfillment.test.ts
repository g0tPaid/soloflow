import { describe, expect, it } from 'vitest';
import { FULFILLMENT_STATUS_VALUES } from './constants';
import {
  canEditInternationalTracking,
  canEditLocalTracking,
  formatFulfillmentHistoryLine,
  formatFulfillmentHistoryTimestamp,
  fulfillmentPressEvents,
  fulfillmentRank,
  fulfillmentStatusLabel,
  fulfillmentTrackingError,
  nextFulfillmentSelection,
  normalizeTrackingNumber,
  shipmentProgress,
  shipmentProgressLabel,
} from './fulfillment';

describe('fulfillment', () => {
  it('advances automatically after payment and each completed checkpoint',()=>{
    expect(shipmentProgressLabel(null,'SENT')).toBe('Awaiting payment');
    expect(shipmentProgressLabel(null,'PAID')).toBe('Local ordering in progress');
    expect(shipmentProgress(null,'PAID')[0].state).toBe('completed');
    expect(shipmentProgressLabel('LOCAL_ORDERING_COMPLETED','PAID')).toBe('Awaiting warehouse arrival');
    expect(shipmentProgressLabel('WAREHOUSE_RECEIVED','PAID')).toBe('Quality check in progress');
    expect(shipmentProgress('QC_COMPLETED','PAID').find(s=>s.value==='WAREHOUSE_RECEIVED')?.state).toBe('completed');
    expect(shipmentProgressLabel('SHIPPED_INTERNATIONAL','PAID')).toBe('Awaiting reception');
    expect(shipmentProgressLabel('ORDER_COMPLETED','PAID')).toBe('Order completed');
    expect(shipmentProgressLabel('SHIPPED_TO_CHINA_CENTER','PAID','LOCAL')).toBe('Awaiting reception');
    expect(shipmentProgress('SHIPPED_TO_CHINA_CENTER','PAID','LOCAL').some(s=>s.value==='SHIPPED_INTERNATIONAL')).toBe(false);
  });
  it('keeps the eight stages in merchant order', () => {
    expect(FULFILLMENT_STATUS_VALUES).toEqual([
      'AWAITING_PAYMENT',
      'LOCAL_ORDERING_COMPLETED',
      'WAREHOUSE_RECEIVED',
      'QC_COMPLETED',
      'SHIPPED_TO_CHINA_CENTER',
      'SHIPPED_INTERNATIONAL',
      'CUSTOMER_RECEIVED',
      'ORDER_COMPLETED',
    ]);
    expect(fulfillmentRank(null)).toBe(-1);
    expect(fulfillmentRank('AWAITING_PAYMENT')).toBe(0);
    expect(fulfillmentStatusLabel('AWAITING_PAYMENT')).toBe('Awaiting payment');
    expect(fulfillmentRank('ORDER_COMPLETED')).toBe(7);
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

  it('toggles the active stage off and selects any other stage', () => {
    expect(nextFulfillmentSelection(null, 'LOCAL_ORDERING_COMPLETED')).toBe('LOCAL_ORDERING_COMPLETED');
    expect(nextFulfillmentSelection('LOCAL_ORDERING_COMPLETED', 'LOCAL_ORDERING_COMPLETED')).toBeNull();
    expect(nextFulfillmentSelection('LOCAL_ORDERING_COMPLETED', 'QC_COMPLETED')).toBe('QC_COMPLETED');
    expect(nextFulfillmentSelection('ORDER_COMPLETED', 'ORDER_COMPLETED')).toBeNull();
  });

  it('records an on and off event for each stage change', () => {
    expect(fulfillmentPressEvents(null, 'LOCAL_ORDERING_COMPLETED')).toEqual([
      { status: 'LOCAL_ORDERING_COMPLETED', action: 'ON' },
    ]);
    expect(fulfillmentPressEvents('LOCAL_ORDERING_COMPLETED', null)).toEqual([
      { status: 'LOCAL_ORDERING_COMPLETED', action: 'OFF' },
    ]);
    expect(fulfillmentPressEvents('LOCAL_ORDERING_COMPLETED', 'QC_COMPLETED')).toEqual([
      { status: 'LOCAL_ORDERING_COMPLETED', action: 'OFF' },
      { status: 'QC_COMPLETED', action: 'ON' },
    ]);
    expect(fulfillmentPressEvents('QC_COMPLETED', 'QC_COMPLETED')).toEqual([]);
    expect(fulfillmentPressEvents(null, null)).toEqual([]);
  });

  it('formats history in the organization timezone and labels UTC', () => {
    const createdAt = '2026-09-23T11:41:00.000Z';
    expect(formatFulfillmentHistoryTimestamp(createdAt, 'UTC')).toMatch(/11:41/);
    expect(formatFulfillmentHistoryTimestamp(createdAt, 'UTC')).toMatch(/UTC/);
    expect(formatFulfillmentHistoryTimestamp(createdAt, 'Asia/Dubai')).toMatch(/15:41/);
    expect(formatFulfillmentHistoryTimestamp(createdAt, 'Not/AZone')).toMatch(/UTC/);
    expect(
      formatFulfillmentHistoryLine(
        { status: 'LOCAL_ORDERING_COMPLETED', action: 'OFF', createdAt },
        'UTC',
      ),
    ).toMatch(/2\. Local ordering completed turned off/);
    expect(
      formatFulfillmentHistoryLine(
        { status: 'QC_COMPLETED', action: 'ON', createdAt },
        'Asia/Dubai',
      ),
    ).toMatch(/4\. QC completed turned on/);
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

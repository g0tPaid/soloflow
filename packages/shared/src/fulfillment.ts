import {
  FULFILLMENT_STATUSES,
  FULFILLMENT_STATUS_VALUES,
  INTERNATIONAL_TRACKING_STATUS,
  LOCAL_TRACKING_STATUS,
  type FulfillmentStatus,
} from './constants';

export function isFulfillmentStatus(value: string): value is FulfillmentStatus {
  return (FULFILLMENT_STATUS_VALUES as readonly string[]).includes(value);
}

/** -1 when fulfillment has not started. Otherwise the zero-based stage index. */
export function fulfillmentRank(status: string | null | undefined): number {
  if (!status) return -1;
  return FULFILLMENT_STATUS_VALUES.indexOf(status as FulfillmentStatus);
}

export function fulfillmentStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Not started';
  return FULFILLMENT_STATUSES.find((stage) => stage.value === status)?.label ?? 'Not started';
}

export function canEditLocalTracking(status: string | null | undefined): boolean {
  const rank = fulfillmentRank(status);
  return rank >= 0 && rank >= fulfillmentRank(LOCAL_TRACKING_STATUS);
}

export function canEditInternationalTracking(status: string | null | undefined): boolean {
  const rank = fulfillmentRank(status);
  return rank >= 0 && rank >= fulfillmentRank(INTERNATIONAL_TRACKING_STATUS);
}

export function normalizeTrackingNumber(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Rejects a non-empty tracking number when the resulting fulfillment stage
 * has not reached the matching ship step. Omitted fields are not checked.
 */
export function fulfillmentTrackingError(input: {
  status: string | null | undefined;
  localTrackingNumber?: string | null;
  internationalTrackingNumber?: string | null;
}): string | null {
  if (
    input.localTrackingNumber !== undefined &&
    normalizeTrackingNumber(input.localTrackingNumber) &&
    !canEditLocalTracking(input.status)
  ) {
    return 'Add a China tracking number after the order ships to the shipping center in China.';
  }
  if (
    input.internationalTrackingNumber !== undefined &&
    normalizeTrackingNumber(input.internationalTrackingNumber) &&
    !canEditInternationalTracking(input.status)
  ) {
    return 'Add an international tracking number after the order goes out internationally.';
  }
  return null;
}

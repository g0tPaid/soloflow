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

export const FULFILLMENT_HISTORY_ACTIONS = ['ON', 'OFF'] as const;
export type FulfillmentHistoryAction = (typeof FULFILLMENT_HISTORY_ACTIONS)[number];

export type FulfillmentPress = {
  status: FulfillmentStatus;
  action: FulfillmentHistoryAction;
};

/** Clicking the active stage clears it. Clicking any other stage selects it. */
export function nextFulfillmentSelection(
  current: string | null | undefined,
  clicked: FulfillmentStatus,
): FulfillmentStatus | null {
  return current === clicked ? null : clicked;
}

/**
 * Log of stage changes. Selecting a different stage turns the previous one off
 * and the clicked one on. Clicking the active stage only turns it off.
 */
export function fulfillmentPressEvents(
  previous: string | null | undefined,
  next: string | null | undefined,
): FulfillmentPress[] {
  const prev = previous && isFulfillmentStatus(previous) ? previous : null;
  const nxt = next && isFulfillmentStatus(next) ? next : null;
  if (prev === nxt) return [];
  const events: FulfillmentPress[] = [];
  if (prev) events.push({ status: prev, action: 'OFF' });
  if (nxt) events.push({ status: nxt, action: 'ON' });
  return events;
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

/** Stored stages remain completed checkpoints; the next stage is the active one. Payment is derived from the invoice, never from a shipment toggle. */
export function shipmentProgress(status?: string | null, invoiceStatus?: string | null, shippingMethod?: string | null) {
  const labels = [
    ['Payment completed','Awaiting payment'],
    ['Local ordering completed','Local ordering in progress'],
    ['QC completed','Quality check in progress'],
    ['Shipped to China shipping center','China shipping in progress'],
    ['International shipment dispatched','International shipping in progress'],
    ['Customer received','Awaiting reception'],
    ['Order completed','Order completion in progress'],
  ];
  const visible = FULFILLMENT_STATUS_VALUES.filter(s => shippingMethod !== 'LOCAL' || s !== 'SHIPPED_INTERNATIONAL');
  const rank = fulfillmentRank(status);
  const paid = invoiceStatus === 'PAID';
  const active = paid || rank > 0 ? visible.find(s=>s!=='AWAITING_PAYMENT' && fulfillmentRank(s)>rank) : 'AWAITING_PAYMENT';
  return visible.map((value,index)=>{
    const original = fulfillmentRank(value);
    const completed = value==='AWAITING_PAYMENT' ? paid : rank>=original;
    const inProgress = !completed && active===value;
    const [doneLabel,progressLabel] = value==='SHIPPED_TO_CHINA_CENTER'&&shippingMethod==='LOCAL'?['Local shipment dispatched','Local shipping in progress']:labels[original];
    const state = completed ? 'completed' as const : inProgress ? 'in-progress' as const : 'pending' as const;
    const pendingLabels=['Awaiting payment','Local ordering','Quality check','China shipping','International shipping','Customer reception','Order completion'];
    return {value, state, label: completed ? doneLabel : inProgress ? progressLabel : pendingLabels[original]+' · pending', completedLabel:doneLabel, progressLabel, previous:index===1?null:visible[index-1]??null};
  });
}

export function shipmentProgressLabel(status?: string|null, invoiceStatus?: string|null, shippingMethod?: string|null): string {
  if(invoiceStatus==='CANCELLED') return 'Cancelled';
  if(invoiceStatus==='VOID') return 'Void';
  const stages=shipmentProgress(status,invoiceStatus,shippingMethod);
  return stages.find(s=>s.state==='in-progress')?.label ?? (status==='ORDER_COMPLETED'?'Order completed':stages.find(s=>s.state==='pending')?.label ?? 'Order completed');
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

export function formatFulfillmentHistoryTimestamp(
  value: string | Date,
  timeZone?: string | null,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  const zone = timeZone?.trim() || 'UTC';
  const formatIn = (zoneName: string) =>
    new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: zoneName,
      timeZoneName: 'short',
    }).format(date);
  try {
    return formatIn(zone);
  } catch {
    return formatIn('UTC');
  }
}

export function formatFulfillmentHistoryLine(
  event: { status: string; action: FulfillmentHistoryAction; createdAt: string | Date },
  timeZone?: string | null,
): string {
  const index = isFulfillmentStatus(event.status) ? FULFILLMENT_STATUS_VALUES.indexOf(event.status) : -1;
  const prefix = index >= 0 ? `${index + 1}. ` : '';
  const verb = event.action === 'ON' ? 'turned on' : 'turned off';
  return `${prefix}${fulfillmentStatusLabel(event.status)} ${verb} · ${formatFulfillmentHistoryTimestamp(event.createdAt, timeZone)}`;
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

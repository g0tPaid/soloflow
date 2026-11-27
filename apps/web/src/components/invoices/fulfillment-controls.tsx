'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronRight, LoaderCircle } from 'lucide-react';
import {
  canEditInternationalTracking,
  canEditLocalTracking,
  formatFulfillmentHistoryLine,
  formatFulfillmentHistoryTimestamp,
  shipmentProgress,
  shipmentProgressLabel,
  normalizeTrackingNumber,
  type FulfillmentHistoryAction,
  type FulfillmentStatus,
} from '@flowbooks/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type TrackingSave = {
  localTrackingNumber?: string | null;
  internationalTrackingNumber?: string | null;
};

export type FulfillmentHistoryEntry = {
  id: string;
  status: string;
  action: FulfillmentHistoryAction;
  createdAt: string;
};

type Props = {
  idPrefix: string;
  status?: FulfillmentStatus | null;
  invoiceStatus?: string | null;
  shippingMethod?: string | null;
  localTrackingNumber?: string | null;
  internationalTrackingNumber?: string | null;
  history?: FulfillmentHistoryEntry[];
  timeZone?: string | null;
  disabled?: boolean;
  saving?: boolean;
  error?: string;
  layout?: 'full' | 'compact';
  onStatusChange: (status: FulfillmentStatus | null) => void;
  onTrackingSave: (tracking: TrackingSave) => void;
};

function sortedHistory(history: FulfillmentHistoryEntry[] | undefined) {
  return [...(history ?? [])].sort((a, b) => {
    const time = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (time !== 0) return time;
    return b.id.localeCompare(a.id);
  });
}

export function FulfillmentHistoryList({
  history,
  timeZone,
  hideWhenEmpty = false,
  className,
}: {
  history?: FulfillmentHistoryEntry[];
  timeZone?: string | null;
  hideWhenEmpty?: boolean;
  className?: string;
}) {
  const events = sortedHistory(history);
  if (hideWhenEmpty && events.length === 0) return null;
  return (
    <details className={cn('group rounded-lg border bg-muted/30 px-3 py-2', className)}>
      <summary className="cursor-pointer list-none text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition group-open:rotate-90" />
          Shipment update history
          <span className="tabular-nums text-muted-foreground">({events.length})</span>
        </span>
      </summary>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No stage changes yet.</p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {events.map((event) => (
            <li key={event.id} className="text-sm text-muted-foreground">
              {formatFulfillmentHistoryLine(event, timeZone)}
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}

export function FulfillmentStatusBadge({ status, invoiceStatus, shippingMethod }: { status?: FulfillmentStatus | null; invoiceStatus?:string|null; shippingMethod?:string|null }) {
  const started = Boolean(status);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        started
          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {shipmentProgressLabel(status,invoiceStatus,shippingMethod)}
    </span>
  );
}

export function FulfillmentControls({
  idPrefix,
  status = null,
  invoiceStatus,
  shippingMethod,
  localTrackingNumber,
  internationalTrackingNumber,
  disabled = false,
  saving = false,
  error,
  layout = 'full',
  history,
  timeZone,
  onStatusChange,
  onTrackingSave,
}: Props) {
  const [localDraft, setLocalDraft] = useState(localTrackingNumber ?? '');
  const [internationalDraft, setInternationalDraft] = useState(internationalTrackingNumber ?? '');

  useEffect(() => {
    setLocalDraft(localTrackingNumber ?? '');
  }, [localTrackingNumber]);

  useEffect(() => {
    setInternationalDraft(internationalTrackingNumber ?? '');
  }, [internationalTrackingNumber]);

  const localEditable = canEditLocalTracking(status);
  const internationalEditable = canEditInternationalTracking(status);
  const stages = shipmentProgress(status,invoiceStatus,shippingMethod);
  const lastUpdate = sortedHistory(history)[0];
  const showLocal =
    layout === 'full' || localEditable || Boolean(normalizeTrackingNumber(localTrackingNumber));
  const showInternational =
    layout === 'full' ||
    internationalEditable ||
    Boolean(normalizeTrackingNumber(internationalTrackingNumber));
  const localChanged =
    localEditable &&
    normalizeTrackingNumber(localDraft) !== normalizeTrackingNumber(localTrackingNumber);
  const internationalChanged =
    internationalEditable &&
    normalizeTrackingNumber(internationalDraft) !==
      normalizeTrackingNumber(internationalTrackingNumber);
  const dirty = localChanged || internationalChanged;

  function saveTracking() {
    const tracking: TrackingSave = {};
    if (localEditable) tracking.localTrackingNumber = normalizeTrackingNumber(localDraft);
    if (internationalEditable) {
      tracking.internationalTrackingNumber = normalizeTrackingNumber(internationalDraft);
    }
    onTrackingSave(tracking);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Order fulfillment</p>
        <p className="text-sm text-muted-foreground">
          {shipmentProgressLabel(status,invoiceStatus,shippingMethod)}
        </p>
        {lastUpdate ? <p className="mt-1 text-xs text-muted-foreground">Last shipment update: {formatFulfillmentHistoryTimestamp(lastUpdate.createdAt, timeZone)}</p> : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Fulfillment status">
        {stages.map((stage, index) => (
            <div
              key={stage.value}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs sm:text-sm',
                stage.state==='in-progress'
                  ? 'border-red-600 bg-red-50 text-red-700 ring-1 ring-red-600'
                  : stage.state==='completed'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-input bg-background text-muted-foreground',
              )}
            >
              <div className="flex items-center gap-1.5 font-medium">{stage.state==='completed' ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : stage.state==='in-progress' ? <LoaderCircle className="h-4 w-4 shrink-0 motion-safe:animate-spin" aria-hidden/> : <span className="h-4 w-4 shrink-0 rounded border" aria-hidden />}{index+1}. {stage.label}</div>
              {stage.value==='AWAITING_PAYMENT'?<p className="mt-1 text-[11px]">Updates automatically when the invoice is paid.</p>:<div className="mt-2 flex flex-wrap gap-1"><Button size="sm" variant="outline" type="button" aria-label={`${stage.progressLabel} — In progress`} disabled={disabled||saving||stage.state==='in-progress'||(index===1&&invoiceStatus!=='PAID')} onClick={()=>onStatusChange(stage.previous)}>In progress</Button><Button size="sm" variant="outline" type="button" aria-label={`${stage.completedLabel} — Completed`} disabled={disabled||saving||stage.state==='completed'} onClick={()=>onStatusChange(stage.value)}>Completed</Button></div>}
            </div>
          ))}
      </div>

      {(showLocal || showInternational) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {showLocal && (
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-local-tracking`}>China / domestic tracking</Label>
              <Input
                id={`${idPrefix}-local-tracking`}
                value={localDraft}
                maxLength={80}
                disabled={!localEditable || disabled || saving}
                placeholder={
                  localEditable ? 'Local tracking number' : 'Available after shipping to the China center'
                }
                onChange={(event) => setLocalDraft(event.target.value)}
              />
            </div>
          )}
          {showInternational && (
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-international-tracking`}>International tracking</Label>
              <Input
                id={`${idPrefix}-international-tracking`}
                value={internationalDraft}
                maxLength={80}
                disabled={!internationalEditable || disabled || saving}
                placeholder={
                  internationalEditable
                    ? 'International tracking number'
                    : 'Available after the order goes out internationally'
                }
                onChange={(event) => setInternationalDraft(event.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {(localEditable || internationalEditable) && (
        <Button type="button" variant="outline" size="sm" onClick={saveTracking} disabled={!dirty || saving || disabled}>
          {saving ? 'Saving…' : 'Save tracking'}
        </Button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <FulfillmentHistoryList history={history} timeZone={timeZone} />
    </div>
  );
}

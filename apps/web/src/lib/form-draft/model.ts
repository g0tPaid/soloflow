import type { LineItemInput } from '@/lib/line-items';

/** How often a changed invoice or quote form is written to device storage. */
export const FORM_DRAFT_AUTOSAVE_MS = 5_000;

/** How often the screen checks whether the 5 second draft interval is due. */
export const FORM_DRAFT_CHECK_MS = 1_000;

/** Largest draft kept on device, including line-item photos stored as data URLs. */
export const FORM_DRAFT_MAX_CHARS = 2_000_000;

/**
 * localStorage mirror cap. The full draft, photos included, stays in IndexedDB
 * or SQLite when it fits there. The mirror is a synchronous backup for refresh
 * and for when the primary store fails.
 */
export const FORM_DRAFT_LOCAL_MIRROR_MAX_CHARS = 750_000;

export const NEW_DOCUMENT_DRAFT_ID = 'new';

export type FormDraftKind = 'invoice' | 'quote';

export interface FormDraftScope {
  userId: string;
  organizationId: string;
  kind: FormDraftKind;
  documentId: string;
}

export interface FormDraftLine {
  productId: string | null;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  imageUrl: string | null;
}

export interface FormDraftContent {
  customerId: string;
  number: string;
  issueDate: string;
  dueDate: string;
  validUntil: string;
  notes: string;
  discount: number;
  shipping: number;
  taxRate: number;
  shippingMethod: 'AIR' | 'SEA' | 'LOCAL' | null;
  shippingTerms: 'DDP' | 'LCL' | 'LOCAL' | null;
  shippingFromCountry: string;
  shippingToCountry: string;
  status: string;
  currency: string;
  currencyTouched: boolean;
  items: FormDraftLine[];
}

export interface FormDraftSnapshot {
  version: 1;
  scope: FormDraftScope;
  savedAt: number;
  content: FormDraftContent;
  imagesOmitted: boolean;
}

export function blankDraftLine(): FormDraftLine {
  return {
    productId: null,
    name: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    taxRate: 0,
    imageUrl: null,
  };
}

export function emptyFormDraftContent(): FormDraftContent {
  return {
    customerId: '',
    number: '',
    issueDate: '',
    dueDate: '',
    validUntil: '',
    notes: '',
    discount: 0,
    shipping: 0,
    taxRate: 0,
    shippingMethod: null,
    shippingTerms: null,
    shippingFromCountry: '',
    shippingToCountry: '',
    status: '',
    currency: 'INR',
    currencyTouched: false,
    items: [blankDraftLine()],
  };
}

function finiteNumber(value: unknown, fallback: number) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

const SHIPPING_METHODS = new Set(['AIR', 'SEA', 'LOCAL']);
const SHIPPING_TERMS = new Set(['DDP', 'LCL', 'LOCAL']);

function cleanEnum<T extends string>(value: unknown, allowed: Set<string>): T | null {
  return typeof value === 'string' && allowed.has(value) ? (value as T) : null;
}

export function draftLineFromInput(item: LineItemInput): FormDraftLine {
  return {
    productId: item.productId ?? null,
    name: item.name ?? '',
    description: item.description ?? '',
    quantity: finiteNumber(item.quantity, 1),
    unitPrice: finiteNumber(item.unitPrice, 0),
    taxRate: finiteNumber(item.taxRate, 0),
    imageUrl: item.imageUrl ? item.imageUrl : null,
  };
}

export function lineInputFromDraft(item: FormDraftLine): LineItemInput {
  return {
    productId: item.productId,
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    taxRate: item.taxRate,
    imageUrl: item.imageUrl,
  };
}

export function normalizeFormDraftContent(content: Partial<FormDraftContent> | null | undefined): FormDraftContent {
  const source = content ?? {};
  const items = Array.isArray(source.items) && source.items.length > 0 ? source.items : [blankDraftLine()];
  return {
    customerId: cleanText(source.customerId),
    number: cleanText(source.number),
    issueDate: cleanText(source.issueDate),
    dueDate: cleanText(source.dueDate),
    validUntil: cleanText(source.validUntil),
    notes: cleanText(source.notes),
    discount: finiteNumber(source.discount, 0),
    shipping: finiteNumber(source.shipping, 0),
    taxRate: finiteNumber(source.taxRate, 0),
    shippingMethod: cleanEnum(source.shippingMethod, SHIPPING_METHODS),
    shippingTerms: cleanEnum(source.shippingTerms, SHIPPING_TERMS),
    shippingFromCountry: cleanText(source.shippingFromCountry),
    shippingToCountry: cleanText(source.shippingToCountry),
    status: cleanText(source.status),
    currency: cleanText(source.currency).toUpperCase() || 'INR',
    currencyTouched: source.currencyTouched === true,
    items: items.map((item) => ({
      productId: item?.productId ? item.productId : null,
      name: cleanText(item?.name),
      description: cleanText(item?.description),
      quantity: finiteNumber(item?.quantity, 1),
      unitPrice: finiteNumber(item?.unitPrice, 0),
      taxRate: finiteNumber(item?.taxRate, 0),
      imageUrl: item?.imageUrl ? item.imageUrl : null,
    })),
  };
}

export function formDraftContent(partial: Partial<FormDraftContent>): FormDraftContent {
  return normalizeFormDraftContent({ ...emptyFormDraftContent(), ...partial });
}

export function formDraftFingerprint(content: FormDraftContent): string {
  return JSON.stringify(normalizeFormDraftContent(content));
}

export function formDraftKey(scope: FormDraftScope): string {
  return [scope.userId, scope.organizationId, scope.kind, scope.documentId]
    .map((part) => encodeURIComponent(part))
    .join(':');
}

export function sameFormDraftScope(left: FormDraftScope, right: FormDraftScope) {
  return (
    left.userId === right.userId &&
    left.organizationId === right.organizationId &&
    left.kind === right.kind &&
    left.documentId === right.documentId
  );
}

const SCALAR_KEYS = [
  'customerId',
  'number',
  'issueDate',
  'dueDate',
  'validUntil',
  'notes',
  'discount',
  'shipping',
  'taxRate',
  'shippingMethod',
  'shippingTerms',
  'shippingFromCountry',
  'shippingToCountry',
  'status',
  'currency',
  'currencyTouched',
] as const satisfies readonly (keyof FormDraftContent)[];

/** Keep user edits, and take system updates only for fields the user has not changed. */
export function rebaseUntouchedDraft(
  current: FormDraftContent,
  previousBaseline: FormDraftContent,
  nextBaseline: FormDraftContent,
): FormDraftContent {
  const currentNorm = normalizeFormDraftContent(current);
  const previous = normalizeFormDraftContent(previousBaseline);
  const next = normalizeFormDraftContent(nextBaseline);
  const merged = { ...currentNorm, items: currentNorm.items.map((item) => ({ ...item })) };
  for (const key of SCALAR_KEYS) {
    if (Object.is(currentNorm[key], previous[key])) {
      merged[key] = next[key] as never;
    }
  }
  if (JSON.stringify(currentNorm.items) === JSON.stringify(previous.items)) {
    merged.items = next.items.map((item) => ({ ...item }));
  }
  return merged;
}

function isDataImage(url: string | null) {
  return typeof url === 'string' && url.startsWith('data:');
}

function snapshotSize(snapshot: FormDraftSnapshot) {
  return JSON.stringify(snapshot).length;
}

function stripDataImages(snapshot: FormDraftSnapshot): FormDraftSnapshot {
  return {
    ...snapshot,
    imagesOmitted: true,
    content: {
      ...snapshot.content,
      items: snapshot.content.items.map((item) =>
        isDataImage(item.imageUrl) ? { ...item, imageUrl: null } : item,
      ),
    },
  };
}

function trimLongText(snapshot: FormDraftSnapshot): FormDraftSnapshot {
  const limit = 8_000;
  const clip = (value: string) => (value.length > limit ? value.slice(0, limit) : value);
  return {
    ...snapshot,
    content: {
      ...snapshot.content,
      notes: clip(snapshot.content.notes),
      items: snapshot.content.items.map((item) => ({
        ...item,
        name: clip(item.name),
        description: clip(item.description),
      })),
    },
  };
}

/**
 * Fit a draft into on-device storage. Remote image URLs are kept.
 * Inline photos that push the draft over the cap are left out and reported.
 */
export function packFormDraft(snapshot: FormDraftSnapshot): FormDraftSnapshot {
  const normalized: FormDraftSnapshot = {
    version: 1,
    scope: snapshot.scope,
    savedAt: snapshot.savedAt,
    imagesOmitted: false,
    content: normalizeFormDraftContent(snapshot.content),
  };
  if (snapshotSize(normalized) <= FORM_DRAFT_MAX_CHARS) return normalized;
  const withoutInlinePhotos = stripDataImages(normalized);
  if (snapshotSize(withoutInlinePhotos) <= FORM_DRAFT_MAX_CHARS) return withoutInlinePhotos;
  const trimmed = trimLongText(withoutInlinePhotos);
  if (snapshotSize(trimmed) <= FORM_DRAFT_MAX_CHARS) return trimmed;
  throw new Error('Draft is too large to store on this device');
}

export type DraftWriteDecision = 'write' | 'wait' | 'unchanged' | 'clean';

export function evaluateDraftWrite(input: {
  now: number;
  changedAt: number | null;
  lastAttemptAt: number | null;
  current: FormDraftContent;
  baseline: FormDraftContent;
  persistedFingerprint: string | null;
  force?: boolean;
  intervalMs?: number;
}): DraftWriteDecision {
  const intervalMs = input.intervalMs ?? FORM_DRAFT_AUTOSAVE_MS;
  const currentFingerprint = formDraftFingerprint(input.current);
  if (currentFingerprint === formDraftFingerprint(input.baseline)) return 'clean';
  if (currentFingerprint === input.persistedFingerprint) return 'unchanged';
  if (input.force) return 'write';
  if (input.changedAt == null || input.now - input.changedAt < intervalMs) return 'wait';
  if (input.lastAttemptAt != null && input.now - input.lastAttemptAt < intervalMs) return 'wait';
  return 'write';
}

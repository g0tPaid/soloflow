import type { Invoice, Organization } from '@/lib/api';
import { fetchServerPdfFile } from '@/lib/fetch-server-pdf';
import { isLikelyOfflineError } from '@/lib/offline/network';
import { getOfflineStore } from '@/lib/offline/store';
import type { OfflineStorage, StoredInvoice } from '@/lib/offline/types';

export class OfflinePdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflinePdfError';
  }
}

async function findStoredInvoice(
  store: OfflineStorage,
  organizationId: string,
  documentId: string,
): Promise<StoredInvoice | null> {
  const direct = await store.getInvoice(organizationId, documentId).catch(() => null);
  if (direct) return direct;
  const alias = await store.resolveAlias(organizationId, documentId).catch(() => null);
  if (!alias) return null;
  return store.getInvoice(organizationId, alias).catch(() => null);
}

function organizationForPdf(organizationId: string, organization?: Organization | null): Organization {
  if (organization) return organization;
  return {
    id: organizationId,
    name: 'Company',
    slug: 'local',
    settings: { currency: 'AED', timezone: 'UTC' },
  };
}

async function renderOnDevice(invoice: Invoice, org: Organization, filename: string) {
  const { renderInvoicePdfFile } = await import('@/lib/print-pdf/render-pdf-client');
  return renderInvoicePdfFile(invoice, org, filename);
}

/**
 * Online synced invoices keep the server PDF.
 * Offline, or a Pending draft that has no server id, renders the same
 * @react-pdf/renderer invoice document from the on-device copy.
 */
export async function resolveInvoicePdfFile(input: {
  documentId: string;
  organizationId?: string | null;
  filename: string;
  organization?: Organization | null;
  store?: OfflineStorage;
  isOnline?: () => boolean;
  fetchServer?: (id: string, organizationId: string, filename: string) => Promise<File>;
  renderLocal?: (invoice: Invoice, org: Organization, filename: string) => Promise<File>;
}): Promise<File> {
  if (!input.organizationId) {
    throw new OfflinePdfError('Organization is required to generate this PDF.');
  }

  const organizationId = input.organizationId;
  const store = input.store ?? getOfflineStore();
  const isOnline = input.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine);
  const renderLocal = input.renderLocal ?? renderOnDevice;
  const fetchServer =
    input.fetchServer ??
    ((id: string, orgId: string, filename: string) =>
      fetchServerPdfFile('invoices', id, { organizationId: orgId, filename }));

  const stored = await findStoredInvoice(store, organizationId, input.documentId);
  const pending = !!stored && stored.syncState !== 'synced';

  if (!pending && isOnline()) {
    try {
      return await fetchServer(input.documentId, organizationId, input.filename);
    } catch (error) {
      if (!stored || !isLikelyOfflineError(error)) throw error;
    }
  }

  if (!stored) {
    throw new OfflinePdfError(
      'This invoice is not saved on this device yet. Open it while you are online, then download the PDF offline.',
    );
  }

  const savedOrg = input.organization ?? (await store.readOrganization(organizationId).catch(() => null));
  return renderLocal(stored.invoice, organizationForPdf(organizationId, savedOrg), input.filename);
}

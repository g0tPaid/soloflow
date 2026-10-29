/** One JSON document, keyed inside a bucket. SQLite stores these rows on device. */
export interface DocumentRow {
  key: string;
  organizationId: string;
  createdAt: number;
  json: string;
}

/**
 * Small document API implemented by SQLite on Android.
 * OfflineStorage stays the same; only this backend changes.
 */
export interface DocumentDb {
  get(bucket: string, key: string): Promise<DocumentRow | null>;
  put(bucket: string, row: DocumentRow): Promise<void>;
  delete(bucket: string, key: string): Promise<void>;
  listByOrganization(bucket: string, organizationId: string): Promise<DocumentRow[]>;
  deleteByOrganization(bucket: string, organizationId: string): Promise<void>;
}

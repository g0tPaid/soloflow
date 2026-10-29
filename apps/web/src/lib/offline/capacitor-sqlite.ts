import type { DocumentDb, DocumentRow } from '@/lib/offline/document-db';

const DB_NAME = 'soloflow';
const DB_VERSION = 1;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS documents (
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT 0,
  json TEXT NOT NULL,
  PRIMARY KEY (bucket, key)
);
CREATE INDEX IF NOT EXISTS documents_org ON documents (bucket, organization_id);
`;

type SqlValue = string | number | null;

interface SqlStatementResult {
  values?: Array<Record<string, SqlValue>>;
}

interface SqliteConnectionHandle {
  open(): Promise<void>;
  execute(statements: string): Promise<unknown>;
  run(statement: string, values?: SqlValue[]): Promise<unknown>;
  query(statement: string, values?: SqlValue[]): Promise<SqlStatementResult>;
}

interface SqliteBridge {
  checkConnectionsConsistency(): Promise<unknown>;
  isConnection(dbName: string, readonly: boolean): Promise<{ result?: boolean }>;
  createConnection(
    dbName: string,
    encrypted: boolean,
    mode: string,
    version: number,
    readonly: boolean,
  ): Promise<SqliteConnectionHandle>;
  retrieveConnection(dbName: string, readonly: boolean): Promise<SqliteConnectionHandle>;
}

function cell(row: Record<string, SqlValue>, name: string): SqlValue {
  if (name in row) return row[name] ?? null;
  const match = Object.keys(row).find((key) => key.toLowerCase() === name);
  return match ? (row[match] ?? null) : null;
}

function toRow(raw: Record<string, SqlValue>): DocumentRow {
  const createdAt = cell(raw, 'created_at');
  return {
    key: String(cell(raw, 'key') ?? ''),
    organizationId: String(cell(raw, 'organization_id') ?? ''),
    createdAt: typeof createdAt === 'number' ? createdAt : Number(createdAt ?? 0),
    json: String(cell(raw, 'json') ?? ''),
  };
}

/**
 * Opens the on-device SQLite database through the Capacitor plugin.
 * Loaded only when the native app asks for OfflineStorage.
 */
export async function openCapacitorDocumentDb(): Promise<DocumentDb> {
  const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
  const sqlite = new SQLiteConnection(CapacitorSQLite) as unknown as SqliteBridge;
  await sqlite.checkConnectionsConsistency().catch(() => undefined);

  const existing = await sqlite.isConnection(DB_NAME, false);
  const db = existing.result
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
  await db.open();
  await db.execute(SCHEMA);
  return new CapacitorDocumentDb(db);
}

class CapacitorDocumentDb implements DocumentDb {
  constructor(private readonly db: SqliteConnectionHandle) {}

  async get(bucket: string, key: string) {
    const result = await this.db.query(
      'SELECT key, organization_id, created_at, json FROM documents WHERE bucket = ? AND key = ?',
      [bucket, key],
    );
    const row = result.values?.[0];
    return row ? toRow(row) : null;
  }

  async put(bucket: string, row: DocumentRow) {
    await this.db.run(
      `INSERT OR REPLACE INTO documents (bucket, key, organization_id, created_at, json)
       VALUES (?, ?, ?, ?, ?)`,
      [bucket, row.key, row.organizationId, row.createdAt, row.json],
    );
  }

  async delete(bucket: string, key: string) {
    await this.db.run('DELETE FROM documents WHERE bucket = ? AND key = ?', [bucket, key]);
  }

  async listByOrganization(bucket: string, organizationId: string) {
    const result = await this.db.query(
      `SELECT key, organization_id, created_at, json
       FROM documents WHERE bucket = ? AND organization_id = ?`,
      [bucket, organizationId],
    );
    return (result.values ?? []).map(toRow);
  }

  async deleteByOrganization(bucket: string, organizationId: string) {
    await this.db.run('DELETE FROM documents WHERE bucket = ? AND organization_id = ?', [
      bucket,
      organizationId,
    ]);
  }
}

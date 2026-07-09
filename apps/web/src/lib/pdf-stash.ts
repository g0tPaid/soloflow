type StashedPdf = {
  data: Buffer;
  filename: string;
  expiresAt: number;
};

const stash = new Map<string, StashedPdf>();
const TTL_MS = 5 * 60 * 1000;

function purgeExpired() {
  const now = Date.now();
  for (const [token, entry] of stash) {
    if (entry.expiresAt <= now) stash.delete(token);
  }
}

export function stashPdf(data: Buffer, filename: string): string {
  purgeExpired();
  const token = crypto.randomUUID();
  stash.set(token, {
    data,
    filename,
    expiresAt: Date.now() + TTL_MS,
  });
  return token;
}

export function takePdf(token: string): StashedPdf | null {
  purgeExpired();
  const entry = stash.get(token);
  if (!entry) return null;
  stash.delete(token);
  if (entry.expiresAt <= Date.now()) return null;
  return entry;
}

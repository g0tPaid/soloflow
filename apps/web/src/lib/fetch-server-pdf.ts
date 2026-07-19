import { buildServerPdfUrl } from '@/lib/build-server-pdf-url';

export type ServerPdfType = 'invoices' | 'receipts' | 'expenses' | 'quotes';

export async function fetchServerPdfFile(
  type: ServerPdfType,
  id: string,
  options?: { organizationId?: string | null; filename?: string },
): Promise<File> {
  const filename = options?.filename ?? `${type.slice(0, -1)}-${id}.pdf`;
  const url = buildServerPdfUrl(type, id, { ...options, filename });

  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    let message = 'Could not generate PDF. Please try again.';
    try {
      const json = (await response.json()) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      // ignore non-json body
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  if (blob.type && blob.type !== 'application/pdf') {
    throw new Error('Could not generate PDF. Please try again.');
  }

  return new File([blob], filename, { type: 'application/pdf' });
}

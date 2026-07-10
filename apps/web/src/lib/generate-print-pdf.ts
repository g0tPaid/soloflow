import 'server-only';

import { loadPrintDocument } from '@/lib/print-pdf/load-print-data';
import { renderDocumentPdfBuffer } from '@/lib/print-pdf/pdf-documents';

function resolveBaseUrl(request: Request) {
  const configured = process.env.NEXTAUTH_URL?.replace(/\/$/, '');
  if (configured) return configured;
  return new URL(request.url).origin;
}

export async function generatePrintPdf(
  request: Request,
  accessToken: string,
  type: string,
  id: string,
  organizationId?: string | null,
): Promise<Buffer> {
  const baseUrl = resolveBaseUrl(request);
  const document = await loadPrintDocument(accessToken, type, id, organizationId);
  return renderDocumentPdfBuffer(document, baseUrl);
}

import { renderToStaticMarkup } from 'react-dom/server';
import { ExpensePrintView } from '@/components/print/expense-print-view';
import { InvoicePrintView } from '@/components/print/invoice-print-view';
import { ReceiptPrintView } from '@/components/print/receipt-print-view';
import type { LoadedPrintDocument } from '@/lib/print-pdf/load-print-data';

const PRINT_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    background: white;
    color: #1e293b;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  img { max-width: 100%; }
  table { border-collapse: collapse; }
  @page { size: A4; margin: 8mm; }
`;

export function renderPrintHtml(document: LoadedPrintDocument, baseUrl: string) {
  let body = '';

  switch (document.type) {
    case 'invoices':
      body = renderToStaticMarkup(
        <InvoicePrintView invoice={document.invoice} org={document.org} baseUrl={baseUrl} />,
      );
      break;
    case 'receipts':
      body = renderToStaticMarkup(
        <ReceiptPrintView invoice={document.invoice} org={document.org} baseUrl={baseUrl} />,
      );
      break;
    case 'expenses':
      body = renderToStaticMarkup(<ExpensePrintView expense={document.expense} baseUrl={baseUrl} />);
      break;
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base href="${baseUrl}/" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>${body}</body>
</html>`;
}

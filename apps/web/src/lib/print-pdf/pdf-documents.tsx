import 'server-only';

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { ExpenseDetail, Invoice, Organization } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { parseStoredLineItem } from '@/lib/line-items';
import {
  formatAddressLines,
  parseBranding,
  resolveImageSrcForPrint,
} from '@/lib/organization-branding';
import type { LoadedPrintDocument } from '@/lib/print-pdf/load-print-data';

const RED = '#DC2626';
const GREEN = '#059669';

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  center: { textAlign: 'center' },
  brand: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  muted: { color: '#64748b', fontSize: 9 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  section: { marginTop: 14, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: RED,
    color: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colDesc: { flex: 3 },
  colQty: { width: 40, textAlign: 'right' },
  colPrice: { width: 70, textAlign: 'right' },
  colAmount: { width: 70, textAlign: 'right' },
  totalBox: {
    marginTop: 12,
    marginLeft: 'auto',
    width: 220,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 2,
    borderTopColor: RED,
    fontWeight: 'bold',
    fontSize: 12,
  },
  logo: { width: 72, height: 72, objectFit: 'contain', marginBottom: 8, alignSelf: 'center' },
  badge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: GREEN,
    padding: 12,
    marginVertical: 12,
    textAlign: 'center',
  },
});

function fmtDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function money(amount: string | number, currency: string) {
  return formatCurrency(Number(amount), currency);
}

function CompanyHeader({
  org,
  baseUrl,
  accent = RED,
}: {
  org: Organization;
  baseUrl: string;
  accent?: string;
}) {
  const branding = parseBranding(org.settings?.branding);
  const logo = resolveImageSrcForPrint(org.logo, baseUrl);
  const address = formatAddressLines(branding.address).join(' · ');

  return (
    <View style={styles.center}>
      {logo ? <Image src={logo} style={styles.logo} /> : null}
      <Text style={styles.brand}>{org.name}</Text>
      {branding.tagline ? <Text style={{ color: accent, marginBottom: 4 }}>{branding.tagline}</Text> : null}
      {address ? <Text style={styles.muted}>{address}</Text> : null}
      <Text style={styles.muted}>
        {[branding.phone, branding.email, branding.website].filter(Boolean).join(' · ')}
      </Text>
    </View>
  );
}

function InvoicePdfBody({
  invoice,
  org,
  baseUrl,
}: {
  invoice: Invoice;
  org: Organization;
  baseUrl: string;
}) {
  const currency = invoice.currency;
  const customer = invoice.customer;
  const customerAddress = formatAddressLines(customer?.address ?? undefined).join(' · ');

  return (
    <Page size="A4" style={styles.page}>
      <CompanyHeader org={org} baseUrl={baseUrl} />
      <View style={[styles.section, { flexDirection: 'row', justifyContent: 'space-between' }]}>
        <View style={{ width: '48%' }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Bill To</Text>
          <Text>{customer?.name}</Text>
          {customerAddress ? <Text style={styles.muted}>{customerAddress}</Text> : null}
        </View>
        <View style={{ width: '48%' }}>
          <Text style={[styles.title, { color: RED, textAlign: 'right' }]}>INVOICE</Text>
          <View style={styles.row}>
            <Text>Invoice #</Text>
            <Text>{invoice.number}</Text>
          </View>
          <View style={styles.row}>
            <Text>Issue Date</Text>
            <Text>{fmtDate(invoice.issueDate)}</Text>
          </View>
          {invoice.dueDate ? (
            <View style={styles.row}>
              <Text>Due Date</Text>
              <Text>{fmtDate(invoice.dueDate)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={styles.colDesc}>Description</Text>
        <Text style={styles.colQty}>Qty</Text>
        <Text style={styles.colPrice}>Unit</Text>
        <Text style={styles.colAmount}>Amount</Text>
      </View>
      {(invoice.items ?? []).map((item) => {
        const { name, description } = parseStoredLineItem(item);
        return (
          <View key={item.id} style={styles.tableRow}>
            <View style={styles.colDesc}>
              <Text style={{ fontWeight: 'bold' }}>{name || description || 'Item'}</Text>
              {description && name ? <Text style={styles.muted}>{description}</Text> : null}
            </View>
            <Text style={styles.colQty}>{Number(item.quantity)}</Text>
            <Text style={styles.colPrice}>{money(item.unitPrice, currency)}</Text>
            <Text style={styles.colAmount}>{money(item.amount, currency)}</Text>
          </View>
        );
      })}

      <View style={styles.totalBox}>
        <View style={styles.totalLine}>
          <Text>Subtotal</Text>
          <Text>{money(invoice.subtotal, currency)}</Text>
        </View>
        {Number(invoice.shipping ?? 0) > 0 ? (
          <View style={styles.totalLine}>
            <Text>Shipping</Text>
            <Text>{money(invoice.shipping, currency)}</Text>
          </View>
        ) : null}
        {Number(invoice.discount ?? 0) > 0 ? (
          <View style={styles.totalLine}>
            <Text>Discount</Text>
            <Text>{money(invoice.discount, currency)}</Text>
          </View>
        ) : null}
        {Number(invoice.taxAmount ?? 0) > 0 ? (
          <View style={styles.totalLine}>
            <Text>Tax</Text>
            <Text>{money(invoice.taxAmount, currency)}</Text>
          </View>
        ) : null}
        <View style={styles.grandTotal}>
          <Text>TOTAL DUE</Text>
          <Text style={{ color: RED }}>{money(invoice.total, currency)}</Text>
        </View>
      </View>

      {invoice.notes ? (
        <View style={styles.section}>
          <Text style={{ fontWeight: 'bold', color: RED, marginBottom: 4 }}>Notes</Text>
          <Text>{invoice.notes}</Text>
        </View>
      ) : null}
    </Page>
  );
}

function ReceiptPdfBody({
  invoice,
  org,
  baseUrl,
}: {
  invoice: Invoice;
  org: Organization;
  baseUrl: string;
}) {
  const currency = invoice.currency;

  return (
    <Page size="A4" style={styles.page}>
      <CompanyHeader org={org} baseUrl={baseUrl} accent={GREEN} />
      <View style={styles.badge}>
        <Text style={{ color: GREEN, fontWeight: 'bold', fontSize: 12 }}>PAYMENT RECEIVED</Text>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 6 }}>
          {money(invoice.total, currency)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text>Receipt for invoice</Text>
        <Text>{invoice.number}</Text>
      </View>
      <View style={styles.row}>
        <Text>Customer</Text>
        <Text>{invoice.customer?.name}</Text>
      </View>
      <View style={styles.row}>
        <Text>Payment date</Text>
        <Text>{fmtDate(invoice.updatedAt || invoice.issueDate)}</Text>
      </View>
      <View style={[styles.tableHeader, { backgroundColor: GREEN, marginTop: 12 }]}>
        <Text style={styles.colDesc}>Description</Text>
        <Text style={styles.colQty}>Qty</Text>
        <Text style={styles.colAmount}>Amount</Text>
      </View>
      {(invoice.items ?? []).map((item) => {
        const { name, description } = parseStoredLineItem(item);
        return (
          <View key={item.id} style={styles.tableRow}>
            <Text style={styles.colDesc}>{name || description || 'Item'}</Text>
            <Text style={styles.colQty}>{Number(item.quantity)}</Text>
            <Text style={styles.colAmount}>{money(item.amount, currency)}</Text>
          </View>
        );
      })}
      <View style={[styles.grandTotal, { borderTopColor: GREEN }]}>
        <Text>Amount paid</Text>
        <Text style={{ color: GREEN }}>{money(invoice.total, currency)}</Text>
      </View>
    </Page>
  );
}

function ExpensePdfBody({ expense }: { expense: ExpenseDetail }) {
  const currency = expense.currency;
  const revenue = Number(expense.revenue ?? expense.total);
  const totalCost = Number(expense.totalCost ?? 0);
  const profit = Number(expense.profit ?? revenue - totalCost);

  return (
    <Page size="A4" style={styles.page}>
      <Text style={[styles.title, { color: RED }]}>Expense report</Text>
      <View style={styles.row}>
        <Text>Invoice</Text>
        <Text>{expense.number}</Text>
      </View>
      <View style={styles.row}>
        <Text>Customer</Text>
        <Text>{expense.customer?.name}</Text>
      </View>
      <View style={[styles.tableHeader, { marginTop: 12 }]}>
        <Text style={styles.colDesc}>Item</Text>
        <Text style={styles.colQty}>Qty</Text>
        <Text style={styles.colPrice}>Sale</Text>
        <Text style={styles.colAmount}>Expense</Text>
      </View>
      {(expense.items ?? []).map((item) => {
        const { name, description } = parseStoredLineItem(item);
        return (
          <View key={item.id} style={styles.tableRow}>
            <Text style={styles.colDesc}>{name || description || 'Item'}</Text>
            <Text style={styles.colQty}>{Number(item.quantity)}</Text>
            <Text style={styles.colPrice}>{money(item.unitPrice, currency)}</Text>
            <Text style={styles.colAmount}>{money(item.costAmount ?? 0, currency)}</Text>
          </View>
        );
      })}
      <View style={styles.totalBox}>
        <View style={styles.totalLine}>
          <Text>Revenue</Text>
          <Text>{money(revenue, currency)}</Text>
        </View>
        <View style={styles.totalLine}>
          <Text>Total expenses</Text>
          <Text>{money(totalCost, currency)}</Text>
        </View>
        <View style={styles.grandTotal}>
          <Text>Profit</Text>
          <Text style={{ color: profit >= 0 ? GREEN : RED }}>{money(profit, currency)}</Text>
        </View>
      </View>
    </Page>
  );
}

function buildPdfDocument(document: LoadedPrintDocument, baseUrl: string) {
  switch (document.type) {
    case 'invoices':
      return (
        <Document>
          <InvoicePdfBody invoice={document.invoice} org={document.org} baseUrl={baseUrl} />
        </Document>
      );
    case 'receipts':
      return (
        <Document>
          <ReceiptPdfBody invoice={document.invoice} org={document.org} baseUrl={baseUrl} />
        </Document>
      );
    case 'expenses':
      return (
        <Document>
          <ExpensePdfBody expense={document.expense} />
        </Document>
      );
  }
}

export async function renderDocumentPdfBuffer(
  document: LoadedPrintDocument,
  baseUrl: string,
): Promise<Buffer> {
  return renderToBuffer(buildPdfDocument(document, baseUrl));
}

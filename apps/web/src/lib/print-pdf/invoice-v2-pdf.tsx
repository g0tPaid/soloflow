import { Image, Link, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import { invoiceAmountPaid, invoiceBalanceDue } from '@flowbooks/shared';
import type { Invoice, Organization } from '@/lib/api';
import { parseStoredLineItem } from '@/lib/line-items';
import {
  formatAddressLines,
  normalizeInvoiceAccent,
  parseBranding,
  resolveImageSrcForPrint,
  shouldShowInvoiceLogo,
} from '@/lib/organization-branding';
import { formatCurrency } from '@/lib/utils';

const trackingUrl = 'https://www.sourcing.center/track';
// QR modules generated from trackingUrl, with a four-module quiet zone.
const trackingQrPath = 'M4 4h1v1h-1zM5 4h1v1h-1zM6 4h1v1h-1zM7 4h1v1h-1zM8 4h1v1h-1zM9 4h1v1h-1zM10 4h1v1h-1zM12 4h1v1h-1zM13 4h1v1h-1zM15 4h1v1h-1zM19 4h1v1h-1zM20 4h1v1h-1zM22 4h1v1h-1zM23 4h1v1h-1zM24 4h1v1h-1zM26 4h1v1h-1zM27 4h1v1h-1zM28 4h1v1h-1zM29 4h1v1h-1zM30 4h1v1h-1zM31 4h1v1h-1zM32 4h1v1h-1zM4 5h1v1h-1zM10 5h1v1h-1zM12 5h1v1h-1zM14 5h1v1h-1zM18 5h1v1h-1zM19 5h1v1h-1zM21 5h1v1h-1zM22 5h1v1h-1zM26 5h1v1h-1zM32 5h1v1h-1zM4 6h1v1h-1zM6 6h1v1h-1zM7 6h1v1h-1zM8 6h1v1h-1zM10 6h1v1h-1zM13 6h1v1h-1zM17 6h1v1h-1zM18 6h1v1h-1zM19 6h1v1h-1zM22 6h1v1h-1zM26 6h1v1h-1zM28 6h1v1h-1zM29 6h1v1h-1zM30 6h1v1h-1zM32 6h1v1h-1zM4 7h1v1h-1zM6 7h1v1h-1zM7 7h1v1h-1zM8 7h1v1h-1zM10 7h1v1h-1zM12 7h1v1h-1zM15 7h1v1h-1zM20 7h1v1h-1zM21 7h1v1h-1zM26 7h1v1h-1zM28 7h1v1h-1zM29 7h1v1h-1zM30 7h1v1h-1zM32 7h1v1h-1zM4 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM8 8h1v1h-1zM10 8h1v1h-1zM14 8h1v1h-1zM15 8h1v1h-1zM16 8h1v1h-1zM17 8h1v1h-1zM23 8h1v1h-1zM26 8h1v1h-1zM28 8h1v1h-1zM29 8h1v1h-1zM30 8h1v1h-1zM32 8h1v1h-1zM4 9h1v1h-1zM10 9h1v1h-1zM14 9h1v1h-1zM16 9h1v1h-1zM18 9h1v1h-1zM21 9h1v1h-1zM22 9h1v1h-1zM23 9h1v1h-1zM26 9h1v1h-1zM32 9h1v1h-1zM4 10h1v1h-1zM5 10h1v1h-1zM6 10h1v1h-1zM7 10h1v1h-1zM8 10h1v1h-1zM9 10h1v1h-1zM10 10h1v1h-1zM12 10h1v1h-1zM14 10h1v1h-1zM16 10h1v1h-1zM18 10h1v1h-1zM20 10h1v1h-1zM22 10h1v1h-1zM24 10h1v1h-1zM26 10h1v1h-1zM27 10h1v1h-1zM28 10h1v1h-1zM29 10h1v1h-1zM30 10h1v1h-1zM31 10h1v1h-1zM32 10h1v1h-1zM12 11h1v1h-1zM14 11h1v1h-1zM15 11h1v1h-1zM17 11h1v1h-1zM18 11h1v1h-1zM21 11h1v1h-1zM23 11h1v1h-1zM4 12h1v1h-1zM6 12h1v1h-1zM7 12h1v1h-1zM9 12h1v1h-1zM10 12h1v1h-1zM11 12h1v1h-1zM13 12h1v1h-1zM15 12h1v1h-1zM16 12h1v1h-1zM17 12h1v1h-1zM18 12h1v1h-1zM20 12h1v1h-1zM21 12h1v1h-1zM22 12h1v1h-1zM26 12h1v1h-1zM29 12h1v1h-1zM31 12h1v1h-1zM32 12h1v1h-1zM4 13h1v1h-1zM5 13h1v1h-1zM6 13h1v1h-1zM7 13h1v1h-1zM9 13h1v1h-1zM14 13h1v1h-1zM16 13h1v1h-1zM19 13h1v1h-1zM20 13h1v1h-1zM23 13h1v1h-1zM26 13h1v1h-1zM27 13h1v1h-1zM28 13h1v1h-1zM32 13h1v1h-1zM5 14h1v1h-1zM6 14h1v1h-1zM7 14h1v1h-1zM8 14h1v1h-1zM10 14h1v1h-1zM18 14h1v1h-1zM19 14h1v1h-1zM21 14h1v1h-1zM22 14h1v1h-1zM27 14h1v1h-1zM28 14h1v1h-1zM30 14h1v1h-1zM31 14h1v1h-1zM5 15h1v1h-1zM6 15h1v1h-1zM7 15h1v1h-1zM9 15h1v1h-1zM11 15h1v1h-1zM12 15h1v1h-1zM13 15h1v1h-1zM14 15h1v1h-1zM17 15h1v1h-1zM18 15h1v1h-1zM19 15h1v1h-1zM24 15h1v1h-1zM25 15h1v1h-1zM27 15h1v1h-1zM28 15h1v1h-1zM32 15h1v1h-1zM4 16h1v1h-1zM6 16h1v1h-1zM8 16h1v1h-1zM9 16h1v1h-1zM10 16h1v1h-1zM12 16h1v1h-1zM13 16h1v1h-1zM14 16h1v1h-1zM15 16h1v1h-1zM16 16h1v1h-1zM21 16h1v1h-1zM29 16h1v1h-1zM30 16h1v1h-1zM9 17h1v1h-1zM13 17h1v1h-1zM17 17h1v1h-1zM21 17h1v1h-1zM23 17h1v1h-1zM26 17h1v1h-1zM27 17h1v1h-1zM30 17h1v1h-1zM31 17h1v1h-1zM32 17h1v1h-1zM4 18h1v1h-1zM10 18h1v1h-1zM12 18h1v1h-1zM13 18h1v1h-1zM18 18h1v1h-1zM22 18h1v1h-1zM23 18h1v1h-1zM25 18h1v1h-1zM27 18h1v1h-1zM28 18h1v1h-1zM30 18h1v1h-1zM31 18h1v1h-1zM32 18h1v1h-1zM7 19h1v1h-1zM9 19h1v1h-1zM11 19h1v1h-1zM14 19h1v1h-1zM17 19h1v1h-1zM23 19h1v1h-1zM24 19h1v1h-1zM26 19h1v1h-1zM27 19h1v1h-1zM28 19h1v1h-1zM31 19h1v1h-1zM4 20h1v1h-1zM5 20h1v1h-1zM8 20h1v1h-1zM9 20h1v1h-1zM10 20h1v1h-1zM11 20h1v1h-1zM12 20h1v1h-1zM14 20h1v1h-1zM16 20h1v1h-1zM19 20h1v1h-1zM22 20h1v1h-1zM23 20h1v1h-1zM24 20h1v1h-1zM25 20h1v1h-1zM28 20h1v1h-1zM29 20h1v1h-1zM31 20h1v1h-1zM5 21h1v1h-1zM6 21h1v1h-1zM7 21h1v1h-1zM9 21h1v1h-1zM11 21h1v1h-1zM13 21h1v1h-1zM16 21h1v1h-1zM17 21h1v1h-1zM19 21h1v1h-1zM22 21h1v1h-1zM24 21h1v1h-1zM25 21h1v1h-1zM27 21h1v1h-1zM29 21h1v1h-1zM30 21h1v1h-1zM31 21h1v1h-1zM4 22h1v1h-1zM6 22h1v1h-1zM7 22h1v1h-1zM10 22h1v1h-1zM11 22h1v1h-1zM12 22h1v1h-1zM15 22h1v1h-1zM19 22h1v1h-1zM20 22h1v1h-1zM21 22h1v1h-1zM22 22h1v1h-1zM24 22h1v1h-1zM27 22h1v1h-1zM30 22h1v1h-1zM12 23h1v1h-1zM13 23h1v1h-1zM14 23h1v1h-1zM16 23h1v1h-1zM19 23h1v1h-1zM21 23h1v1h-1zM24 23h1v1h-1zM25 23h1v1h-1zM30 23h1v1h-1zM5 24h1v1h-1zM6 24h1v1h-1zM7 24h1v1h-1zM8 24h1v1h-1zM10 24h1v1h-1zM11 24h1v1h-1zM13 24h1v1h-1zM16 24h1v1h-1zM17 24h1v1h-1zM20 24h1v1h-1zM21 24h1v1h-1zM24 24h1v1h-1zM25 24h1v1h-1zM26 24h1v1h-1zM27 24h1v1h-1zM28 24h1v1h-1zM29 24h1v1h-1zM30 24h1v1h-1zM12 25h1v1h-1zM13 25h1v1h-1zM17 25h1v1h-1zM18 25h1v1h-1zM20 25h1v1h-1zM21 25h1v1h-1zM22 25h1v1h-1zM24 25h1v1h-1zM28 25h1v1h-1zM29 25h1v1h-1zM30 25h1v1h-1zM31 25h1v1h-1zM32 25h1v1h-1zM4 26h1v1h-1zM5 26h1v1h-1zM6 26h1v1h-1zM7 26h1v1h-1zM8 26h1v1h-1zM9 26h1v1h-1zM10 26h1v1h-1zM12 26h1v1h-1zM15 26h1v1h-1zM16 26h1v1h-1zM17 26h1v1h-1zM20 26h1v1h-1zM22 26h1v1h-1zM23 26h1v1h-1zM24 26h1v1h-1zM26 26h1v1h-1zM28 26h1v1h-1zM29 26h1v1h-1zM31 26h1v1h-1zM4 27h1v1h-1zM10 27h1v1h-1zM12 27h1v1h-1zM16 27h1v1h-1zM20 27h1v1h-1zM22 27h1v1h-1zM24 27h1v1h-1zM28 27h1v1h-1zM29 27h1v1h-1zM31 27h1v1h-1zM32 27h1v1h-1zM4 28h1v1h-1zM6 28h1v1h-1zM7 28h1v1h-1zM8 28h1v1h-1zM10 28h1v1h-1zM13 28h1v1h-1zM14 28h1v1h-1zM15 28h1v1h-1zM16 28h1v1h-1zM18 28h1v1h-1zM19 28h1v1h-1zM21 28h1v1h-1zM24 28h1v1h-1zM25 28h1v1h-1zM26 28h1v1h-1zM27 28h1v1h-1zM28 28h1v1h-1zM30 28h1v1h-1zM31 28h1v1h-1zM4 29h1v1h-1zM6 29h1v1h-1zM7 29h1v1h-1zM8 29h1v1h-1zM10 29h1v1h-1zM12 29h1v1h-1zM13 29h1v1h-1zM14 29h1v1h-1zM15 29h1v1h-1zM16 29h1v1h-1zM18 29h1v1h-1zM19 29h1v1h-1zM20 29h1v1h-1zM21 29h1v1h-1zM22 29h1v1h-1zM23 29h1v1h-1zM25 29h1v1h-1zM28 29h1v1h-1zM29 29h1v1h-1zM32 29h1v1h-1zM4 30h1v1h-1zM6 30h1v1h-1zM7 30h1v1h-1zM8 30h1v1h-1zM10 30h1v1h-1zM12 30h1v1h-1zM13 30h1v1h-1zM14 30h1v1h-1zM16 30h1v1h-1zM20 30h1v1h-1zM22 30h1v1h-1zM23 30h1v1h-1zM25 30h1v1h-1zM27 30h1v1h-1zM30 30h1v1h-1zM32 30h1v1h-1zM4 31h1v1h-1zM10 31h1v1h-1zM13 31h1v1h-1zM17 31h1v1h-1zM22 31h1v1h-1zM24 31h1v1h-1zM25 31h1v1h-1zM27 31h1v1h-1zM29 31h1v1h-1zM31 31h1v1h-1zM4 32h1v1h-1zM5 32h1v1h-1zM6 32h1v1h-1zM7 32h1v1h-1zM8 32h1v1h-1zM9 32h1v1h-1zM10 32h1v1h-1zM12 32h1v1h-1zM16 32h1v1h-1zM17 32h1v1h-1zM18 32h1v1h-1zM20 32h1v1h-1zM22 32h1v1h-1zM23 32h1v1h-1zM24 32h1v1h-1zM26 32h1v1h-1zM29 32h1v1h-1zM31 32h1v1h-1z';

const styles = StyleSheet.create({
  page: { padding: 32, paddingBottom: 42, fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b' },
  header: { alignItems: 'center', textAlign: 'center', gap: 4, marginBottom: 14 },
  logo: { width: 62, height: 55, objectFit: 'contain' },
  company: { fontSize: 18, fontWeight: 'bold' },
  muted: { color: '#475569', lineHeight: 1.3 },
  metadata: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, borderTopWidth: 2, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 10, marginBottom: 12 },
  customer: { flex: 1 },
  invoice: { flex: 1, alignItems: 'flex-end', textAlign: 'right' },
  heading: { fontWeight: 'bold', fontSize: 11, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  card: { width: '32%', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5, padding: 7, gap: 4 },
  image: { width: '100%', height: 88, objectFit: 'contain' },
  placeholder: { height: 88, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  lineTotal: { fontSize: 11, fontWeight: 'bold' },
  notes: { marginTop: 4, marginBottom: 8, lineHeight: 1.35 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10, marginTop: 6 },
  totals: { flex: 1, gap: 4 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  balance: { fontSize: 12, fontWeight: 'bold', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 5 },
  tracking: { alignItems: 'center', gap: 3 },
  footer: { position: 'absolute', bottom: 22, left: 32, right: 32, borderTopWidth: 2, paddingTop: 4, textAlign: 'center', color: '#475569', fontSize: 8 },
});

export function InvoiceV2Pdf({ invoice, org, baseUrl }: { invoice: Invoice; org: Organization; baseUrl: string }) {
  const branding = parseBranding(org.settings?.branding);
  const accent = normalizeInvoiceAccent(branding.invoiceAccent);
  const logo = shouldShowInvoiceLogo(branding, org.logo)
    ? resolveImageSrcForPrint(org.logo, baseUrl)
    : undefined;
  const money = (amount: string | number) => formatCurrency(Number(amount), invoice.currency);
  const date = (value: string) => new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(value));
  const items = invoice.items ?? [];
  const rows = Array.from({ length: Math.ceil(items.length / 3) }, (_, index) =>
    items.slice(index * 3, index * 3 + 3),
  );
  const amounts = [
    { label: 'Subtotal', amount: invoice.subtotal },
    ...(Number(invoice.discount) ? [{ label: 'Discount', amount: -Number(invoice.discount) }] : []),
    ...(Number(invoice.shipping) ? [{ label: 'Shipping', amount: invoice.shipping }] : []),
    ...(Number(invoice.taxAmount) ? [{ label: 'Tax', amount: invoice.taxAmount }] : []),
    { label: 'Invoice total', amount: invoice.total },
    { label: 'Amount paid', amount: invoiceAmountPaid(invoice) },
    { label: 'Balance due', amount: invoiceBalanceDue(invoice) },
  ];

  return (
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.header} wrap={false}>
        {logo ? <Image src={logo} style={styles.logo} /> : null}
        <Text style={styles.company}>{org.name}</Text>
        {branding.tagline ? <Text style={styles.muted}>{branding.tagline}</Text> : null}
        {formatAddressLines(branding.address).length ? (
          <Text style={styles.muted}>{formatAddressLines(branding.address).join(' · ')}</Text>
        ) : null}
        <Text style={styles.muted}>{[branding.phone, branding.email, branding.website].filter(Boolean).join(' · ')}</Text>
        {branding.trn ? <Text style={styles.muted}>TRN {branding.trn}</Text> : null}
      </View>
      <View style={[styles.metadata, { borderTopColor: accent }]} wrap={false}>
        <View style={styles.customer}>
          <Text style={styles.heading}>Bill to</Text>
          <Text>{invoice.customer?.name ?? '—'}</Text>
          {formatAddressLines(invoice.customer?.address ?? undefined).map((line, index) => (
            <Text key={index} style={styles.muted}>{line}</Text>
          ))}
          {invoice.customer?.email ? <Text style={styles.muted}>{invoice.customer.email}</Text> : null}
          {invoice.customer?.phone ? <Text style={styles.muted}>{invoice.customer.phone}</Text> : null}
          {invoice.customer?.taxId ? <Text style={styles.muted}>TRN {invoice.customer.taxId}</Text> : null}
        </View>
        <View style={styles.invoice}>
          <Text style={[styles.heading, { color: accent }]}>INVOICE {invoice.number}</Text>
          <Text style={styles.muted}>Issued {date(invoice.issueDate)}</Text>
          {invoice.dueDate ? <Text style={styles.muted}>Due {date(invoice.dueDate)}</Text> : null}
        </View>
      </View>
      {rows.map((row, index) => (
        <View key={index} style={styles.row} wrap={false}>
          {row.map((item) => {
            const { name, description } = parseStoredLineItem(item);
            const image = resolveImageSrcForPrint(item.imageUrl ?? item.product?.imageUrl, baseUrl);
            return (
              <View key={item.id} style={styles.card}>
                {image ? <Image src={image} style={styles.image} /> : (
                  <View style={styles.placeholder}><Text style={styles.muted}>No photo</Text></View>
                )}
                <Text style={{ fontWeight: 'bold' }}>{name || description || 'Item'}</Text>
                {name && description ? <Text style={styles.muted}>{description}</Text> : null}
                <Text style={styles.muted}>{Number(item.quantity)} × {money(item.unitPrice)}</Text>
                <Text style={[styles.lineTotal, { color: accent }]}>{money(item.amount)}</Text>
              </View>
            );
          })}
        </View>
      ))}
      {invoice.notes ? <Text style={styles.notes}>{invoice.notes}</Text> : null}
      <View style={styles.summary} wrap={false}>
        <View style={styles.totals}>
          {amounts.map(({ label, amount }) => (
            <View key={label} style={label === 'Balance due'
              ? [styles.amountRow, styles.balance, { color: accent }]
              : styles.amountRow}>
              <Text>{label}</Text>
              <Text>{money(amount)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.tracking}>
          <Svg width={78} height={78} viewBox="0 0 37 37">
            <Path d={trackingQrPath} fill="#000000" />
          </Svg>
          <Text>Scan to track your parcel</Text>
          <Link src={trackingUrl}>www.sourcing.center/track</Link>
        </View>
      </View>
      <Text fixed style={[styles.footer, { borderTopColor: accent }]}
        render={({ pageNumber, totalPages }) => `${org.name}   |   ${invoice.number}   |   ${pageNumber} / ${totalPages}`}
      />
    </Page>
  );
}

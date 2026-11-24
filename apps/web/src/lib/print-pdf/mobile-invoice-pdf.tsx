import { Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Invoice, Organization } from '@/lib/api';
import { resolveImageSrcForPrint } from '@/lib/organization-branding';
import { InvoiceBarcode } from './invoice-barcode';
import { InvoiceTrackingQr } from './invoice-v2-pdf';
import { getMobileInvoiceData } from './mobile-invoice-data';
import { SourcingBrand } from './sourcing-brand';
import { sevenColorMark } from './sourcing-brand-mark';

const RECEIPT_WIDTH = (80 / 25.4) * 72;
const styles = StyleSheet.create({
  page: { paddingHorizontal: 12, paddingVertical: 14, color: '#121212', fontFamily: 'Helvetica', fontSize: 9 },
  center: { alignItems: 'center', textAlign: 'center' },
  brand: { fontSize: 8, color: '#64646d', marginTop: 4 },
  heading: { fontSize: 9, fontWeight: 'bold', marginTop: 8, marginBottom: 3 },
  invoiceNumber: { fontSize: 8, fontWeight: 'normal' },
  detail: { fontSize: 8, marginTop: 3, color: '#3f3f46' },
  divider: { borderTopWidth: 1, borderTopColor: '#8b8b91', borderStyle: 'dashed', marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#a1a1aa', borderStyle: 'dotted' },
  photo: { width: 28, height: 28, borderRadius: 3, marginRight: 6, objectFit: 'cover' },
  item: { flex: 1, paddingRight: 4 },
  label: { fontWeight: 'bold' },
  amount: { minWidth: 56, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 5, marginBottom: 4 },
  balance: { flexDirection: 'row', justifyContent: 'space-between', gap: 5, borderTopWidth: 1.5, borderBottomWidth: 1.5, paddingVertical: 6, marginTop: 4, fontSize: 12, fontWeight: 'bold' },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 29, flexShrink: 0, borderWidth: 1, borderRadius: 7 },
  footer: { marginTop: 10, alignItems: 'center' },
});

export function MobileInvoicePdf({ invoice, org, baseUrl, buttonImages, downloadUrl, documentType = 'invoice', repMarkets = false }: { invoice: Invoice; org: Organization; baseUrl: string; buttonImages?: { wise: string; download: string }; downloadUrl?: string; documentType?: 'invoice' | 'quote'; repMarkets?: boolean }) {
  const isQuote = documentType === 'quote';
  if (!isQuote && (!downloadUrl || !downloadUrl.startsWith('https://soloflow.practicalthings.store/api/pdf/public-invoice/'))) {
    throw new Error('A secure public Invoice Version 1 download link is required.');
  }
  const data = getMobileInvoiceData(invoice, org, repMarkets);

  return (
    <Page size={{ width: RECEIPT_WIDTH }} style={styles.page} wrap={false}>
      <View style={styles.center}>
        {repMarkets ? <Text style={{ fontFamily: 'Times-Bold', fontSize: 20, letterSpacing: -0.6, color: '#DC2626' }}>www.rep.markets</Text> : <SourcingBrand wordmarkOnly />}
        {data.organizationName ? <Text style={styles.brand}>{data.organizationName}</Text> : null}
        {data.address ? <Text style={styles.detail}>{data.address}</Text> : null}
        {data.contact ? <Text style={styles.detail}>{data.contact}</Text> : null}
        {data.taxId ? <Text style={styles.detail}>TRN {data.taxId}</Text> : null}
        <Text style={styles.heading}>{isQuote ? 'QUOTE' : 'INVOICE'} <Text style={styles.invoiceNumber}> · {invoice.number}</Text></Text>
        <Text style={styles.detail}>{data.date}</Text>
        {isQuote && invoice.dueDate ? <Text style={styles.detail}>Valid until: {new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</Text> : null}
        {invoice.customer?.name ? <Text style={styles.detail}>{isQuote ? 'Prepared for:' : 'Bill to:'} <Text style={styles.label}>{invoice.customer.name}</Text></Text> : null}
        {data.customerAddress.length ? <Text style={styles.detail}>{data.customerAddress.join('\n')}</Text> : null}
        {!isQuote && data.status ? <Text style={styles.label}>{data.status}</Text> : null}
        <View style={{ marginTop: 7 }}>
          <InvoiceBarcode number={invoice.number} id={invoice.id} maxWidth={166} height={19} scale={1.12} />
        </View>
      </View>
      {data.shipTo ? (
        <View style={{ marginTop: 8, padding: 6, borderRadius: 4, backgroundColor: '#f4f4f5' }}>
          <Text style={styles.label}>Ship to</Text>
          {data.shipTo.name ? <Text style={[styles.detail, styles.label]}>{data.shipTo.name}</Text> : null}
          {data.shipTo.address.length ? <Text style={styles.detail}>{data.shipTo.address.join('\n')}</Text> : null}
        </View>
      ) : null}
      <View style={styles.divider} />
      {data.items.map((item) => {
        const image = resolveImageSrcForPrint(item.image, baseUrl);
        return (
          <View key={item.id} style={styles.row}>
            {image ? <Image src={image} style={styles.photo} /> : null}
            <View style={styles.item}>
              <Text style={styles.label}>{item.title}</Text>
              {item.description ? <Text style={styles.detail}>{item.description}</Text> : null}
              <Text style={[styles.detail, styles.label]}>{item.quantity}</Text>
            </View>
            <Text style={styles.amount}>{item.amount}</Text>
          </View>
        );
      })}
      {data.totals.map(({ label, amount }) => (
        <View key={label} style={styles.totalRow}><Text>{label}</Text><Text>{amount}</Text></View>
      ))}
      <View style={styles.balance}><Text>{isQuote ? 'QUOTED TOTAL' : 'TOTAL DUE'}</Text><Text>{data.balance}</Text></View>
      <View style={{ marginTop: 7, paddingTop: 0, alignItems: 'center', gap: 5 }} wrap={false}>
        <Link src="https://wise.com/pay/me/ajmala214" style={{ width: 174, height: 30, textDecoration: 'none', borderWidth: 0, backgroundColor: 'transparent' }}>
          <Image src={buttonImages?.wise ?? `${baseUrl}/Pay%20with%20Wise%20Button.png`} style={{ width: 174, height: 30, objectFit: 'contain', borderWidth: 0 }} />
        </Link>
        {isQuote ? (
          <Link src={downloadUrl ?? baseUrl} style={{ width: 174, height: 30, textDecoration: 'none' }}>
            <View style={[styles.action, { width: 174, height: 30, borderColor: '#e4001b', backgroundColor: '#e4001b' }]}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#ffffff', letterSpacing: 0.4 }}>DOWNLOAD QUOTE</Text>
            </View>
          </Link>
        ) : (
          <Link src={downloadUrl!} style={{ width: 174, height: 30, textDecoration: 'none', borderWidth: 0, backgroundColor: 'transparent' }}>
            <Image src={buttonImages?.download ?? `${baseUrl}/Sourcing%20Center%20Download%20Invoice%20Button.png`} style={{ width: 174, height: 30, objectFit: 'contain', borderWidth: 0 }} />
          </Link>
        )}
      </View>
      {invoice.notes ? <Text style={[styles.detail, { marginTop: 8 }]}>{invoice.notes}</Text> : null}
      <View style={styles.footer}>
        {!isQuote ? <InvoiceTrackingQr accent="#18181b" background="#ffffff" /> : null}
        {data.website ? <Text style={styles.detail}>{data.website}</Text> : null}
        {!repMarkets ? <Image src={sevenColorMark} style={{ width: 24, height: 24, marginTop: 8, objectFit: 'contain' }} /> : null}
      </View>
    </Page>
  );
}

import { Image, Link, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import type { Invoice, Organization } from '@/lib/api';
import { resolveImageSrcForPrint } from '@/lib/organization-branding';
import { InvoiceBarcode } from './invoice-barcode';
import { getMobileInvoiceData } from './mobile-invoice-data';
import { trackingQrPath, trackingUrl } from './invoice-tracking-qr-data';
import { sevenColorMark } from './sourcing-brand-mark';

const RECEIPT_WIDTH = (80 / 25.4) * 72;
const GREEN = '#064d3c';
const MUTED = '#475569';
const RED = '#e50035';

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 8, paddingVertical: 9, backgroundColor: '#f5f8fa',
    color: '#111827', fontFamily: 'Helvetica', fontSize: 8.8,
  },
  sheet: {
    paddingHorizontal: 9, paddingTop: 10, paddingBottom: 12,
    borderRadius: 14, backgroundColor: '#ffffff',
    borderWidth: 0.8, borderColor: '#e6edf1',
  },
  center: { alignItems: 'center', textAlign: 'center' },
  wordmark: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  wordmarkText: { color: '#101827', fontSize: 17.2, fontWeight: 'bold', letterSpacing: -0.8 },
  company: { fontSize: 7.6, color: '#263342', marginTop: 3, textAlign: 'center' },
  contact: { fontSize: 7.1, color: MUTED, marginTop: 3, textAlign: 'center' },
  separator: { height: 1, backgroundColor: '#e2e8f0', marginTop: 9, marginBottom: 8 },
  heading: {
    backgroundColor: '#eaf8ef', borderRadius: 11,
    paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center',
  },
  headingText: { color: GREEN, fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5 },
  metadata: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 6, paddingVertical: 7, backgroundColor: '#f8fafc',
    borderWidth: 0.7, borderColor: '#e8ecf2', borderRadius: 9, marginTop: 6, gap: 5,
  },
  metadataNumber: { flex: 1, fontWeight: 'bold', fontSize: 7.7, color: '#121826' },
  metadataDate: { fontSize: 7, color: '#344152', textAlign: 'right' },
  billTo: {
    flexDirection: 'row', alignItems: 'flex-start', marginTop: 7,
    backgroundColor: '#f0f8f6', borderRadius: 10,
    borderWidth: 0.6, borderColor: '#e0f0eb', padding: 8, gap: 7,
  },
  billName: { width: '43%', paddingRight: 4, borderRightWidth: 0.7, borderRightColor: '#d3e0df' },
  billAddress: { flex: 1 },
  smallMuted: { fontSize: 6.9, color: MUTED },
  name: { fontSize: 8.1, fontWeight: 'bold', marginTop: 3 },
  address: { fontSize: 7.3, lineHeight: 10.3, color: '#1e293b' },
  items: { marginTop: 9 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7,
    borderTopWidth: 0.75, borderBottomWidth: 0.75,
    borderStyle: 'dashed', borderColor: '#bdcbd3',
  },
  itemPhoto: { width: 30, height: 30, borderRadius: 5, objectFit: 'cover' },
  itemContent: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 9.8, fontWeight: 'bold', color: '#0f172a' },
  itemDetail: { fontSize: 7.2, color: '#334155', marginTop: 2 },
  itemAmount: {
    fontWeight: 'bold', fontSize: 8.1, color: GREEN,
    backgroundColor: '#e5f8ed', paddingHorizontal: 5, paddingVertical: 5,
    borderRadius: 9, textAlign: 'right', maxWidth: 74,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 5 },
  totalLabel: { fontSize: 8.7 },
  totalAmount: { fontSize: 8.7, textAlign: 'right' },
  due: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1.1, borderBottomWidth: 1.1,
    borderColor: GREEN, paddingVertical: 7, marginTop: 8,
  },
  dueText: { color: GREEN, fontSize: 11.6, fontWeight: 'bold' },
  buttonRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 5, marginTop: 9,
  },
  button: { width: 94, height: 25, borderWidth: 0, backgroundColor: 'transparent' },
  buttonImg: { width: 94, height: 25, objectFit: 'fill', borderWidth: 0 },
  note: {
    alignSelf: 'flex-end', backgroundColor: '#fff0f4', color: '#a1124a',
    paddingVertical: 5, paddingHorizontal: 6, borderRadius: 8,
    fontSize: 6.7, marginTop: 4,
  },
  tracking: {
    marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: '#f8fbfd', borderWidth: 0.7, borderColor: '#e0e9ee',
    borderRadius: 10, padding: 7,
  },
  trackingTitle: { fontSize: 9.1, fontWeight: 'bold', marginBottom: 3 },
  trackingLink: { color: GREEN, fontSize: 7.8, textDecoration: 'underline', marginBottom: 3 },
  footer: { alignItems: 'center', marginTop: 9 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  footerLine: { height: 0.6, width: 58, backgroundColor: '#cad4d9' },
});

export function InvoiceV6Pdf({
  invoice, org, baseUrl, buttonImages, downloadUrl,
}: {
  invoice: Invoice;
  org: Organization;
  baseUrl: string;
  buttonImages?: { wise: string; download: string };
  downloadUrl?: string;
}) {
  if (!downloadUrl || !downloadUrl.startsWith('https://soloflow.practicalthings.store/api/pdf/public-invoice/')) {
    throw new Error('Invoice Version 6 requires a secure public Invoice Version 1 download link.');
  }

  const data = getMobileInvoiceData(invoice, org);

  return (
    <Page size={{ width: RECEIPT_WIDTH }} style={styles.page} wrap={false}>
      <View style={styles.sheet}>
        <View style={styles.center}>
          <View style={styles.wordmark}>
            <Image src={sevenColorMark} style={{ width: 17, height: 19, objectFit: 'contain' }} />
            <Text style={styles.wordmarkText}>
              sourcing<Text style={{ color: RED }}>.center</Text>
            </Text>
          </View>
          <Text style={styles.company}>{data.organizationName}</Text>
          {data.address ? <Text style={styles.contact}>{data.address}</Text> : null}
          {data.contact ? <Text style={styles.contact}>{data.contact}</Text> : null}
          {data.taxId ? <Text style={styles.contact}>TRN {data.taxId}</Text> : null}
        </View>

        <View style={styles.separator} />
        <View style={styles.heading}>
          <Text style={styles.headingText}>INVOICE</Text>
        </View>
        <View style={styles.metadata}>
          <Text style={styles.metadataNumber}>{invoice.number}</Text>
          <Text style={styles.metadataDate}>{data.date}</Text>
        </View>

        <View style={styles.billTo}>
          <View style={styles.billName}>
            <Text style={styles.smallMuted}>Bill to</Text>
            <Text style={styles.name}>{invoice.customer?.name || 'Customer'}</Text>
          </View>
          <View style={styles.billAddress}>
            {data.customerAddress.length > 0 ? (
              <Text style={styles.address}>{data.customerAddress.join('\n')}</Text>
            ) : <Text style={styles.address}>Address not provided</Text>}
          </View>
        </View>
        {data.status ? <Text style={{ color: '#b91c1c', marginTop: 4, fontSize: 8, fontWeight: 'bold' }}>{data.status}</Text> : null}
        {data.shipTo ? (
          <View style={{ marginTop: 6, padding: 6, borderRadius: 7, backgroundColor: '#f1f5f9' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 7 }}>SHIP TO {data.shipTo.name ?? ''}</Text>
            <Text style={styles.smallMuted}>{data.shipTo.address.join('\n')}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 9, alignItems: 'center' }}>
          <InvoiceBarcode number={invoice.number} id={invoice.id} maxWidth={175} height={21} scale={1.1} />
        </View>

        <View style={styles.items}>
          {data.items.map((item) => {
            const productImage = resolveImageSrcForPrint(item.image, baseUrl);
            return (
              <View key={item.id} style={styles.item} wrap={false}>
                {productImage ? <Image src={productImage} style={styles.itemPhoto} /> : null}
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.description ? <Text style={styles.itemDetail}>{item.description}</Text> : null}
                  <Text style={[styles.itemDetail, { fontWeight: 'bold' }]}>{item.quantity}</Text>
                </View>
                <Text style={styles.itemAmount}>{item.amount}</Text>
              </View>
            );
          })}
        </View>

        <View style={{ marginTop: 5 }}>
          {data.totals.map(({ label, amount }) => (
            <View key={label} style={styles.totalRow}>
              <Text style={styles.totalLabel}>{label}</Text>
              <Text style={styles.totalAmount}>{amount}</Text>
            </View>
          ))}
          <View style={styles.due}>
            <Text style={styles.dueText}>TOTAL DUE</Text>
            <Text style={styles.dueText}>{data.balance}</Text>
          </View>
        </View>

        <View style={styles.buttonRow} wrap={false}>
          <Link src="https://wise.com/pay/me/ajmala214" style={styles.button}>
            <Image src={buttonImages?.wise ?? baseUrl + '/Pay%20with%20Wise%20Button.png'} style={styles.buttonImg} />
          </Link>
          <Link src={downloadUrl} style={styles.button}>
            <Image src={buttonImages?.download ?? baseUrl + '/Sourcing%20Center%20Download%20Invoice%20Button.png'} style={styles.buttonImg} />
          </Link>
        </View>
        <Text style={styles.note}>Opens in a browser — no login required</Text>

        {invoice.notes ? <Text style={{ marginTop: 8, color: MUTED, fontSize: 7.5 }}>{invoice.notes}</Text> : null}

        <View style={styles.tracking} wrap={false}>
          <Svg width={59} height={59} viewBox="0 0 37 37">
            <Path d={trackingQrPath} fill="#000000" />
          </Svg>
          <View style={{ flex: 1 }}>
            <Text style={styles.trackingTitle}>Track your parcel</Text>
            <Link src={trackingUrl} style={styles.trackingLink}>www.sourcing.center/track</Link>
            <Text style={{ color: MUTED, fontSize: 7.5 }}>www.sourcing.center</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <View style={styles.footerLine} />
            <Image src={sevenColorMark} style={{ width: 22, height: 22, objectFit: 'contain' }} />
            <View style={styles.footerLine} />
          </View>
        </View>
      </View>
    </Page>
  );
}

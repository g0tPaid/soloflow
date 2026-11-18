import { Image, Link, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
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

export function MobileInvoicePdf({ invoice, org, baseUrl }: { invoice: Invoice; org: Organization; baseUrl: string }) {
  const data = getMobileInvoiceData(invoice, org);

  return (
    <Page size={{ width: RECEIPT_WIDTH }} style={styles.page} wrap={false}>
      <View style={styles.center}>
        <SourcingBrand wordmarkOnly />
        <Text style={styles.brand}>{data.organizationName}</Text>
        {data.address ? <Text style={styles.detail}>{data.address}</Text> : null}
        {data.contact ? <Text style={styles.detail}>{data.contact}</Text> : null}
        {data.taxId ? <Text style={styles.detail}>TRN {data.taxId}</Text> : null}
        <Text style={styles.heading}>INVOICE <Text style={styles.invoiceNumber}> · {invoice.number}</Text></Text>
        <Text style={styles.detail}>{data.date}</Text>
        {invoice.customer?.name ? <Text style={styles.detail}>Bill to: <Text style={styles.label}>{invoice.customer.name}</Text></Text> : null}
        {data.customerAddress.length ? <Text style={styles.detail}>{data.customerAddress.join('\n')}</Text> : null}
        {data.status ? <Text style={styles.label}>{data.status}</Text> : null}
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
      <View style={styles.balance}><Text>TOTAL DUE</Text><Text>{data.balance}</Text></View>
      <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#d4d4d8', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }} wrap={false}>
        <Link src="https://wise.com/pay/me/ajmala214" style={{ width: 93, height: 29, borderRadius: 7, backgroundColor: '#07451e', position: 'relative', overflow: 'hidden', textDecoration: 'none' }}>
          <View style={{ position: 'absolute', top: 0, left: 0 }}>
            <Svg width={93} height={29} viewBox="0 0 93 29">
              <Path d="M78 0H93V29H83L90 9H82L78 0Z" fill="#2d8b38" opacity={0.45} />
              <Path d="M0 0H93V4H0Z" fill="#195c2b" opacity={0.35} />
              <Path d="M4 9h12l-3 4H8l-4-4zM9 14h10l-3 4H7l2-4z" fill="#ffffff" />
              <Path d="M39 8V22" stroke="#d6e6d7" strokeWidth={0.6} />
            </Svg>
          </View>
          <View style={{ position: 'absolute', top: 0, left: 0, width: 93, height: 29, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ width: 37, textAlign: 'center', color: '#ffffff', fontSize: 11, fontWeight: 'bold', paddingLeft: 9 }}>WISE</Text>
            <Text style={{ width: 56, textAlign: 'center', color: '#ffffff', fontSize: 7, fontWeight: 'bold', paddingLeft: 3 }}>Pay with Wise</Text>
          </View>
        </Link>
        <Link src={`${baseUrl}/api/pdf/print/invoices/${encodeURIComponent(invoice.id)}?org=${encodeURIComponent(org.id)}&version=1`} style={{ width: 105, height: 29, borderRadius: 7, backgroundColor: '#e60020', position: 'relative', overflow: 'hidden', textDecoration: 'none' }}>
          <View style={{ position: 'absolute', top: 0, left: 0 }}>
            <Svg width={105} height={29} viewBox="0 0 105 29">
              <Path d="M89 0h16v29H75L89 0Z" fill="#ff4351" opacity={0.4} />
              <Path d="M0 0h105v4H0Z" fill="#ff6972" opacity={0.2} />
              <Path d="M58 6v17" stroke="#ffffff" strokeWidth={0.65} opacity={0.85} />
              <Path d="M69 10v9m-4-4 4 4 4-4M64 22h10" stroke="#ffffff" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <View style={{ position: 'absolute', left: 3, top: 6, width: 53 }}>
            <Text style={{ color: '#ffffff', fontSize: 7.4, fontWeight: 'bold', textAlign: 'center' }}>sourcing.center</Text>
            <Text style={{ color: '#ffffff', fontSize: 4.3, textAlign: 'center', marginTop: 2 }}>by Seven Color Trading</Text>
          </View>
          <View style={{ position: 'absolute', left: 76, top: 7, width: 27 }}>
            <Text style={{ color: '#ffffff', fontSize: 7.1, fontWeight: 'bold', textAlign: 'center' }}>Download</Text>
            <Text style={{ color: '#ffffff', fontSize: 7.1, fontWeight: 'bold', textAlign: 'center' }}>Invoice</Text>
          </View>
        </Link>
      </View>
      {invoice.notes ? <Text style={[styles.detail, { marginTop: 8 }]}>{invoice.notes}</Text> : null}
      <View style={styles.footer}>
        <InvoiceTrackingQr accent="#18181b" background="#ffffff" />
        {data.website ? <Text style={styles.detail}>{data.website}</Text> : null}
        <Image src={sevenColorMark} style={{ width: 24, height: 24, marginTop: 8, objectFit: 'contain' }} />
      </View>
    </Page>
  );
}

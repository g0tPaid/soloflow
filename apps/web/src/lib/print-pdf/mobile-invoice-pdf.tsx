import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Invoice, Organization } from '@/lib/api';
import { resolveImageSrcForPrint } from '@/lib/organization-branding';
import { InvoiceBarcode } from './invoice-barcode';
import { InvoiceTrackingQr } from './invoice-v2-pdf';
import { getMobileInvoiceData } from './mobile-invoice-data';

const RECEIPT_WIDTH = (80 / 25.4) * 72;
const styles = StyleSheet.create({
  page: { paddingHorizontal: 12, paddingVertical: 14, color: '#121212', fontFamily: 'Helvetica', fontSize: 9 },
  center: { alignItems: 'center', textAlign: 'center' },
  logo: { width: 98, height: 34, objectFit: 'contain', marginBottom: 5 },
  brand: { fontSize: 13, fontWeight: 'bold' },
  heading: { fontSize: 17, fontWeight: 'bold', marginTop: 8, marginBottom: 3 },
  detail: { fontSize: 8, marginTop: 3, color: '#3f3f46' },
  divider: { borderTopWidth: 1, borderTopColor: '#8b8b91', borderStyle: 'dashed', marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  photo: { width: 28, height: 28, borderRadius: 3, marginRight: 6, objectFit: 'cover' },
  item: { flex: 1, paddingRight: 4 },
  label: { fontWeight: 'bold' },
  amount: { minWidth: 56, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 5, marginBottom: 4 },
  balance: { flexDirection: 'row', justifyContent: 'space-between', gap: 5, borderTopWidth: 1.5, borderBottomWidth: 1.5, paddingVertical: 6, marginTop: 4, fontSize: 12, fontWeight: 'bold' },
  footer: { marginTop: 10, alignItems: 'center' },
});

export function MobileInvoicePdf({ invoice, org, baseUrl }: { invoice: Invoice; org: Organization; baseUrl: string }) {
  const data = getMobileInvoiceData(invoice, org);
  const logo = resolveImageSrcForPrint(data.logo, baseUrl);

  return (
    <Page size={{ width: RECEIPT_WIDTH }} style={styles.page} wrap={false}>
      <View style={styles.center}>
        {logo ? <Image src={logo} style={styles.logo} /> : null}
        <Text style={styles.brand}>{data.organizationName}</Text>
        {data.address ? <Text style={styles.detail}>{data.address}</Text> : null}
        {data.contact ? <Text style={styles.detail}>{data.contact}</Text> : null}
        {data.taxId ? <Text style={styles.detail}>TRN {data.taxId}</Text> : null}
        <Text style={styles.heading}>INVOICE</Text>
        <Text style={styles.label}>{invoice.number}</Text>
        <Text style={styles.detail}>{data.date}</Text>
        {invoice.customer?.name ? <Text style={styles.detail}>Bill to: {invoice.customer.name}</Text> : null}
        {data.status ? <Text style={styles.label}>{data.status}</Text> : null}
      </View>
      <View style={styles.divider} />
      {data.items.map((item) => {
        const image = resolveImageSrcForPrint(item.image, baseUrl);
        return (
          <View key={item.id} style={styles.row}>
            {image ? <Image src={image} style={styles.photo} /> : null}
            <View style={styles.item}>
              <Text style={styles.label}>{item.title}</Text>
              {item.description ? <Text style={styles.detail}>{item.description}</Text> : null}
              <Text style={styles.detail}>{item.quantity}</Text>
            </View>
            <Text style={styles.amount}>{item.amount}</Text>
          </View>
        );
      })}
      <View style={styles.divider} />
      {data.totals.map(({ label, amount }) => (
        <View key={label} style={styles.totalRow}><Text>{label}</Text><Text>{amount}</Text></View>
      ))}
      <View style={styles.balance}><Text>TOTAL DUE</Text><Text>{data.balance}</Text></View>
      {invoice.notes ? <Text style={[styles.detail, { marginTop: 8 }]}>{invoice.notes}</Text> : null}
      <View style={styles.footer}>
        <InvoiceBarcode number={invoice.number} id={invoice.id} maxWidth={RECEIPT_WIDTH - 24} />
        <InvoiceTrackingQr accent="#18181b" background="#ffffff" />
        {data.website ? <Text style={styles.detail}>{data.website}</Text> : null}
      </View>
    </Page>
  );
}

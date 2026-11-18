import {
  Defs, Image, LinearGradient, Link, Page, Path, Rect, Stop,
  StyleSheet, Svg, Text, View,
} from '@react-pdf/renderer';
import type { Invoice, Organization } from '@/lib/api';
import { parseBranding, resolveImageSrcForPrint } from '@/lib/organization-branding';
import { InvoiceBarcode } from './invoice-barcode';
import { getMobileInvoiceData } from './mobile-invoice-data';
import { trackingQrPath, trackingUrl } from './invoice-tracking-qr-data';
import { sevenColorMark } from './sourcing-brand-mark';

const WIDTH = (80 / 25.4) * 72;
const DARK_GREEN = '#064835';
const RED = '#ec0036';
const SLATE = '#475569';

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 6, paddingVertical: 8, backgroundColor: '#f2f6fc',
    color: '#111827', fontSize: 8.5, fontFamily: 'Helvetica',
  },
  receipt: {
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 0.7, borderColor: '#e0e7ed',
    paddingHorizontal: 9, paddingTop: 10, paddingBottom: 10,
  },
  center: { alignItems: 'center', textAlign: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  wordmark: { fontWeight: 'bold', color: '#111827', fontSize: 13.4, letterSpacing: -0.6 },
  orgName: { textAlign: 'center', marginTop: 3, color: '#24303f', fontSize: 7.4 },
  companyContact: {
    marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 3,
  },
  contactText: { fontSize: 7, color: '#344255', textAlign: 'center' },
  divider: { height: 0.7, backgroundColor: '#d5dfe6', marginTop: 6, marginBottom: 5 },
  invoiceBar: {
    flexDirection: 'row', alignItems: 'center',
    minHeight: 24, gap: 4, paddingHorizontal: 5,
  },
  invoiceTitle: { color: DARK_GREEN, fontSize: 10.1, fontWeight: 'bold' },
  invoiceNumber: {
    flex: 1, paddingHorizontal: 3, color: '#172033',
    fontSize: 7.7, fontWeight: 'medium',
  },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#f1f5fa', borderWidth: 0.6,
    borderColor: '#dae2e9', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 4,
  },
  dateText: { color: '#28374b', fontSize: 6.9 },
  billCard: {
    marginTop: 6, flexDirection: 'row', minHeight: 42, alignItems: 'flex-start',
    backgroundColor: '#eff8f6', borderWidth: 0.6, borderColor: '#e4eff0',
    borderRadius: 11, paddingVertical: 5, paddingHorizontal: 7,
  },
  billLeft: { width: '43%', paddingRight: 6, borderRightWidth: 0.7, borderRightColor: '#c2d0d4' },
  billRight: { width: '57%', flexDirection: 'row', alignItems: 'flex-start', gap: 4, paddingLeft: 6 },
  muted: { color: SLATE, fontSize: 7.1 },
  customerName: { color: '#172033', fontSize: 9, fontWeight: 'bold', marginTop: 2 },
  address: { fontSize: 7.6, lineHeight: 8.8, color: '#1f2937', flex: 1 },
  dashed: {
    borderTopWidth: 0.8, borderTopColor: '#b8c6d0',
    borderStyle: 'dashed', marginTop: 5,
  },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fbfcfe', borderRadius: 10,
    borderWidth: 0.6, borderColor: '#e7ecf1', marginTop: 5,
    paddingVertical: 5, paddingHorizontal: 5,
  },
  productPhoto: { width: 29, height: 29, borderRadius: 5, objectFit: 'cover' },
  itemText: { flex: 1 },
  productName: { fontSize: 10, fontWeight: 'bold', color: '#0f172a' },
  productDescription: { marginTop: 2, color: SLATE, fontSize: 7.4 },
  quantity: { color: '#334155', fontWeight: 'bold', fontSize: 7.9, marginTop: 2 },
  pricePill: {
    backgroundColor: '#e2f6e9', borderRadius: 10, paddingVertical: 7,
    paddingHorizontal: 5, textAlign: 'center', fontWeight: 'bold',
    color: DARK_GREEN, fontSize: 8.4, maxWidth: 75,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    gap: 6, marginTop: 4, fontSize: 9,
  },
  totalAmount: { textAlign: 'right' },
  totalDue: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderTopWidth: 1.25, borderBottomWidth: 1.25,
    borderColor: DARK_GREEN, marginTop: 7, paddingVertical: 4, gap: 6,
  },
  totalDueText: { color: DARK_GREEN, fontWeight: 'bold', fontSize: 11.4 },
  buttonRow: {
    flexDirection: 'row', gap: 5, justifyContent: 'center',
    alignItems: 'center', marginTop: 8,
  },
  wiseButton: { width: 88.1, height: 24.5, borderWidth: 0, backgroundColor: 'transparent' },
  wiseButtonImg: { width: 88.1, height: 24.5, objectFit: 'fill' },
  downloadButton: { width: 103.2, height: 24.5, borderWidth: 0, backgroundColor: 'transparent' },
  downloadButtonImg: { width: 103.2, height: 24.5, objectFit: 'fill' },
  browserNote: {
    alignSelf: 'flex-end', color: '#971444',
    backgroundColor: '#ffebf3', borderRadius: 9,
    paddingHorizontal: 5, paddingVertical: 5, marginTop: 4,
    fontSize: 6.45,
  },
  trackingCard: {
    marginTop: 8, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 6,
    backgroundColor: '#f8fafc', borderWidth: 0.7, borderColor: '#e4eaf0',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  trackingText: { flex: 1 },
  trackingTitle: { fontSize: 9.9, fontWeight: 'bold', color: '#111827' },
  trackingLink: { marginTop: 5, fontSize: 7.5, color: '#087048', textDecoration: 'underline' },
  trackingSite: { marginTop: 4, fontSize: 7.4, color: '#566579' },
  footer: { marginTop: 7, flexDirection: 'row', justifyContent: 'center', gap: 9, alignItems: 'center' },
  footerLine: { width: 60, height: 0.7, backgroundColor: '#b8c6d0' },
});

function Icon({ name, size = 11, color = '#475569' }: {
  name: 'pin' | 'user' | 'calendar' | 'receipt' | 'phone' | 'mail' | 'web';
  size?: number;
  color?: string;
}) {
  const outline = {
    stroke: color, strokeWidth: 1.9, strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const, fill: 'none',
  };
  let path: React.ReactNode;
  switch (name) {
    case 'pin':
      path = <><Path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" {...outline} /><Path d="M12 10a2.5 2.5 0 1 0 0 .01" {...outline} /></>;
      break;
    case 'user':
      path = <><Path d="M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Z" {...outline} /><Path d="M4 22v-2a8 8 0 0 1 16 0v2" {...outline} /></>;
      break;
    case 'calendar':
      path = <><Rect x={3} y={5} width={18} height={16} rx={2} {...outline} /><Path d="M7 3v4M17 3v4M3 10h18M8 15h2M14 15h2" {...outline} /></>;
      break;
    case 'receipt':
      path = <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6" {...outline} />;
      break;
    case 'phone':
      path = <Path d="M5 3l4 4-2 3c1.7 3 3.8 5.3 7 7l3-2 4 4-2 2C10 21 3 14 3 5l2-2Z" {...outline} />;
      break;
    case 'mail':
      path = <><Rect x={2} y={5} width={20} height={14} rx={2} {...outline} /><Path d="m3 7 9 7 9-7" {...outline} /></>;
      break;
    default:
      path = <><Path d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20Z" {...outline} /><Path d="M2 12h20M12 2c-5 5-5 15 0 20M12 2c5 5 5 15 0 20" {...outline} /></>;
  }
  return <Svg width={size} height={size} viewBox="0 0 24 24">{path}</Svg>;
}

function MetadataBackdrop() {
  return (
    <Svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 33 }}
      viewBox="0 0 200 33" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="v6-meta-gradient" x1="0%" y1="40%" x2="100%" y2="60%">
          <Stop offset="0%" stopColor="#e8f5ee" />
          <Stop offset="40%" stopColor="#f9fcff" />
          <Stop offset="100%" stopColor="#f1f5fb" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={200} height={33} rx={11} fill="url(#v6-meta-gradient)" />
    </Svg>
  );
}

export function InvoiceV6Pdf({ invoice, org, baseUrl, buttonImages, downloadUrl }: {
  invoice: Invoice;
  org: Organization;
  baseUrl: string;
  buttonImages?: { wise: string; download: string };
  downloadUrl?: string;
}) {
  if (!downloadUrl || !downloadUrl.startsWith('https://soloflow.practicalthings.store/api/pdf/public-invoice/')) {
    throw new Error('Invoice Version 6 requires the secure public Invoice Version 1 download link.');
  }

  const data = getMobileInvoiceData(invoice, org);
  const branding = parseBranding(org?.settings?.branding);
  return (
    <Page size={{ width: WIDTH }} style={styles.page} wrap={false}>
      <View style={styles.receipt}>
        <View style={styles.center}>
          <View style={styles.logoRow}>
            <Image src={sevenColorMark} style={{ width: 15, height: 17, objectFit: 'contain' }} />
            <Text style={styles.wordmark}>sourcing<Text style={{ color: RED }}>.center</Text></Text>
          </View>
          <Text style={styles.orgName}>{data.organizationName}</Text>
          {data.address ? (
            <View style={styles.companyContact}>
              <Icon name="pin" size={10} />
              <Text style={styles.contactText}>{data.address}</Text>
            </View>
          ) : null}
          {(branding.phone || branding.email) ? (
            <View style={styles.companyContact}>
              {branding.phone ? <><Icon name="phone" size={10} /><Text style={styles.contactText}>{branding.phone}</Text></> : null}
              {branding.phone && branding.email ? <View style={{ height: 10, width: 0.6, marginHorizontal: 6, backgroundColor: '#94a3b8' }} /> : null}
              {branding.email ? <><Icon name="mail" size={10} /><Text style={styles.contactText}>{branding.email}</Text></> : null}
            </View>
          ) : null}
          {data.taxId ? <Text style={styles.contactText}>TRN {data.taxId}</Text> : null}
        </View>

        <View style={styles.divider} />
        <View style={{ position: 'relative', borderRadius: 11 }}>
          <MetadataBackdrop />
          <View style={styles.invoiceBar}>
            <View style={{ width: 17, height: 22, justifyContent: 'center', alignItems: 'center', borderRadius: 6, backgroundColor: '#ddf4e5' }}>
              <Icon name="receipt" color={DARK_GREEN} size={14} />
            </View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={{ height: 20, width: 0.7, backgroundColor: '#bbc7cd', marginHorizontal: 1 }} />
            <Text style={styles.invoiceNumber}>{invoice.number}</Text>
            <View style={styles.datePill}><Icon name="calendar" size={11} /><Text style={styles.dateText}>{data.date}</Text></View>
          </View>
        </View>

        <View style={styles.billCard}>
          <View style={styles.billLeft}>
            <Icon name="user" size={16} />
            <Text style={[styles.muted, { marginTop: 3 }]}>Bill to</Text>
            <Text style={styles.customerName}>{invoice.customer?.name || 'Customer'}</Text>
          </View>
          <View style={styles.billRight}>
            <Icon name="pin" size={15} />
            <Text style={styles.address}>{data.customerAddress.length ? data.customerAddress.join('\n') : 'Address not provided'}</Text>
          </View>
        </View>

        {data.status ? <Text style={{ textAlign: 'center', color: '#b91c1c', marginTop: 4, fontWeight: 'bold', fontSize: 7.5 }}>{data.status}</Text> : null}
        {data.shipTo ? (
          <View style={{ backgroundColor: '#f0f4f8', borderRadius: 7, padding: 6, marginTop: 7 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 7.4 }}>Ship to: {data.shipTo.name ?? ''}</Text>
            <Text style={[styles.muted, { marginTop: 2 }]}>{data.shipTo.address.join('\n')}</Text>
          </View>
        ) : null}

        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <InvoiceBarcode number={invoice.number} id={invoice.id} maxWidth={147} height={17} scale={1} />
        </View>
        <View style={styles.dashed} />

        {data.items.map((item) => {
          const img = resolveImageSrcForPrint(item.image, baseUrl);
          return (
            <View key={item.id} style={styles.itemCard} wrap={false}>
              {img ? <Image src={img} style={styles.productPhoto} /> : null}
              <View style={styles.itemText}>
                <Text style={styles.productName}>{item.title}</Text>
                {item.description ? <Text style={styles.productDescription}>{item.description}</Text> : null}
                <Text style={styles.quantity}>{item.quantity}</Text>
              </View>
              <Text style={styles.pricePill}>{item.amount}</Text>
            </View>
          );
        })}
        <View style={styles.dashed} />

        {data.totals.map(({ label, amount }) => (
          <View key={label} style={styles.totalRow}>
            <Text>{label}</Text><Text style={styles.totalAmount}>{amount}</Text>
          </View>
        ))}
        <View style={styles.totalDue}>
          <Text style={styles.totalDueText}>TOTAL DUE</Text>
          <Text style={styles.totalDueText}>{data.balance}</Text>
        </View>

        <View style={styles.buttonRow} wrap={false}>
          <Link src="https://wise.com/pay/me/ajmala214" style={styles.wiseButton}>
            <Image src={buttonImages?.wise ?? baseUrl + '/Pay%20with%20Wise%20Button.png'} style={styles.wiseButtonImg} />
          </Link>
          <Link src={downloadUrl} style={styles.downloadButton}>
            <Image src={buttonImages?.download ?? baseUrl + '/Sourcing%20Center%20Download%20Invoice%20Button.png'} style={styles.downloadButtonImg} />
          </Link>
        </View>
        <View style={styles.browserNote}>
          <Text>Opens in a browser — no login required</Text>
        </View>

        {invoice.notes ? <Text style={{ color: SLATE, fontSize: 7.5, marginTop: 7 }}>{invoice.notes}</Text> : null}

        <View style={styles.trackingCard} wrap={false}>
          <Svg width={42} height={42} viewBox="0 0 37 37">
            <Path d={trackingQrPath} fill="#000000" />
          </Svg>
          <View style={styles.trackingText}>
            <Text style={styles.trackingTitle}>Track your parcel</Text>
            <Link src={trackingUrl} style={styles.trackingLink}>www.sourcing.center/track</Link>
            <Text style={styles.trackingSite}>www.sourcing.center</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Image src={sevenColorMark} style={{ height: 17, width: 17, objectFit: 'contain' }} />
          <View style={styles.footerLine} />
        </View>
      </View>
    </Page>
  );
}

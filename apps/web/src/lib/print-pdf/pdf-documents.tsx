import 'server-only';

import {
  Document,
  Image,
  Page,
  Path,
  StyleSheet,
  Svg,
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
const RED_LIGHT = '#FEE2E2';
const RED_DARK = '#991B1B';
const GREEN = '#059669';
const GREEN_LIGHT = '#D1FAE5';
const GREEN_DARK = '#065F46';

const styles = StyleSheet.create({
  page: {
    paddingBottom: 88,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  pagePad: { paddingHorizontal: 28, paddingTop: 8 },
  center: { textAlign: 'center', alignItems: 'center' },
  muted: { color: '#64748b', fontSize: 8 },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  twoCol: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  colHalf: { flex: 1 },
  logo: { width: 72, height: 72, objectFit: 'contain', marginBottom: 6 },
  logoFallback: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: RED,
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingTop: 18,
    marginBottom: 6,
  },
  continuedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fee2e2',
    marginBottom: 8,
  },
  continuedLogo: { width: 28, height: 28, objectFit: 'contain' },
  continuedLogoFallback: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: RED,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingTop: 6,
  },
  continuedBrand: { marginLeft: 8, fontSize: 10, fontWeight: 'bold', color: '#0f172a' },
  fixedFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  pageNumber: {
    position: 'absolute',
    right: 14,
    bottom: 10,
    color: '#fecaca',
    fontSize: 7,
  },
  brandName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
  tagline: { fontSize: 9, color: RED, marginBottom: 3 },
  billToCard: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  billToInitial: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: RED,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingTop: 6,
    marginBottom: 6,
  },
  billToName: { fontSize: 12, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
  billToThanks: { fontSize: 8, fontStyle: 'italic', color: '#64748b', marginBottom: 6 },
  metaBox: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  invoiceTitle: { fontSize: 26, fontWeight: 'bold', color: RED, textAlign: 'right' },
  shippingCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RED,
    color: '#ffffff',
    paddingVertical: 7,
    paddingHorizontal: 4,
    fontWeight: 'bold',
    fontSize: 7,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  tableHeaderGreen: { backgroundColor: GREEN },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 8,
  },
  tableRowAlt: { backgroundColor: '#f8fafc' },
  // Equal horizontal distribution: # + 5 content columns
  colNo: { width: '8%', textAlign: 'center' },
  colImg: { width: '18%', alignItems: 'center', justifyContent: 'center' },
  colDesc: { width: '30%', paddingHorizontal: 4 },
  colQty: { width: '12%', textAlign: 'center' },
  colPrice: { width: '16%', textAlign: 'right', paddingRight: 4 },
  colAmount: { width: '16%', textAlign: 'right', paddingRight: 4 },
  productImg: { width: 36, height: 36, borderRadius: 4, objectFit: 'cover' },
  notesBox: {
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    fontSize: 9,
    lineHeight: 1.4,
  },
  totalBox: {
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    minHeight: 220,
    justifyContent: 'center',
  },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 2,
    borderTopColor: RED,
    fontWeight: 'bold',
    fontSize: 11,
  },
  banner: { width: '100%', objectFit: 'contain', borderRadius: 12 },
  bannerWrap: { marginTop: 12, width: '100%' },
  offerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  offerBox: {
    flexGrow: 1,
    flexBasis: 0,
    height: 124,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  offerImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  offerTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: RED,
    textAlign: 'center',
    marginBottom: 10,
  },
  signatureImg: { width: 180, height: 180, objectFit: 'contain', alignSelf: 'center' },
  signatureBox: {
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBar: {
    backgroundColor: RED_DARK,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingRight: 56,
  },
  footerText: { color: '#ffffff', fontSize: 8, textAlign: 'center' },
  receiptBanner: {
    backgroundColor: GREEN_DARK,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptBadge: {
    borderWidth: 2,
    borderColor: GREEN,
    backgroundColor: GREEN_LIGHT,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  infoCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    fontSize: 8,
  },
  infoCardGreen: { borderColor: '#d1fae5', backgroundColor: '#ecfdf5' },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 8,
    padding: 10,
    fontSize: 8,
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

function resolveImg(url: string | null | undefined, baseUrl: string) {
  return resolveImageSrcForPrint(url, baseUrl);
}

function TopWave() {
  return (
    <Svg
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      style={{ width: '100%', height: 28 }}
    >
      <Path fill={RED} d="M0,48 C240,80 480,16 720,40 C960,64 1200,24 1440,48 L1440,0 L0,0 Z" />
      <Path
        fill={RED_LIGHT}
        fillOpacity={0.6}
        d="M0,56 C360,32 720,72 1080,44 C1260,32 1380,56 1440,56 L1440,0 L0,0 Z"
      />
    </Svg>
  );
}

function SectionWave() {
  return (
    <Svg
      viewBox="0 0 1440 24"
      preserveAspectRatio="none"
      style={{ width: '100%', height: 10, marginVertical: 6 }}
    >
      <Path
        fill={RED_LIGHT}
        d="M0,12 C180,24 360,0 540,12 C720,24 900,0 1080,12 C1260,24 1380,6 1440,12 L1440,24 L0,24 Z"
      />
    </Svg>
  );
}

function BottomWave() {
  return (
    <Svg
      viewBox="0 0 1440 100"
      preserveAspectRatio="none"
      style={{ width: '100%', height: 44 }}
    >
      <Path
        fill={RED_DARK}
        d="M0,36 C240,0 480,72 720,36 C960,0 1200,72 1440,36 L1440,100 L0,100 Z"
      />
      <Path
        fill={RED}
        fillOpacity={0.85}
        d="M0,52 C360,88 720,16 1080,52 C1260,68 1380,40 1440,52 L1440,100 L0,100 Z"
      />
    </Svg>
  );
}

function ContinuedPageHeader({
  org,
  baseUrl,
}: {
  org: Organization;
  baseUrl: string;
}) {
  const logo = resolveImg(org.logo, baseUrl);
  const initial = (org.name ?? 'C').charAt(0).toUpperCase();

  return (
    <View
      fixed
      render={({ pageNumber }) =>
        pageNumber > 1 ? (
          <View style={styles.continuedHeader}>
            {logo ? (
              <Image src={logo} style={styles.continuedLogo} />
            ) : (
              <Text style={styles.continuedLogoFallback}>{initial}</Text>
            )}
            <Text style={styles.continuedBrand}>{org.name}</Text>
          </View>
        ) : (
          <View />
        )
      }
    />
  );
}

function PageFooter({ contacts }: { contacts: string[] }) {
  const line = contacts.length > 0 ? contacts.join('   ·   ') : '';

  return (
    <View>
      <View style={styles.fixedFooter} fixed>
        <BottomWave />
        <View style={styles.footerBar}>
          {line ? <Text style={styles.footerText}>{line}</Text> : <Text style={styles.footerText}> </Text>}
        </View>
      </View>
      <Text
        style={styles.pageNumber}
        fixed
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
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
  const logo = resolveImg(org.logo, baseUrl);
  const address = formatAddressLines(branding.address).join(' · ');
  const initial = (org.name ?? 'C').charAt(0).toUpperCase();

  return (
    <View style={styles.center}>
      {logo ? (
        <Image src={logo} style={styles.logo} />
      ) : (
        <Text style={[styles.logoFallback, { backgroundColor: accent }]}>{initial}</Text>
      )}
      <Text style={styles.brandName}>{org.name}</Text>
      {branding.tagline ? <Text style={styles.tagline}>{branding.tagline}</Text> : null}
      {address ? <Text style={styles.muted}>{address}</Text> : null}
      <Text style={[styles.muted, { marginTop: 4 }]}>
        {[branding.phone, branding.email, branding.website].filter(Boolean).join(' · ')}
      </Text>
    </View>
  );
}

function ShippingSection({
  method,
  terms,
  fromCountry,
  toCountry,
}: {
  method?: string | null;
  terms?: string | null;
  fromCountry?: string | null;
  toCountry?: string | null;
}) {
  const hasInfo = method || terms || fromCountry || toCountry;
  if (!hasInfo) return null;

  const methodLabel =
    method === 'AIR' ? 'Air freight' : method === 'SEA' ? 'Sea freight' : '-';

  const fromLabel = (fromCountry || '').trim() || '-';
  const toLabel = (toCountry || '').trim() || '-';
  const routeLabel =
    fromCountry || toCountry ? fromLabel + ' to ' + toLabel : '-';

  return (
    <View style={{ marginBottom: 12 }} wrap={false}>
      <Text style={[styles.sectionLabel, { color: RED }]}>Shipping details</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={styles.shippingCard}>
          <Text style={styles.muted}>Method</Text>
          <Text style={{ fontWeight: 'bold', marginTop: 4, fontSize: 9 }}>{methodLabel}</Text>
        </View>
        <View style={styles.shippingCard}>
          <Text style={styles.muted}>Terms</Text>
          <Text style={{ fontWeight: 'bold', marginTop: 4, fontSize: 9 }}>{terms ?? '-'}</Text>
        </View>
        <View style={styles.shippingCard}>
          <Text style={styles.muted}>Country route</Text>
          <Text style={{ fontWeight: 'bold', marginTop: 4, fontSize: 9 }}>{routeLabel}</Text>
        </View>
      </View>
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
  const branding = parseBranding(org.settings?.branding);
  const customerAddress = formatAddressLines(customer?.address ?? undefined);
  const signatureSrc = resolveImg(branding.invoiceSignature, baseUrl);
  const offerSrcs = [
    branding.invoiceOffer1,
    branding.invoiceOffer2,
    branding.invoiceOffer3,
    branding.invoiceOffer4,
  ]
    .map((url) => resolveImg(url, baseUrl))
    .filter(Boolean) as string[];
  const bannerSrc =
    offerSrcs.length === 0 ? resolveImg(branding.invoiceBanner, baseUrl) : undefined;
  const taxAmount = Number(invoice.taxAmount ?? 0);
  const discountAmount = Number(invoice.discount ?? 0);
  const shippingAmount = Number(invoice.shipping ?? 0);
  const footerContacts = [branding.website, branding.phone, branding.email].filter(Boolean);

  return (
    <Page size="A4" style={styles.page} wrap>
      <ContinuedPageHeader org={org} baseUrl={baseUrl} />
      <TopWave />
      <View style={styles.pagePad}>
        <CompanyHeader org={org} baseUrl={baseUrl} />
        <SectionWave />

        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <View style={styles.billToCard}>
              <Text style={styles.billToInitial}>
                {(customer?.name ?? 'C').charAt(0).toUpperCase()}
              </Text>
              <Text style={styles.billToName}>{customer?.name}</Text>
              <Text style={styles.billToThanks}>Thank you for being a valued partner</Text>
              {customerAddress.length > 0 ? (
                <Text style={[styles.muted, { textAlign: 'center', marginBottom: 3 }]}>
                  {customerAddress.join(' · ')}
                </Text>
              ) : null}
              {(customer?.email || customer?.phone) && (
                <Text style={[styles.muted, { textAlign: 'center' }]}>
                  {[customer?.phone, customer?.email].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.colHalf}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.metaBox}>
              <View style={styles.row}>
                <Text style={styles.muted}>Invoice #</Text>
                <Text style={{ fontWeight: 'bold' }}>{invoice.number}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.muted}>Issue Date</Text>
                <Text style={{ fontWeight: 'bold' }}>{fmtDate(invoice.issueDate)}</Text>
              </View>
              {invoice.dueDate ? (
                <View style={styles.row}>
                  <Text style={styles.muted}>Due Date</Text>
                  <Text style={{ fontWeight: 'bold' }}>{fmtDate(invoice.dueDate)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <ShippingSection
          method={invoice.shippingMethod}
          terms={invoice.shippingTerms}
          fromCountry={invoice.shippingFromCountry}
          toCountry={invoice.shippingToCountry}
        />

        <View style={styles.tableHeader} wrap={false}>
          <Text style={styles.colNo}>#</Text>
          <Text style={[styles.colImg, { textAlign: 'center' }]}>Image</Text>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Unit Price</Text>
          <Text style={styles.colAmount}>Amount</Text>
        </View>
        {(invoice.items ?? []).map((item, index) => {
          const { name, description } = parseStoredLineItem(item);
          const imageSrc = resolveImg(item.imageUrl ?? item.product?.imageUrl, baseUrl);
          return (
            <View
              key={item.id}
              wrap={false}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={styles.colNo}>{index + 1}</Text>
              <View style={styles.colImg}>
                {imageSrc ? (
                  <Image src={imageSrc} style={styles.productImg} />
                ) : (
                  <Text style={[styles.muted, { fontSize: 6, textAlign: 'center' }]}>—</Text>
                )}
              </View>
              <View style={styles.colDesc}>
                <Text style={{ fontWeight: 'bold' }}>{name || description || 'Item'}</Text>
                {description && name ? <Text style={styles.muted}>{description}</Text> : null}
              </View>
              <Text style={styles.colQty}>{Number(item.quantity)}</Text>
              <Text style={styles.colPrice}>{money(item.unitPrice, currency)}</Text>
              <Text style={[styles.colAmount, { fontWeight: 'bold' }]}>
                {money(item.amount, currency)}
              </Text>
            </View>
          );
        })}

        {invoice.notes ? (
          <View style={{ marginTop: 12, marginBottom: 8 }} wrap={false}>
            <Text style={[styles.sectionLabel, { color: RED }]}>Notes</Text>
            <View style={styles.notesBox}>
              <Text>{invoice.notes}</Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.twoCol, { marginTop: 8, alignItems: 'stretch' }]} wrap={false}>
          <View style={styles.colHalf}>
            <View style={styles.signatureBox}>
              <Text style={[styles.sectionLabel, { color: RED, marginBottom: 8 }]}>
                Authorized signature
              </Text>
              {signatureSrc ? (
                <Image src={signatureSrc} style={styles.signatureImg} cache={false} />
              ) : (
                <Text style={styles.muted}>No signature uploaded</Text>
              )}
            </View>
          </View>
          <View style={styles.colHalf}>
            <View style={styles.totalBox}>
              <View style={styles.totalLine}>
                <Text style={styles.muted}>Subtotal</Text>
                <Text>{money(invoice.subtotal, currency)}</Text>
              </View>
              {shippingAmount > 0 ? (
                <View style={styles.totalLine}>
                  <Text style={styles.muted}>Shipping</Text>
                  <Text>{money(shippingAmount, currency)}</Text>
                </View>
              ) : null}
              {discountAmount > 0 ? (
                <View style={styles.totalLine}>
                  <Text style={styles.muted}>Discount</Text>
                  <Text style={{ color: RED }}>−{money(discountAmount, currency)}</Text>
                </View>
              ) : null}
              {taxAmount > 0 ? (
                <View style={styles.totalLine}>
                  <Text style={styles.muted}>Tax</Text>
                  <Text>{money(taxAmount, currency)}</Text>
                </View>
              ) : null}
              <View style={styles.grandTotal}>
                <Text>TOTAL DUE</Text>
                <Text style={{ color: RED }}>{money(invoice.total, currency)}</Text>
              </View>
            </View>
          </View>
        </View>

        {offerSrcs.length > 0 ? (
          <View style={styles.bannerWrap} wrap={false} minPresenceAhead={160}>
            <Text style={styles.offerTitle}>New Offers</Text>
            <View style={styles.offerRow}>
              {offerSrcs.map((src, index) => (
                <View key={`offer-${index}`} style={styles.offerBox}>
                  <Image src={src} style={styles.offerImg} cache={false} />
                </View>
              ))}
            </View>
          </View>
        ) : bannerSrc ? (
          <View style={styles.bannerWrap} wrap={false} minPresenceAhead={80}>
            <Text style={styles.offerTitle}>New Offers</Text>
            <View style={{ overflow: 'hidden', borderRadius: 14 }}>
              <Image src={bannerSrc} style={styles.banner} cache={false} />
            </View>
          </View>
        ) : null}
      </View>

      <PageFooter contacts={footerContacts as string[]} />
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
  const branding = parseBranding(org.settings?.branding);
  const companyAddress = formatAddressLines(branding.address).join(' · ');
  const customerAddress = formatAddressLines(invoice.customer?.address ?? undefined);
  const paidDate = fmtDate(invoice.updatedAt || invoice.issueDate);
  const shippingAmount = Number(invoice.shipping ?? 0);
  const discountAmount = Number(invoice.discount ?? 0);
  const signatureSrc = resolveImg(branding.invoiceSignature, baseUrl);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.receiptBanner}>
        <Text style={{ color: '#ffffff', fontSize: 8, fontWeight: 'bold', letterSpacing: 2 }}>
          PAYMENT RECEIVED
        </Text>
      </View>
      <View style={styles.pagePad}>
        <CompanyHeader org={org} baseUrl={baseUrl} accent={GREEN} />
        {companyAddress ? (
          <Text style={[styles.muted, { textAlign: 'center', marginBottom: 8 }]}>{companyAddress}</Text>
        ) : null}

        <View style={styles.receiptBadge}>
          <Text style={{ color: GREEN_DARK, fontSize: 9, fontWeight: 'bold', letterSpacing: 1.5 }}>
            OFFICIAL RECEIPT
          </Text>
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginTop: 6, color: '#0f172a' }}>
            {money(invoice.total, currency)}
          </Text>
          <Text style={{ fontSize: 9, color: GREEN_DARK, marginTop: 4 }}>
            Payment received with thanks
          </Text>
        </View>

        <View style={styles.twoCol}>
          <View style={[styles.infoCard]}>
            <Text style={{ fontSize: 7, fontWeight: 'bold', color: GREEN, marginBottom: 6 }}>
              RECEIVED FROM
            </Text>
            <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>{invoice.customer?.name}</Text>
            {customerAddress.map((line) => (
              <Text key={line} style={styles.muted}>
                {line}
              </Text>
            ))}
            {invoice.customer?.email ? (
              <Text style={styles.muted}>{invoice.customer.email}</Text>
            ) : null}
            {invoice.customer?.phone ? (
              <Text style={styles.muted}>{invoice.customer.phone}</Text>
            ) : null}
          </View>
          <View style={[styles.infoCard, styles.infoCardGreen]}>
            <View style={styles.row}>
              <Text style={styles.muted}>Receipt for invoice</Text>
              <Text style={{ fontWeight: 'bold' }}>{invoice.number}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.muted}>Invoice date</Text>
              <Text style={{ fontWeight: 'bold' }}>{fmtDate(invoice.issueDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.muted}>Payment date</Text>
              <Text style={{ fontWeight: 'bold' }}>{paidDate}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.muted}>Status</Text>
              <Text style={{ fontWeight: 'bold', color: GREEN }}>PAID</Text>
            </View>
          </View>
        </View>

        <View style={[styles.tableHeader, styles.tableHeaderGreen, { marginTop: 8 }]} wrap={false}>
          <Text style={{ width: '8%', textAlign: 'center' }}>#</Text>
          <Text style={{ width: '52%', paddingHorizontal: 4 }}>Description</Text>
          <Text style={{ width: '15%', textAlign: 'center' }}>Qty</Text>
          <Text style={{ width: '25%', textAlign: 'right', paddingRight: 4 }}>Amount</Text>
        </View>
        {(invoice.items ?? []).map((item, index) => {
          const { name, description } = parseStoredLineItem(item);
          return (
            <View
              key={item.id}
              wrap={false}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={{ width: '8%', textAlign: 'center' }}>{index + 1}</Text>
              <View style={{ width: '52%', paddingHorizontal: 4 }}>
                <Text style={{ fontWeight: 'bold' }}>{name || description || 'Item'}</Text>
                {description && name ? <Text style={styles.muted}>{description}</Text> : null}
              </View>
              <Text style={{ width: '15%', textAlign: 'center' }}>{Number(item.quantity)}</Text>
              <Text style={{ width: '25%', textAlign: 'right', paddingRight: 4, fontWeight: 'bold' }}>
                {money(item.amount, currency)}
              </Text>
            </View>
          );
        })}

        <View style={[styles.twoCol, { marginTop: 12, alignItems: 'stretch' }]} wrap={false}>
          <View style={styles.colHalf}>
            <View style={[styles.signatureBox, { borderColor: '#d1fae5' }]}>
              <Text style={[styles.sectionLabel, { color: GREEN, marginBottom: 8 }]}>
                Authorized signature
              </Text>
              {signatureSrc ? (
                <Image src={signatureSrc} style={styles.signatureImg} cache={false} />
              ) : (
                <Text style={styles.muted}>No signature uploaded</Text>
              )}
            </View>
          </View>
          <View style={styles.colHalf}>
            <View style={[styles.totalBox, { borderColor: '#d1fae5' }]}>
              <View style={styles.totalLine}>
                <Text style={styles.muted}>Subtotal</Text>
                <Text>{money(invoice.subtotal, currency)}</Text>
              </View>
              {shippingAmount > 0 ? (
                <View style={styles.totalLine}>
                  <Text style={styles.muted}>Shipping</Text>
                  <Text>{money(shippingAmount, currency)}</Text>
                </View>
              ) : null}
              {discountAmount > 0 ? (
                <View style={styles.totalLine}>
                  <Text style={styles.muted}>Discount</Text>
                  <Text style={{ color: GREEN }}>−{money(discountAmount, currency)}</Text>
                </View>
              ) : null}
              <View style={[styles.grandTotal, { borderTopColor: GREEN }]}>
                <Text>Amount paid</Text>
                <Text style={{ color: GREEN }}>{money(invoice.total, currency)}</Text>
              </View>
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.muted,
            { textAlign: 'center', marginTop: 16, fontStyle: 'italic', fontSize: 9 },
          ]}
        >
          Thank you for your payment. This receipt confirms that invoice {invoice.number} has been
          paid in full.
        </Text>
      </View>
    </Page>
  );
}

function ExpensePdfBody({ expense, baseUrl }: { expense: ExpenseDetail; baseUrl: string }) {
  const currency = expense.currency;
  const revenue = Number(expense.revenue ?? expense.total);
  const customerShipping = Number(expense.customerShipping ?? expense.shipping ?? 0);
  const shippingCost = Number(expense.shippingCost ?? 0);
  const itemsCost = Number(
    expense.itemsCost ??
      (expense.items ?? []).reduce((sum, item) => sum + Number(item.costAmount ?? 0), 0),
  );
  const totalCost = Number(expense.totalCost ?? itemsCost + shippingCost);
  const shippingProfit = Number(expense.shippingProfit ?? customerShipping - shippingCost);
  const profit = Number(expense.profit ?? revenue - totalCost);
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;
  const customerAddress = formatAddressLines(expense.customer?.address ?? undefined);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.pagePad}>
        <View style={[styles.twoCol, { alignItems: 'flex-start' }]}>
          <View style={styles.colHalf}>
            <Text style={[styles.sectionLabel, { color: RED }]}>Expense report</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>
              Invoice {expense.number}
            </Text>
            <Text style={[styles.muted, { marginTop: 4 }]}>
              Issued {fmtDate(expense.issueDate)}
            </Text>
          </View>
          <View style={[styles.infoCard, styles.colHalf]}>
            <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>{expense.customer?.name}</Text>
            {customerAddress.map((line) => (
              <Text key={line} style={styles.muted}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        <ShippingSection
          method={expense.shippingMethod}
          terms={expense.shippingTerms}
          fromCountry={expense.shippingFromCountry}
          toCountry={expense.shippingToCountry}
        />

        <View style={styles.tableHeader} wrap={false}>
          <Text style={{ width: '6%', textAlign: 'center' }}>#</Text>
          <Text style={{ width: '28%', paddingHorizontal: 4 }}>Item</Text>
          <Text style={{ width: '10%', textAlign: 'center' }}>Qty</Text>
          <Text style={{ width: '14%', textAlign: 'right' }}>Sale</Text>
          <Text style={{ width: '14%', textAlign: 'right' }}>Revenue</Text>
          <Text style={{ width: '14%', textAlign: 'right' }}>Cost each</Text>
          <Text style={{ width: '14%', textAlign: 'right', paddingRight: 4 }}>Expense</Text>
        </View>
        {(expense.items ?? []).map((item, index) => {
          const { name, description } = parseStoredLineItem(item);
          const imageSrc = resolveImg(item.imageUrl ?? item.product?.imageUrl, baseUrl);
          return (
            <View
              key={item.id}
              wrap={false}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={{ width: '6%', textAlign: 'center' }}>{index + 1}</Text>
              <View style={{ width: '28%', paddingHorizontal: 4, flexDirection: 'row', gap: 4 }}>
                {imageSrc ? <Image src={imageSrc} style={styles.productImg} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold' }}>{name || description || 'Item'}</Text>
                  {description && name ? <Text style={styles.muted}>{description}</Text> : null}
                </View>
              </View>
              <Text style={{ width: '10%', textAlign: 'center' }}>{Number(item.quantity)}</Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>{money(item.unitPrice, currency)}</Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>{money(item.amount, currency)}</Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>{money(item.unitCost ?? 0, currency)}</Text>
              <Text style={{ width: '14%', textAlign: 'right', paddingRight: 4, color: '#c2410c', fontWeight: 'bold' }}>
                {money(item.costAmount ?? 0, currency)}
              </Text>
            </View>
          );
        })}

        <View style={[styles.twoCol, { marginTop: 12 }]}>
          <View style={styles.summaryCard}>
            <Text style={[styles.sectionLabel, { color: RED }]}>Shipping</Text>
            <View style={styles.totalLine}>
              <Text style={styles.muted}>Customer shipping</Text>
              <Text>{money(customerShipping, currency)}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.muted}>Actual shipping cost</Text>
              <Text style={{ color: '#c2410c' }}>{money(shippingCost, currency)}</Text>
            </View>
            <View style={[styles.totalLine, { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 4, marginTop: 4 }]}>
              <Text style={{ fontWeight: 'bold' }}>Shipping profit</Text>
              <Text style={{ color: shippingProfit >= 0 ? GREEN : RED, fontWeight: 'bold' }}>
                {money(shippingProfit, currency)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.sectionLabel, { color: RED }]}>Summary</Text>
            <View style={styles.totalLine}>
              <Text style={styles.muted}>Invoice revenue</Text>
              <Text>{money(revenue, currency)}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.muted}>Item costs</Text>
              <Text style={{ color: '#c2410c' }}>{money(itemsCost, currency)}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.muted}>Shipping cost</Text>
              <Text style={{ color: '#c2410c' }}>{money(shippingCost, currency)}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.muted}>Total expenses</Text>
              <Text style={{ color: '#c2410c' }}>{money(totalCost, currency)}</Text>
            </View>
            <View style={[styles.grandTotal, { borderTopColor: RED }]}>
              <Text>Profit</Text>
              <Text style={{ color: profit >= 0 ? GREEN : RED }}>
                {money(profit, currency)} ({marginPercent.toFixed(1)}%)
              </Text>
            </View>
          </View>
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
          <ExpensePdfBody expense={document.expense} baseUrl={baseUrl} />
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

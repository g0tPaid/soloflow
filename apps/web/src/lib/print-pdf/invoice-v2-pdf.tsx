import { Image, Link, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import type { Invoice } from '@/lib/api';
import { parseStoredLineItem } from '@/lib/line-items';
import { resolveImageSrcForPrint, type InvoiceAccentPalette } from '@/lib/organization-branding';
import { formatCurrency } from '@/lib/utils';
import { trackingQrPath, trackingUrl } from './invoice-tracking-qr-data';

export const BRANDED_INVOICE_RED = '#c90023';


const styles = StyleSheet.create({
  heading: { fontSize: 8, fontWeight: 'bold', letterSpacing: 1.2, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 7, marginBottom: 5 },
  card: {
    width: '32.3%',
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  serial: { fontSize: 7, fontWeight: 'bold', position: 'absolute', top: 5, left: 7 },
  photo: {
    width: 58,
    height: 42,
    borderRadius: 9,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  image: { width: 58, height: 42, objectFit: 'cover', borderRadius: 9 },
  muted: { fontSize: 8, color: '#64748b' },
  name: { fontSize: 9, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
  price: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  tracking: { alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
});

export function InvoicePhotoGrid({ invoice, baseUrl, colors, branded = false }: {
  invoice: Invoice;
  baseUrl: string;
  colors: InvoiceAccentPalette;
  branded?: boolean;
}) {
  const items = invoice.items ?? [];
  const money = (amount: string | number) => formatCurrency(Number(amount), invoice.currency);
  const rows = Array.from({ length: Math.ceil(items.length / 3) }, (_, index) =>
    items.slice(index * 3, index * 3 + 3),
  );

  return (
    <>
      {rows.map((row, index) => (
        <View key={index} wrap={false}>
          {index === 0 ? (
            <Text style={[
              styles.heading,
              { color: colors.dark },
              branded ? { color: BRANDED_INVOICE_RED, borderColor: BRANDED_INVOICE_RED, borderWidth: 1, marginBottom: 5, paddingVertical: 4, paddingHorizontal: 7, borderRadius: 7 } : {},
            ]}>
              {branded ? 'PRODUCTS' : 'ITEMS'}
            </Text>
          ) : null}
          <View style={styles.row}>
            {row.map((item, column) => {
              const { name, description } = parseStoredLineItem(item);
              const image = resolveImageSrcForPrint(item.imageUrl ?? item.product?.imageUrl, baseUrl);
              return (
                <View key={item.id} style={[styles.card, { borderColor: colors.softBorder }, branded ? { backgroundColor: colors.softBg, borderWidth: 0 } : {}]}>
                <Text style={[styles.serial, { color: colors.dark }, branded ? { backgroundColor: colors.softBg, left: 6, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 } : {}]}>{index * 3 + column + 1}</Text>
                  <View style={[styles.photo, { backgroundColor: branded ? '#ffffff' : colors.softBg }]}>
                    {image ? <Image src={image} style={styles.image} /> : (
                      <Text style={styles.muted}>No photo</Text>
                    )}
                  </View>
                  <Text style={styles.name}>{name || description || 'Item'}</Text>
                  {name && description ? <Text style={styles.muted}>{description}</Text> : null}
                  <Text style={[styles.muted, { marginTop: 2 }]}>{Number(item.quantity)} × {money(item.unitPrice)}</Text>
                  <Text style={[styles.price, { color: colors.dark }]}>{money(item.amount)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </>
  );
}

export function InvoiceTrackingQr({ accent, background, branded = false }: { accent: string; background: string; branded?: boolean }) {
  return (
    <View style={styles.tracking}>
      {branded ? <>
      <Text style={{ color: accent, backgroundColor: background, borderRadius: 4, fontSize: 6, fontWeight: 'bold', letterSpacing: 0.8, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 }}>
        PARCEL TRACKING
      </Text>
      <View style={{ borderRadius: 7, backgroundColor: '#ffffff', padding: 2 }}>
        <Svg width={62} height={62} viewBox="0 0 37 37">
          <Path d={trackingQrPath} fill="#000000" />
        </Svg>
      </View>
      </> : (
        <>
          <Svg width={58} height={58} viewBox="0 0 37 37">
            <Path d={trackingQrPath} fill="#000000" />
          </Svg>
          <Text style={{ fontSize: 8, fontWeight: 'bold' }}>Track your parcel</Text>
        </>
      )}
      <Link src={trackingUrl} style={{ color: accent, fontSize: 7, marginTop: 2 }}>
        www.sourcing.center/track
      </Link>
    </View>
  );
}


import { Path, Svg, Text, View } from '@react-pdf/renderer';
import { buildInvoiceBarcode } from './invoice-barcode-data';

export function InvoiceBarcode({ number, id, maxWidth = 240 }: { number: string; id: string; maxWidth?: number }) {
  const { value, bands, viewBox, width } = buildInvoiceBarcode(number, id);

  return (
    <View style={{ alignItems: 'center', marginBottom: 3 }}>
      <Svg width={Math.min(width, maxWidth)} height={23} viewBox={viewBox} preserveAspectRatio="none">
        {bands.map(({ fill, path }) => <Path key={fill} d={path} fill={fill} />)}
      </Svg>
      <Text style={{ fontSize: 7, color: '#334155' }}>{value}</Text>
    </View>
  );
}

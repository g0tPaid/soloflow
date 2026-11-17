import { Image, Text, View } from '@react-pdf/renderer';

import { sevenColorMark } from './sourcing-brand-mark';

export function SourcingBrand({ horizontal = false }: { horizontal?: boolean }) {
  return (
    <View style={{ flexDirection: horizontal ? 'row' : 'column', alignItems: 'center', gap: horizontal ? 5 : 2 }}>
      <Image src={sevenColorMark} style={{ width: horizontal ? 23 : 45, height: horizontal ? 23 : 45, objectFit: 'contain' }} />
      <Text style={{ fontSize: horizontal ? 21 : 27, fontWeight: 'bold', letterSpacing: -0.7, color: '#18181b' }}>
        sourcing<Text style={{ color: '#e4001b' }}>.center</Text>
      </Text>
    </View>
  );
}

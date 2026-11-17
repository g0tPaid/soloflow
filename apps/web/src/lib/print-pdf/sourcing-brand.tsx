import { Image, Text, View } from '@react-pdf/renderer';

import { sevenColorMark } from './sourcing-brand-mark';

export function SourcingBrand({ wordmarkOnly = false }: { wordmarkOnly?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      {!wordmarkOnly ? <Image src={sevenColorMark} style={{ width: 45, height: 45, objectFit: 'contain' }} /> : null}
      <Text style={{ fontSize: 27, fontWeight: 'bold', letterSpacing: -0.7, color: '#18181b' }}>
        sourcing<Text style={{ color: '#e4001b' }}>.center</Text>
      </Text>
    </View>
  );
}

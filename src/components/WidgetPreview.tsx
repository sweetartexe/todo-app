import { StyleSheet, Text, View } from 'react-native';
import { PetScene } from '@/components/PetScene';
import type { Outfit } from '@/domain/types';
import { colors, fonts } from '@/theme';

export function WidgetPreview({
  outfit,
  todayOpen,
  todayDone,
}: {
  outfit: Outfit;
  todayOpen: number;
  todayDone: number;
}) {
  return (
    <View style={styles.widget}>
      <PetScene outfit={outfit} size={108} animate={false} />
      <View style={styles.copy}>
        <Text style={styles.name}>Pebble</Text>
        <Text style={styles.count}>{todayOpen} to do</Text>
        <Text style={styles.sub}>{todayDone} done today</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  widget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFDF9',
    borderRadius: 22,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  copy: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.extra, fontSize: 18, color: colors.ink },
  count: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  sub: { fontFamily: fonts.regular, color: colors.muted },
});

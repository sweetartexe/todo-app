import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CoinPill, Muted, Screen, Title } from '@/components/ui';
import { PetScene } from '@/components/PetScene';
import { useStore } from '@/state/store';
import { colors, fonts } from '@/theme';

const fallback = { hat: null, plant: null, furniture: null, background: 'bg-cozy' };

export default function PetScreen() {
  const store = useStore();
  const pet = store.pet;
  const outfit = pet?.equipped ?? fallback;
  const open = store.lists.reduce((sum, list) => sum + list.openCount, 0);
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Title small>Pebble</Title>
          <CoinPill coins={pet?.coins ?? 0} />
        </View>
        <PetScene outfit={outfit} mood={store.mood} size={340} />
        <View style={styles.card}>
          <Text style={styles.big}>
            {pet?.todayDone ? `${pet.todayDone} done today` : 'Nothing finished yet today'}
          </Text>
          <Muted>
            {open === 0
              ? 'All clear. Pebble is proud.'
              : `${open} still to do across your lists.`}
          </Muted>
          <Muted>
            Finishing a task gives you 10 coins. Unticking it doesn't take them back, and ticking it again doesn't pay twice.
          </Muted>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 16, gap: 8 },
  big: { fontFamily: fonts.extra, fontSize: 22, color: colors.ink },
});

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SHOP_ITEMS, type ItemCategory } from '@/domain/catalog';
import { Banner, Screen, Title } from '@/components/ui';
import { PetScene } from '@/components/PetScene';
import { useStore } from '@/state/store';
import { colors, fonts } from '@/theme';

const categories: Array<{ id: ItemCategory; label: string }> = [
  { id: 'hat', label: 'Hats' },
  { id: 'plant', label: 'Plants' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'background', label: 'Rooms' },
];

const fallback = { hat: null, plant: null, furniture: null, background: 'bg-cozy' };

export default function ShopScreen() {
  const store = useStore();
  const [category, setCategory] = useState<ItemCategory>('hat');
  const outfit = store.pet?.equipped ?? fallback;
  const owned = new Set(store.pet?.owned ?? []);
  const items = SHOP_ITEMS.filter((item) => item.category === category);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Title small>Shop</Title>
        <Text style={styles.coins}>{store.pet?.coins ?? 0} coins</Text>
        {store.error ? <Banner message={store.error} onClose={store.clearError} /> : null}
        <View style={styles.chips}>
          {categories.map((item) => (
            <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.chip, category === item.id && styles.chipOn]}>
              <Text style={[styles.chipText, category === item.id && styles.chipTextOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.grid}>
          {items.map((item) => {
            const mine = owned.has(item.id);
            const wearing = outfit[item.category] === item.id;
            const preview = { ...outfit, [item.category]: item.id };
            return (
              <View key={item.id} style={styles.card}>
                <PetScene outfit={preview} size={150} animate={false} />
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.blurb}>{item.blurb}</Text>
                <Pressable
                  onPress={() => {
                    if (wearing) return;
                    if (mine) store.equip(item.category, item.id).catch(() => undefined);
                    else store.buy(item.id).catch(() => undefined);
                  }}
                  style={[styles.price, wearing && styles.wearing]}
                >
                  <Text style={styles.priceText}>
                    {wearing ? 'Wearing' : mine ? 'Wear' : `${item.price} coins`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 28 },
  coins: { fontFamily: fonts.bold, color: colors.muted, marginTop: -6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.bold, color: colors.ink },
  chipTextOn: { color: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 10,
    gap: 4,
  },
  name: { fontFamily: fonts.extra, fontSize: 16, color: colors.ink },
  blurb: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, minHeight: 34 },
  price: { backgroundColor: '#FFF1C9', borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  wearing: { backgroundColor: colors.mint },
  priceText: { fontFamily: fonts.extra, color: colors.ink, fontSize: 13 },
});

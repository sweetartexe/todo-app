import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Banner, Button, CoinPill, ColorDots, Field, Muted, Screen, Sheet, Title } from '@/components/ui';
import { useStore } from '@/state/store';
import { colors, fonts, listSwatches } from '@/theme';

export default function ListsScreen() {
  const store = useStore();
  const [making, setMaking] = useState(false);
  const [joining, setJoining] = useState(false);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('coral');
  const [code, setCode] = useState('');

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Muted>Hello, {store.user?.displayName}</Muted>
            <Title small>Your lists</Title>
          </View>
          <CoinPill coins={store.pet?.coins ?? store.user?.coins ?? 0} />
        </View>
        {store.error ? <Banner message={store.error} onClose={store.clearError} /> : null}
        {store.lists.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing here yet.</Text>
            <Muted>Make a list, or type a code someone sent you.</Muted>
          </View>
        ) : null}
        {store.lists.map((list) => {
          const swatch = listSwatches[list.color] ?? listSwatches.coral;
          return (
            <Pressable key={list.id} onPress={() => router.push(`/lists/${list.id}`)} style={styles.card}>
              <View style={[styles.bar, { backgroundColor: swatch.bar }]} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{list.title}</Text>
                <Text style={styles.cardMeta}>
                  {list.openCount === 0 ? 'All clear' : `${list.openCount} to do`}
                  {list.role === 'owner' ? ' · yours' : ' · shared'}
                </Text>
              </View>
            </Pressable>
          );
        })}
        <Button label="New list" onPress={() => setMaking(true)} />
        <Button label="I have an invite code" kind="ghost" onPress={() => setJoining(true)} />
      </ScrollView>
      <Sheet visible={making} title="New list" onClose={() => setMaking(false)}>
        <Field label="Name" value={title} onChangeText={setTitle} placeholder="Saturday" />
        <ColorDots value={color} onChange={setColor} />
        <Button
          label="Create"
          onPress={async () => {
            try {
              const id = await store.createList(title, color);
              setMaking(false);
              setTitle('');
              if (id) router.push(`/lists/${id}`);
            } catch {
              setMaking(false);
            }
          }}
        />
      </Sheet>
      <Sheet visible={joining} title="Join a list" onClose={() => setJoining(false)}>
        <Muted>Ask the person who made the list for their code. You'll be able to add and tick tasks right away.</Muted>
        <Field
          label="Invite code"
          autoCapitalize="characters"
          autoCorrect={false}
          value={code}
          onChangeText={setCode}
          placeholder="HOME7K"
        />
        <Button
          label="Join"
          onPress={async () => {
            try {
              const id = await store.joinList(code);
              setJoining(false);
              setCode('');
              if (id) router.push(`/lists/${id}`);
            } catch {
              setJoining(false);
            }
          }}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 6 },
  empty: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 18,
    gap: 6,
  },
  emptyTitle: { fontFamily: fonts.extra, fontSize: 20, color: colors.ink },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 22,
    overflow: 'hidden',
    minHeight: 78,
  },
  bar: { width: 12 },
  cardBody: { flex: 1, padding: 16, justifyContent: 'center', gap: 2 },
  cardTitle: { fontFamily: fonts.extra, fontSize: 20, color: colors.ink },
  cardMeta: { fontFamily: fonts.semibold, color: colors.muted, fontSize: 14 },
});

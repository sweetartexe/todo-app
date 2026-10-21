import { useState } from 'react';
import { PermissionsAndroid, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { KeyManager } from '@/components/KeyManager';
import { WidgetPreview } from '@/components/WidgetPreview';
import { Banner, Button, Field, Muted, Screen, Title } from '@/components/ui';
import { getOverlay } from '@/native/pebble';
import { useStore } from '@/state/store';
import { colors, fonts } from '@/theme';

const fallback = { hat: null, plant: null, furniture: null, background: 'bg-cozy' };

export default function SettingsScreen() {
  const store = useStore();
  const [name, setName] = useState(store.user?.displayName ?? '');
  const [server, setServer] = useState(store.apiUrl);
  const [overlayOn, setOverlayOn] = useState(false);
  const [overlayHint, setOverlayHint] = useState<string | null>(null);
  const overlay = getOverlay();
  const outfit = store.pet?.equipped ?? fallback;
  const open = store.lists.reduce((sum, list) => sum + list.openCount, 0);

  async function toggleOverlay(next: boolean) {
    if (!overlay) return;
    setOverlayHint(null);
    try {
      if (!next) {
        await overlay.stop();
        setOverlayOn(false);
        return;
      }
      if (!overlay.canDrawOverlays()) {
        overlay.openPermissionSettings();
        setOverlayHint('When Android asks, allow Pebble to display over other apps. Then come back and switch this on.');
        setOverlayOn(false);
        return;
      }
      if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }
      await overlay.start(outfit);
      setOverlayOn(true);
    } catch (error) {
      setOverlayOn(false);
      setOverlayHint(error instanceof Error ? error.message : 'Pebble could not step onto the screen.');
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Title small>Settings</Title>
        {store.error ? <Banner message={store.error} onClose={store.clearError} /> : null}
        <Text style={styles.section}>You</Text>
        <Field label="Name" value={name} onChangeText={setName} />
        <Button label="Save name" kind="ghost" onPress={() => store.rename(name).catch(() => undefined)} />
        <Muted>Signed in as {store.user?.email}</Muted>
        <Button label="Sign out" kind="quiet" onPress={() => store.signOut()} />

        <Text style={styles.section}>Server</Text>
        <Muted>The phone app talks to a small program that remembers the lists. At home that program runs on your computer.</Muted>
        <Field label="Server address" autoCapitalize="none" autoCorrect={false} value={server} onChangeText={setServer} />
        <Button label="Save address" kind="ghost" onPress={() => store.setApiUrl(server).catch(() => undefined)} />

        <Text style={styles.section}>Assistants</Text>
        <Button label="Connect an AI assistant" onPress={() => router.push('/connect')} />
        <KeyManager />

        <Text style={styles.section}>Pebble on the screen</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Android floating pet</Text>
          <Muted>
            On a full Android app, Pebble can walk on top of other apps. Expo Go and the browser don't include that piece, so the switch stays off here. Your pet on the Pet tab still works.
          </Muted>
          {overlay ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Let Pebble walk on my screen</Text>
              <Switch value={overlayOn} onValueChange={(value) => void toggleOverlay(value)} trackColor={{ true: colors.coral }} />
            </View>
          ) : (
            <Text style={styles.asleep}>Not available in this copy of the app.</Text>
          )}
          {overlayHint ? <Muted>{overlayHint}</Muted> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>iPhone Home Screen</Text>
          <WidgetPreview outfit={outfit} todayOpen={open} todayDone={store.pet?.todayDone ?? 0} />
          <Muted>
            This is a preview of the Home Screen and Lock Screen widget. iOS doesn't allow a pet to float over other apps. Widgets and the Dynamic Island need the full iPhone build. A free Apple ID can't turn on the App Group those widgets use, so they stay asleep until you use a paid Apple Developer account. Expo Go still has Pebble on the Pet tab.
          </Muted>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  section: { fontFamily: fonts.extra, fontSize: 22, color: colors.ink, marginTop: 8 },
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 14, gap: 10 },
  cardTitle: { fontFamily: fonts.extra, fontSize: 18, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontFamily: fonts.bold, color: colors.ink, flex: 1 },
  asleep: { fontFamily: fonts.bold, color: colors.muted },
});

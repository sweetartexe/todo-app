import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Banner, Button, Field, Muted } from '@/components/ui';
import { useStore } from '@/state/store';
import { colors, fonts } from '@/theme';

export function KeyManager() {
  const store = useStore();
  const [name, setName] = useState('My assistant');
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    store.loadKeys().catch(() => undefined);
    // Load once when the manager is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.box}>
      <Text style={styles.heading}>Assistant keys</Text>
      <Muted>A key is like a spare house key. The assistant can see and change tasks until you take it back.</Muted>
      {store.error ? <Banner message={store.error} onClose={store.clearError} /> : null}
      <Field label="Name this key" value={name} onChangeText={setName} placeholder="Claude" />
      <Button
        label="Create a key"
        onPress={async () => {
          try {
            const created = await store.createKey(name.trim() || 'Assistant');
            setSecret(created);
            setCopied(false);
          } catch {
            // banner
          }
        }}
      />
      {secret ? (
        <View style={styles.secretBox}>
          <Text style={styles.secretLabel}>Copy it now. Pebble only shows the full key once.</Text>
          <Text selectable style={styles.secret}>{secret}</Text>
          <Button
            label={copied ? 'Copied' : 'Copy key'}
            kind="ghost"
            onPress={async () => {
              await Clipboard.setStringAsync(secret);
              setCopied(true);
            }}
          />
        </View>
      ) : null}
      {store.keys.length === 0 ? <Muted>No keys yet.</Muted> : null}
      {store.keys.map((key) => (
        <View key={key.id} style={styles.keyRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.keyName}>{key.name}</Text>
            <Text style={styles.prefix}>{key.prefix}</Text>
          </View>
          <Pressable
            onPress={() => {
              if (confirm === key.id) store.revokeKey(key.id).catch(() => undefined);
              else setConfirm(key.id);
            }}
          >
            <Text style={styles.revoke}>{confirm === key.id ? 'Really revoke' : 'Revoke'}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10 },
  heading: { fontFamily: fonts.extra, fontSize: 20, color: colors.ink },
  secretBox: { backgroundColor: '#FFF1C9', borderRadius: 16, padding: 12, gap: 8 },
  secretLabel: { fontFamily: fonts.bold, color: colors.ink },
  secret: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
  },
  keyName: { fontFamily: fonts.bold, color: colors.ink, fontSize: 16 },
  prefix: { fontFamily: fonts.regular, color: colors.muted, fontSize: 13 },
  revoke: { fontFamily: fonts.bold, color: colors.coralDark },
});

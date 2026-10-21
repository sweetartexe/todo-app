import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { PetScene } from '@/components/PetScene';
import { Banner, Button, Field, Muted, Screen, Title } from '@/components/ui';
import { useStore } from '@/state/store';
import { colors, fonts } from '@/theme';

const cozy = { hat: null, plant: 'plant-sprout', furniture: null, background: 'bg-cozy' };

export default function SignIn() {
  const store = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState(store.apiUrl);
  const [showServer, setShowServer] = useState(false);
  const [pending, setPending] = useState(false);

  if (store.user) return <Redirect href="/lists" />;

  async function run(action: () => Promise<void>) {
    setPending(true);
    try {
      await action();
    } catch {
      // The store already keeps the message.
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PetScene outfit={cozy} size={220} />
        <Title>Pebble</Title>
        <Muted>Shared lists, and a little friend who keeps you company.</Muted>
        {store.error ? <Banner message={store.error} onClose={store.clearError} /> : null}
        <Field
          label="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
        />
        <Field
          label="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
        />
        <Button label={pending ? 'One moment…' : 'Come in'} disabled={pending} onPress={() => run(() => store.signIn(email, password))} />
        <Button label="Look around with the demo" kind="ghost" disabled={pending} onPress={() => run(() => store.signInDemo())} />
        <Button label="Make an account" kind="quiet" onPress={() => router.push('/sign-up')} />
        <Pressable onPress={() => setShowServer((value) => !value)}>
          <Text style={styles.link}>{showServer ? 'Hide server address' : "Can't connect?"}</Text>
        </Pressable>
        {showServer ? (
          <View style={styles.server}>
            <Muted>This is the address of the Pebble program on your computer.</Muted>
            <Field label="Server" autoCapitalize="none" autoCorrect={false} value={server} onChangeText={setServer} />
            <Button
              label="Save address"
              kind="ghost"
              onPress={() => run(() => store.setApiUrl(server))}
            />
          </View>
        ) : (
          <Text style={styles.serverHint}>Using {store.apiUrl}</Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 22, gap: 14, paddingBottom: 40 },
  link: { fontFamily: fonts.bold, color: colors.coralDark, textAlign: 'center', fontSize: 15 },
  server: { gap: 10 },
  serverHint: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', fontSize: 13 },
});

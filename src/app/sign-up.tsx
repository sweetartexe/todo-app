import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Banner, Button, Field, Muted, Screen, Title } from '@/components/ui';
import { useStore } from '@/state/store';

export default function SignUp() {
  const store = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  if (store.user) return <Redirect href="/lists" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Title small>Make an account</Title>
        <Muted>Use an email you can remember. Your password stays on the Pebble server, scrambled.</Muted>
        {store.error ? <Banner message={store.error} onClose={store.clearError} /> : null}
        <Field label="Your name" value={name} onChangeText={setName} placeholder="Alex" />
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
        <Button
          label={pending ? 'One moment…' : 'Create my account'}
          disabled={pending}
          onPress={async () => {
            setPending(true);
            try {
              await store.signUp(name, email, password);
            } catch {
              // shown in the banner
            } finally {
              setPending(false);
            }
          }}
        />
        <Button label="I already have one" kind="quiet" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 22, gap: 14, paddingBottom: 40 },
});

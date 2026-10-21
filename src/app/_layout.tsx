import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { StoreProvider } from '@/state/store';
import { colors } from '@/theme';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (Platform.OS === 'web') document.title = 'Pebble';
  }, []);

  if (!loaded && !error) return <View style={styles.boot} />;

  const app = (
    <StoreProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </StoreProvider>
  );

  if (Platform.OS !== 'web') return app;
  return (
    <View style={styles.webOuter}>
      <View style={styles.webPhone}>{app}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: colors.bg },
  webOuter: {
    flex: 1,
    minHeight: '100vh' as unknown as number,
    backgroundColor: '#EAD9C4',
    alignItems: 'center',
  },
  webPhone: {
    width: '100%',
    maxWidth: 430,
    height: '100vh' as unknown as number,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(80, 42, 16, 0.18)',
  } as object,
});

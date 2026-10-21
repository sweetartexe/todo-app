import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/state/store';
import { colors, fonts } from '@/theme';

export default function AppTabs() {
  const { ready, user } = useStore();
  const insets = useSafeAreaInsets();
  if (!ready) return null;
  if (!user) return <Redirect href="/sign-in" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coralDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: '#FFFDF9',
          borderTopColor: colors.line,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12 },
      }}
    >
      <Tabs.Screen name="lists" options={{ title: 'Lists', tabBarIcon: () => <Text>✎</Text> }} />
      <Tabs.Screen name="pet" options={{ title: 'Pet', tabBarIcon: () => <Text>●</Text> }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: () => <Text>✿</Text> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: () => <Text>⚙</Text> }} />
    </Tabs>
  );
}

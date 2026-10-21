import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useStore } from '@/state/store';
import { colors } from '@/theme';

export default function Index() {
  const { ready, user } = useStore();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }
  return <Redirect href={user ? '/lists' : '/sign-in'} />;
}

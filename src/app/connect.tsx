import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { KeyManager } from '@/components/KeyManager';
import { Muted, Screen, Title } from '@/components/ui';
import { useStore } from '@/state/store';
import { colors, fonts } from '@/theme';

export default function ConnectScreen() {
  const store = useStore();
  const base = store.apiUrl;
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.back} onPress={() => router.back()}>
          Back
        </Text>
        <Title small>Connect an assistant</Title>
        <Muted>
          Pebble can talk to the AI assistants you already use, such as ChatGPT or Claude. You give them a key, like a spare house key. They can read your lists and add or finish tasks. You can take the key back whenever you want.
        </Muted>
        <View style={styles.step}>
          <Text style={styles.stepTitle}>1. Create a key</Text>
          <Muted>Name it after the assistant, so you remember which one to revoke later.</Muted>
          <KeyManager />
        </View>
        <View style={styles.step}>
          <Text style={styles.stepTitle}>2. Give the assistant these addresses</Text>
          <Muted>The assistant has to be able to reach the server. A server running only on your computer is invisible to ChatGPT. Put Pebble on the internet first if you want a website assistant to use it. From your own computer, you can test with the curl example.</Muted>
          <Text style={styles.url}>REST  {base}/v1</Text>
          <Text style={styles.url}>MCP   {base}/mcp</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepTitle}>3. Claude</Text>
          <Muted>
            In Claude, add a custom connector or MCP server. Choose the HTTP kind. Paste the MCP address. Add a header named Authorization with the value Bearer and your key.
          </Muted>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepTitle}>4. ChatGPT and other bots</Text>
          <Muted>
            If your assistant can add an MCP server, use the same MCP address and Authorization header. If it can only call a web address, use the REST address. Send the header Authorization: Bearer and your key.
          </Muted>
          <Text style={styles.code}>{`curl -H "Authorization: Bearer pebble_your_key" ${base}/v1/lists`}</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepTitle}>What the assistant can do</Text>
          <Muted>list_lists — see your lists</Muted>
          <Muted>list_tasks — see the tasks on a list</Muted>
          <Muted>add_task — add a task</Muted>
          <Muted>complete_task — tick or untick a task</Muted>
          <Muted>delete_task — remove a task</Muted>
          <Muted>A key cannot spend coins, change your password, or make new keys.</Muted>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  back: { fontFamily: fonts.bold, color: colors.coralDark, fontSize: 16 },
  step: { backgroundColor: colors.white, borderRadius: 22, padding: 14, gap: 8 },
  stepTitle: { fontFamily: fonts.extra, fontSize: 18, color: colors.ink },
  url: { fontFamily: fonts.bold, color: colors.ink, fontSize: 14 },
  code: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
});

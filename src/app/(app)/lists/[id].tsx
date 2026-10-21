import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Banner, Button, Cheer, Field, Muted, Screen, Sheet } from '@/components/ui';
import type { Task } from '@/domain/types';
import { useStore } from '@/state/store';
import { colors, fonts, listSwatches } from '@/theme';

export default function ListScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const listId = Array.isArray(params.id) ? params.id[0] : params.id;
  const store = useStore();
  const list = store.lists.find((item) => item.id === listId);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const swatch = listSwatches[list?.color || 'coral'] ?? listSwatches.coral;

  useEffect(() => {
    if (listId) store.openList(listId).catch(() => undefined);
    // Reload when this list is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  const open = store.tasks.filter((task) => !task.done);
  const done = store.tasks.filter((task) => task.done);

  async function toggle(task: Task) {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics are absent on the web.
    }
    await store.toggleTask(task).catch(() => undefined);
  }

  return (
    <Screen
      footer={
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a task"
              placeholderTextColor={colors.muted}
              style={styles.composerInput}
              onSubmitEditing={() => {
                if (!draft.trim() || !listId) return;
                const value = draft;
                setDraft('');
                store.addTask(listId, value, '').catch(() => setDraft(value));
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add task"
              style={styles.add}
              onPress={() => {
                if (!draft.trim() || !listId) return;
                const value = draft;
                setDraft('');
                store.addTask(listId, value, '').catch(() => setDraft(value));
              }}
            >
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      }
    >
      <Cheer text={store.cheer} />
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Pressable onPress={() => setSharing(true)}>
          <Text style={styles.share}>Share</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>{list?.title ?? 'List'}</Text>
        {store.error ? <Banner message={store.error} onClose={store.clearError} /> : null}
        {open.length === 0 && done.length === 0 ? <Muted>Nothing here yet. Add one small thing.</Muted> : null}
        {open.map((task) => (
          <TaskRow key={task.id} task={task} color={swatch.bar} onToggle={() => toggle(task)} onEdit={() => openEdit(task)} />
        ))}
        {done.length ? <Text style={styles.doneLabel}>Done</Text> : null}
        {done.map((task) => (
          <TaskRow key={task.id} task={task} color={swatch.bar} onToggle={() => toggle(task)} onEdit={() => openEdit(task)} />
        ))}
      </ScrollView>
      <Sheet
        visible={Boolean(editing)}
        title="Edit task"
        onClose={() => {
          setEditing(null);
          setConfirmDelete(false);
        }}
      >
        <Field label="Task" value={title} onChangeText={setTitle} />
        <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
        <Button
          label="Save"
          onPress={async () => {
            if (!editing) return;
            try {
              await store.editTask(editing.id, title, notes);
              setEditing(null);
            } catch {
              setEditing(null);
            }
          }}
        />
        <Button
          label={confirmDelete ? 'Really delete' : 'Delete task'}
          kind="ghost"
          onPress={async () => {
            if (!editing) return;
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            try {
              await store.deleteTask(editing.id);
              setEditing(null);
              setConfirmDelete(false);
            } catch {
              setEditing(null);
            }
          }}
        />
      </Sheet>
      <Sheet visible={sharing} title="Share this list" onClose={() => setSharing(false)}>
        <Muted>Anyone with this code can add tasks and tick them off.</Muted>
        <Text style={styles.code}>{list?.inviteCode}</Text>
        <Button
          label={copied ? 'Copied' : 'Copy code'}
          onPress={async () => {
            if (!list) return;
            await Clipboard.setStringAsync(list.inviteCode);
            setCopied(true);
          }}
        />
        <Text style={styles.people}>People on this list</Text>
        {store.members.map((member) => (
          <Text key={member.userId} style={styles.member}>
            {member.displayName}
            {member.role === 'owner' ? ' · made the list' : ''}
          </Text>
        ))}
        {list?.role === 'owner' ? (
          <Button
            label="Delete this list"
            kind="ghost"
            onPress={async () => {
              if (!listId) return;
              try {
                await store.deleteList(listId);
                setSharing(false);
                router.back();
              } catch {
                setSharing(false);
              }
            }}
          />
        ) : null}
      </Sheet>
    </Screen>
  );

  function openEdit(task: Task) {
    setEditing(task);
    setTitle(task.title);
    setNotes(task.notes);
    setConfirmDelete(false);
  }
}

function TaskRow({
  task,
  color,
  onToggle,
  onEdit,
}: {
  task: Task;
  color: string;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <View style={[styles.row, task.done && styles.rowDone]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.done }}
        accessibilityLabel={`Mark ${task.title} ${task.done ? 'not done' : 'done'}`}
        onPress={onToggle}
        style={[styles.check, task.done && { backgroundColor: color, borderColor: color }]}
      >
        {task.done ? <Text style={styles.checkMark}>✓</Text> : null}
      </Pressable>
      <Pressable style={styles.rowText} onPress={onEdit}>
        <Text style={[styles.taskTitle, task.done && styles.taskDone]}>{task.title}</Text>
        {task.notes ? <Text style={styles.notes}>{task.notes}</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  back: { fontFamily: fonts.bold, color: colors.coralDark, fontSize: 16 },
  share: { fontFamily: fonts.bold, color: colors.ink, fontSize: 16 },
  content: { padding: 20, gap: 10, paddingBottom: 24 },
  heading: { fontFamily: fonts.extra, fontSize: 32, color: colors.ink, marginBottom: 6 },
  doneLabel: { fontFamily: fonts.bold, color: colors.muted, marginTop: 8 },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 12,
  },
  rowDone: { backgroundColor: '#FFF9F3' },
  check: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: colors.white, fontFamily: fonts.extra, fontSize: 16 },
  rowText: { flex: 1, gap: 2 },
  taskTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  taskDone: { color: colors.muted, textDecorationLine: 'line-through' },
  notes: { fontFamily: fonts.regular, color: colors.muted, fontSize: 14 },
  composer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    paddingBottom: 14,
    backgroundColor: colors.bg,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  add: {
    backgroundColor: colors.coral,
    borderRadius: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addText: { color: colors.white, fontFamily: fonts.extra, fontSize: 16 },
  code: {
    fontFamily: fonts.extra,
    fontSize: 36,
    letterSpacing: 4,
    color: colors.ink,
    textAlign: 'center',
  },
  people: { fontFamily: fonts.extra, fontSize: 16, color: colors.ink, marginTop: 6 },
  member: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
});

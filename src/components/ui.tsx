import { type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LIST_COLORS } from '@/domain/catalog';
import { colors, fonts, listSwatches } from '@/theme';

export function Screen({
  children,
  footer,
  style,
}: {
  children: ReactNode;
  footer?: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={[styles.flex, style]}>{children}</View>
      {footer}
    </SafeAreaView>
  );
}

export function Title({ children, small }: { children: ReactNode; small?: boolean }) {
  return <Text style={[styles.title, small && styles.titleSmall]}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'quiet';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        kind === 'primary' && styles.primary,
        kind === 'ghost' && styles.ghost,
        kind === 'quiet' && styles.quiet,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, kind !== 'primary' && styles.buttonTextInk]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}

export function Banner({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <Pressable onPress={onClose} style={styles.banner}>
      <Text style={styles.bannerText}>{message}</Text>
    </Pressable>
  );
}

export function CoinPill({ coins }: { coins: number }) {
  return (
    <View style={styles.pill}>
      <View style={styles.coin} />
      <Text style={styles.pillText}>{coins}</Text>
    </View>
  );
}

export function ColorDots({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <View style={styles.dots}>
      {LIST_COLORS.map((color) => (
        <Pressable
          key={color}
          accessibilityRole="button"
          accessibilityLabel={color}
          onPress={() => onChange(color)}
          style={[
            styles.dot,
            { backgroundColor: listSwatches[color].bar },
            value === color && styles.dotOn,
          ]}
        />
      ))}
    </View>
  );
}

export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { height } = useWindowDimensions();
  const bodyMax = Math.max(240, Math.round(height * 0.62));
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: bodyMax }} contentContainerStyle={styles.sheetBody} bounces={false}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Cheer({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <View pointerEvents="none" style={styles.cheer}>
      <Text style={styles.cheerText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  title: { fontFamily: fonts.extra, fontSize: 34, color: colors.ink, letterSpacing: -0.6 },
  titleSmall: { fontSize: 28 },
  muted: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.muted },
  button: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primary: { backgroundColor: colors.coral },
  ghost: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.line },
  quiet: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  buttonText: { fontFamily: fonts.bold, fontSize: 17, color: colors.white },
  buttonTextInk: { color: colors.ink },
  field: { gap: 6 },
  label: { fontFamily: fonts.bold, color: colors.ink, fontSize: 14 },
  input: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  banner: {
    backgroundColor: '#FFE1D6',
    borderRadius: 16,
    padding: 12,
  },
  bannerText: { fontFamily: fonts.semibold, color: colors.coralDark, fontSize: 14, lineHeight: 20 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1C9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  coin: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.sun },
  pillText: { fontFamily: fonts.extra, color: colors.ink, fontSize: 15 },
  dots: { flexDirection: 'row', gap: 10 },
  dot: { width: 28, height: 28, borderRadius: 14 },
  dotOn: { borderWidth: 3, borderColor: colors.ink },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(58, 39, 24, 0.35)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 28,
    gap: 12,
    width: '100%',
    maxWidth: 430,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  sheetBody: { gap: 12, paddingBottom: 8 },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line,
    marginBottom: 4,
  },
  sheetTitle: { fontFamily: fonts.extra, fontSize: 24, color: colors.ink },
  cheer: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    zIndex: 20,
  },
  cheerText: { color: colors.white, fontFamily: fonts.extra, fontSize: 15 },
});

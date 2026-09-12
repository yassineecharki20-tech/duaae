import { memo } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { AppText } from './AppText';

import { a11yState } from '@/core/a11y/stateProps';

export interface ChipTrailingAction {
  icon: keyof typeof Ionicons.glyphMap;
  /** Required: icon-only controls must always be named. */
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
}

export interface ChipProps {
  label: string;
  /**
   * Inline remove/dismiss control (Material "input chip" pattern). It is a real
   * nested button rather than a hidden gesture, because a long-press cannot be
   * announced or triggered by every input method — and react-native-web drops
   * `accessibilityHint`, so the gesture alone would be undiscoverable on web.
   */
  trailingAction?: ChipTrailingAction;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** Secondary gesture — used by the search history for "remove this term". */
  onLongPress?: () => void;
  selected?: boolean;
  tone?: 'neutral' | 'primary' | 'accent' | 'gold';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export const Chip = memo(function Chip({
  label,
  icon,
  trailingAction,
  onPress,
  onLongPress,
  selected = false,
  tone = 'neutral',
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ChipProps) {
  const theme = useAppTheme();

  const colors =
    tone === 'primary'
      ? { bg: theme.colors.primaryContainer, fg: theme.colors.onPrimaryContainer, border: theme.colors.primaryContainer }
      : tone === 'accent' || tone === 'gold'
        ? { bg: theme.colors.accentContainer, fg: theme.colors.onAccentContainer, border: theme.colors.accentContainer }
        : { bg: theme.colors.surfaceMuted, fg: theme.colors.textMuted, border: theme.colors.border };

  const active = selected ? { bg: theme.colors.primary, fg: theme.colors.onPrimary, border: theme.colors.primary } : colors;

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
      {icon ? <Ionicons name={icon} size={14} color={active.fg} /> : null}
      <AppText weight="medium" style={{ color: active.fg, fontSize: 13 }}>
        {label}
      </AppText>
      {trailingAction ? (
        <Pressable
          onPress={trailingAction.onPress}
          accessibilityRole="button"
          accessibilityLabel={trailingAction.accessibilityLabel}
          // 20pt glyph + 12pt hit slop = a 44pt effective target.
          hitSlop={12}
          testID={trailingAction.testID}
          style={({ pressed }) => ({
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: theme.radii.pill,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name={trailingAction.icon} size={14} color={active.fg} />
        </Pressable>
      ) : null}
    </View>
  );

  const containerStyle: StyleProp<ViewStyle> = [
    {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: trailingAction ? theme.spacing.sm : theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radii.pill,
      backgroundColor: active.bg,
      borderWidth: 1,
      borderColor: active.border,
      minHeight: 32,
    },
    style,
  ];

  // A chip is interactive when it has *any* gesture, so a long-press-only chip
  // (search history removal) still renders as a button.
  if (!onPress && !onLongPress) {
    return (
      <View
        style={containerStyle}
        testID={testID}
        accessible
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      {...a11yState({ selected })}
      hitSlop={4}
      testID={testID}
      style={({ pressed }) => [containerStyle, pressed ? { opacity: 0.8 } : null]}
    >
      {content}
    </Pressable>
  );
});

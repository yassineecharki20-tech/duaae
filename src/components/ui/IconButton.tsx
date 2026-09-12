import { memo } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/design/theme/ThemeProvider';

import { a11yState } from '@/core/a11y/stateProps';

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  size?: number;
  iconSize?: number;
  tone?: 'default' | 'primary' | 'accent' | 'danger' | 'onPrimary';
  filled?: boolean;
  disabled?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Icon-only action with a guaranteed 44pt target and a mandatory
 * accessibility label — icon buttons are the easiest place to lose
 * screen-reader users, so the prop is required by the type system.
 */
export const IconButton = memo(function IconButton({
  icon,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  size = 44,
  iconSize = 22,
  tone = 'default',
  filled = false,
  disabled = false,
  selected = false,
  style,
  testID,
}: IconButtonProps) {
  const theme = useAppTheme();

  const color =
    tone === 'primary'
      ? theme.colors.primary
      : tone === 'accent'
        ? theme.colors.accent
        : tone === 'danger'
          ? theme.colors.error
          : tone === 'onPrimary'
            ? theme.colors.onPrimary
            : theme.colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      {...a11yState({ disabled, selected })}
      hitSlop={4}
      testID={testID}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: theme.radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed
            ? theme.colors.pressed
            : filled
              ? theme.colors.surfaceMuted
              : selected
                ? theme.colors.selected
                : 'transparent',
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={disabled ? theme.colors.textSubtle : color} />
    </Pressable>
  );
});

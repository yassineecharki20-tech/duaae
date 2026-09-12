import { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { AppText } from './AppText';

import { a11yState } from '@/core/a11y/stateProps';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Trailing icon (visually leading in RTL). */
  iconEnd?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const SIZE_HEIGHT: Record<ButtonSize, number> = { sm: 38, md: 48, lg: 56 };
const SIZE_PADDING: Record<ButtonSize, number> = { sm: 14, md: 20, lg: 26 };
const SIZE_ICON: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

/**
 * Primary interactive surface.
 *
 * Touch targets never drop below 44pt (`sm` compensates with a wider hit slop),
 * pressed/disabled states come from the theme, and the label is exposed to
 * screen readers with an explicit hint when provided.
 */
export const Button = memo(function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconEnd,
  disabled = false,
  loading = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const theme = useAppTheme();
  const inactive = disabled || loading;

  const palette = useMemo(() => {
    const colors = theme.colors;
    switch (variant) {
      case 'secondary':
        return { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer, pressed: colors.selected };
      case 'ghost':
        return { bg: 'transparent', fg: colors.primary, pressed: colors.pressed };
      case 'outline':
        return { bg: 'transparent', fg: colors.primary, pressed: colors.selected, border: colors.borderStrong };
      case 'destructive':
        return { bg: colors.errorContainer, fg: colors.onErrorContainer, pressed: colors.error };
      case 'primary':
      default:
        return { bg: colors.primary, fg: colors.onPrimary, pressed: colors.primaryPressed };
    }
  }, [theme, variant]);

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      {...a11yState({ disabled: inactive, busy: loading })}
      hitSlop={size === 'sm' ? 6 : 2}
      testID={testID}
      style={({ pressed }) => [
        {
          minHeight: SIZE_HEIGHT[size],
          paddingHorizontal: SIZE_PADDING[size],
          borderRadius: theme.radii.pill,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          backgroundColor: inactive
            ? theme.colors.disabled
            : pressed
              ? palette.pressed
              : palette.bg,
          ...(palette.border && !inactive ? { borderWidth: 1, borderColor: palette.border } : null),
          ...(fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }),
          ...(theme.reduceMotion ? null : { transitionProperty: 'background-color', transitionDuration: `${theme.motion.duration.fast}ms` }),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={inactive ? theme.colors.onDisabled : palette.fg} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={SIZE_ICON[size]}
              color={inactive ? theme.colors.onDisabled : palette.fg}
            />
          ) : null}
          <AppText
            weight={variant === 'primary' ? 'semiBold' : 'medium'}
            style={{
              color: inactive ? theme.colors.onDisabled : palette.fg,
              fontSize: size === 'sm' ? 14 : size === 'lg' ? 17 : 15,
            }}
          >
            {label}
          </AppText>
          {iconEnd ? (
            <Ionicons
              name={iconEnd}
              size={SIZE_ICON[size]}
              color={inactive ? theme.colors.onDisabled : palette.fg}
            />
          ) : null}
        </>
      )}
      {Platform.OS === 'web' ? null : <View />}
    </Pressable>
  );
});

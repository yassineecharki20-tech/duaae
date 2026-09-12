import { memo, type PropsWithChildren } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/design/theme/ThemeProvider';

export interface CardProps extends PropsWithChildren {
  onPress?: () => void;
  onLongPress?: () => void;
  variant?: 'surface' | 'muted' | 'outline' | 'primary';
  padding?: number;
  radius?: number;
  elevation?: 'none' | 'sm' | 'md';
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'none';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Surface primitive. `primary` is reserved for the daily-dua hero card so the
 * one emerald surface on the home screen keeps its meaning.
 */
export const Card = memo(function Card({
  onPress,
  onLongPress,
  variant = 'surface',
  padding,
  radius,
  elevation = 'sm',
  accessibilityLabel,
  accessibilityRole,
  style,
  children,
  testID,
}: CardProps) {
  const theme = useAppTheme();

  const base: ViewStyle = {
    borderRadius: radius ?? theme.radii.lg,
    padding: padding ?? theme.spacing.lg,
    backgroundColor:
      variant === 'muted'
        ? theme.colors.surfaceMuted
        : variant === 'primary'
          ? theme.colors.primary
          : theme.colors.surface,
    ...(variant === 'outline'
      ? { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }
      : null),
    ...(elevation !== 'none' ? (theme.shadows[elevation] as ViewStyle) : null),
    ...(variant === 'outline' || variant === 'muted' ? { shadowOpacity: 0, elevation: 0 } : null),
  };

  if (!onPress) {
    return (
      <View style={[base, style]} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => [
        base,
        pressed && !theme.reduceMotion ? { opacity: 0.86, transform: [{ scale: 0.995 }] } : null,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
});

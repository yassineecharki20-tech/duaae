import { memo, useEffect, useRef } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { useIsRTL } from '@/hooks/useIsRTL';

export interface ProgressBarProps {
  /** 0..1 */
  value: number;
  tone?: 'primary' | 'accent';
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const ProgressBar = memo(function ProgressBar({
  value,
  tone = 'primary',
  height = 6,
  style,
  accessibilityLabel,
}: ProgressBarProps) {
  const theme = useAppTheme();
  const rtl = useIsRTL();
  const clamped = Math.max(0, Math.min(1, value));
  const scaleX = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    if (theme.reduceMotion) {
      scaleX.setValue(clamped);
      return;
    }
    Animated.timing(scaleX, {
      toValue: clamped,
      duration: theme.motion.duration.base,
      useNativeDriver: true,
    }).start();
  }, [clamped, scaleX, theme]);

  return (
    <View
      style={[
        {
          height,
          borderRadius: theme.radii.pill,
          backgroundColor: theme.colors.surfaceSunken,
          overflow: 'hidden',
        },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={{
          height: '100%',
          width: '100%',
          borderRadius: theme.radii.pill,
          backgroundColor: tone === 'accent' ? theme.colors.accent : theme.colors.primary,
          transform: [{ scaleX }, { perspective: 1 }, { rotateY: rtl ? '180deg' : '0deg' }],
        }}
      />
    </View>
  );
});

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Shimmer-free skeleton: a calm pulse suits the product better than motion. */
export const Skeleton = memo(function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const theme = useAppTheme();
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (theme.reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, theme.reduceMotion]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radii.sm,
          backgroundColor: theme.colors.skeleton,
          opacity: pulse,
        },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
});

export const Divider = memo(function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return (
    <View
      style={[{ height: 1, backgroundColor: theme.colors.divider, alignSelf: 'stretch' }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
});

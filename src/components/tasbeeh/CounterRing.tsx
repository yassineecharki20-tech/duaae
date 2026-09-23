import { useEffect, useState } from 'react';
import { Pressable, View , Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { useReducedMotion } from '@/hooks/useReducedMotion';

import { a11yState } from '@/core/a11y/stateProps';
import { useI18n } from '@/core/i18n/I18nProvider';

export interface CounterRingProps {
  value: number;
  target: number;
  dhikrLabel: string;
  note?: string;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The tasbeeh dial.
 *
 * A minimal ring: emerald track, gold progress, the count in Amiri. The whole
 * dial is the tap target (44px minimum is exceeded by an order of magnitude),
 * it is announced as a button with its current value, and the progress arc
 * animates only when the user hasn't asked for reduced motion.
 */
export function CounterRing({
  value,
  target,
  dhikrLabel,
  note,
  onPress,
  size = 280,
  disabled,
}: CounterRingProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const [animatedProgress] = useState(
    () => new Animated.Value(target > 0 ? Math.min(value / target, 1) : 0),
  );

  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = target > 0 ? Math.min(Math.max(value / target, 0), 1) : 0;

  useEffect(() => {
    if (reducedMotion) {
      animatedProgress.setValue(clamped);
      return;
    }
    Animated.timing(animatedProgress, {
      toValue: clamped,
      duration: theme.motion.duration.fast,
      useNativeDriver: false,
    }).start();
  }, [animatedProgress, clamped, reducedMotion, theme.motion.duration.fast]);

  const dashOffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tasbeeh.a11y.counter', { value, target })}
        accessibilityHint={t('tasbeeh.a11y.counterHint')}
        {...a11yState({ disabled: Boolean(disabled) })}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: pressed ? [{ scale: 0.98 }] : undefined,
        })}
        testID="tasbeeh-dial"
      >
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.accent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View
          pointerEvents="none"
          style={{ position: 'absolute', alignItems: 'center', gap: 2 }}
        >
          <AppText
            variant="display"
            style={{
              fontFamily: theme.scripture('bold').fontFamily,
              fontSize: 58,
              lineHeight: 68,
            }}
            accessibilityElementsHidden
          >
            {value}
          </AppText>
          <AppText tone="subtle" style={{ fontSize: 12 }} accessibilityElementsHidden>
            {t('tasbeeh.ofTarget', { target })}
          </AppText>
        </View>
      </Pressable>

      <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
        <AppText variant="scriptureTitle">{dhikrLabel}</AppText>
        {note ? (
          <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 21, maxWidth: 300 }} numberOfLines={3}>
            {note}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

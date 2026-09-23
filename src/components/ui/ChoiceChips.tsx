import { memo } from 'react';
import { Pressable, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { a11yState } from '@/core/a11y/stateProps';
import { AppText } from './AppText';

export interface ChoiceChip<T extends string> {
  readonly value: T;
  readonly label: string;
  /** Colour swatch rendered before the label (palettes) or as the chip (accents). */
  readonly color?: string;
  /** Secondary line — font profiles and card styles use it. */
  readonly note?: string;
}

export interface ChoiceChipsProps<T extends string> {
  readonly items: readonly ChoiceChip<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly accessibilityLabel: string;
  /** `swatch` renders a colour disc only; `chip` renders a labelled pill. */
  readonly variant?: 'chip' | 'swatch';
  /** Approximate chips per row (percent-width, wraps naturally). */
  readonly columns?: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

/**
 * Accessible single-select chip group.
 *
 * Used for the personalization choices that a segmented control cannot carry —
 * eight palettes, eight accents, five card styles — because they need a colour
 * swatch and, at these counts, wrapping rows.
 *
 * Semantics mirror `Segmented`: a `radiogroup` containing `radio` children, with
 * `a11yState` supplying the ARIA attributes react-native-web does not derive.
 * Every chip clears the 44pt minimum touch target.
 */
function ChoiceChipsInner<T extends string>({
  items,
  value,
  onChange,
  accessibilityLabel,
  variant = 'chip',
  columns = 4,
  style,
  testID,
}: ChoiceChipsProps<T>) {
  const theme = useAppTheme();
  const isSwatch = variant === 'swatch';
  const basis = `${Math.max(12, Math.floor(100 / columns) - 2)}%` as DimensionValue;

  return (
    <View
      style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }, style]}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {items.map((item) => {
        const selected = item.value === value;

        if (isSwatch) {
          return (
            <Pressable
              key={item.value}
              onPress={() => onChange(item.value)}
              accessibilityRole="radio"
              {...a11yState({ selected })}
              accessibilityLabel={item.label}
              testID={testID ? `${testID}-${item.value}` : undefined}
              style={{
                width: 46,
                height: 46,
                borderRadius: theme.radii.pill,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: selected ? 2.5 : 1,
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                backgroundColor: theme.colors.surface,
              }}
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: theme.radii.pill,
                  backgroundColor: item.color ?? theme.colors.accent,
                }}
              />
            </Pressable>
          );
        }

        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            accessibilityRole="radio"
            {...a11yState({ selected })}
            accessibilityLabel={item.note ? `${item.label}. ${item.note}` : item.label}
            testID={testID ? `${testID}-${item.value}` : undefined}
            style={{
              flexBasis: basis,
              flexGrow: 1,
              minWidth: 96,
              minHeight: theme.layout.minTouchTarget,
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm + 2,
              borderRadius: theme.card.radius,
              borderWidth: selected ? 1.5 : 1,
              borderColor: selected ? theme.colors.primary : theme.colors.border,
              backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface,
            }}
          >
            {item.color ? (
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: theme.radii.pill,
                  backgroundColor: item.color,
                  borderWidth: 1,
                  borderColor: theme.colors.borderSubtle,
                }}
              />
            ) : null}
            <View style={{ flex: 1, gap: 2 }}>
              <AppText
                weight={selected ? 'semiBold' : 'medium'}
                style={{
                  fontSize: 13,
                  color: selected ? theme.colors.onPrimaryContainer : theme.colors.text,
                }}
                numberOfLines={1}
              >
                {item.label}
              </AppText>
              {item.note ? (
                <AppText tone="subtle" style={{ fontSize: 11 }} numberOfLines={2}>
                  {item.note}
                </AppText>
              ) : null}
            </View>
            {selected ? (
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export const ChoiceChips = memo(ChoiceChipsInner) as typeof ChoiceChipsInner;

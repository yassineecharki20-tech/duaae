import { memo } from 'react';
import { Pressable, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { AppText } from './AppText';

import { a11yState } from '@/core/a11y/stateProps';
import { useI18n } from '@/core/i18n/I18nProvider';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Equal-width segmented control with full keyboard/AT semantics. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
  testID,
}: SegmentedProps<T>) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radii.md,
          padding: 4,
          gap: 4,
        },
        style,
      ]}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            {...a11yState({ selected })}
            accessibilityLabel={option.label}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.xs,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radii.sm,
              backgroundColor: selected ? theme.colors.surface : 'transparent',
              minHeight: 38,
              ...(selected ? (theme.shadows.xs as object) : null),
            }}
          >
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={15}
                color={selected ? theme.colors.primary : theme.colors.textMuted}
              />
            ) : null}
            <AppText
              weight={selected ? 'semiBold' : 'medium'}
              style={{
                fontSize: 13,
                color: selected ? theme.colors.primary : theme.colors.textMuted,
              }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface TextFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onClear?: () => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
  returnKeyType?: 'search' | 'done' | 'next';
  maxLength?: number;
  multiline?: boolean;
  error?: string | null;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
}

/** Themed text field with RTL caret behaviour and an accessible clear button. */
export const TextField = memo(function TextField({
  value,
  onChangeText,
  placeholder,
  label,
  icon,
  onClear,
  onSubmit,
  autoFocus = false,
  returnKeyType = 'done',
  maxLength,
  multiline = false,
  error,
  accessibilityLabel,
  style,
  inputStyle,
  testID,
}: TextFieldProps) {
  const theme = useAppTheme();
  const { t } = useI18n();

  return (
    <View style={[{ gap: theme.spacing.xs }, style]}>
      {label ? (
        <AppText weight="medium" tone="muted" style={{ fontSize: 13 }}>
          {label}
        </AppText>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: error ? theme.colors.error : theme.colors.border,
          borderRadius: theme.radii.md,
          paddingHorizontal: theme.spacing.md,
          minHeight: multiline ? 96 : 48,
          paddingVertical: multiline ? theme.spacing.md : 0,
        }}
      >
        {icon ? <Ionicons name={icon} size={18} color={theme.colors.textSubtle} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSubtle}
          autoFocus={autoFocus}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmit}
          maxLength={maxLength}
          multiline={multiline}
          accessibilityLabel={accessibilityLabel}
          style={[
            {
              flex: 1,
              color: theme.colors.text,
              fontSize: 15,
              fontFamily: theme.fontFamilies.ui.regular,
              paddingVertical: multiline ? 0 : 12,
              textAlign: 'right',
              writingDirection: 'rtl',
              outlineStyle: 'none' as never,
            },
            inputStyle,
          ]}
        />
        {onClear && value.length > 0 ? (
          <Pressable
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel={t('common.clearField')}
            hitSlop={6}
            style={{ padding: theme.spacing.xs }}
          >
            <Ionicons name="close-circle" size={18} color={theme.colors.textSubtle} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText tone="error" style={{ fontSize: 12 }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

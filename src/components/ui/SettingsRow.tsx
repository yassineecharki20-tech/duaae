import { memo, type ReactNode } from 'react';
import { Pressable, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { AppText } from './AppText';

import { a11yState } from '@/core/a11y/stateProps';
import { useI18n } from '@/core/i18n/I18nProvider';

export interface SettingsRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  value?: string;
  /** Toggle mode: renders an accessible switch instead of a chevron. */
  switchValue?: boolean;
  onSwitchChange?: (next: boolean) => void;
  /** Disabled rows stay visible with an honest explanation in `subtitle`. */
  disabled?: boolean;
  danger?: boolean;
  rightAccessory?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * One row of the settings/profile lists.
 *
 * Toggles are real switches (value + handler required together), rows are real
 * pressables, and `disabled` is for rows that exist but have no backend yet —
 * the subtitle must explain why, never silently.
 */
export const SettingsRow = memo(function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  value,
  switchValue,
  onSwitchChange,
  disabled = false,
  danger = false,
  rightAccessory,
  style,
  testID,
}: SettingsRowProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const isToggle = switchValue !== undefined && Boolean(onSwitchChange);

  const rowStyle: StyleProp<ViewStyle> = [
    {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      minHeight: theme.layout.minTouchTarget + 8,
    },
    disabled && { opacity: 0.55 },
    style,
  ];

  const leading = icon ? (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: theme.radii.sm,
        backgroundColor: danger ? theme.colors.errorContainer : theme.colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={18} color={danger ? theme.colors.error : theme.colors.primary} />
    </View>
  ) : null;

  const body = (
    <>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText weight="medium" tone={danger ? 'error' : 'default'}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 19 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText tone="subtle" style={{ fontSize: 13 }} weight="medium">
          {value}
        </AppText>
      ) : null}
      {rightAccessory}
      {isToggle ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          disabled={disabled}
          trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
          thumbColor={theme.colors.surface}
          accessibilityLabel={title}
          accessibilityRole="switch"
          {...a11yState({ checked: switchValue, disabled })}
        />
      ) : onPress && !disabled ? (
        <Ionicons name="chevron-back" size={18} color={theme.colors.textSubtle} />
      ) : null}
    </>
  );

  if (isToggle) {
    return (
      <View style={rowStyle} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle].filter(Boolean).join(t('common.a11ySeparator'))}
      {...a11yState({ disabled })}
      testID={testID}
      style={({ pressed }) => [rowStyle, pressed && !disabled ? { opacity: 0.6 } : null]}
    >
      {body}
    </Pressable>
  );
});

export interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: string;
}

/** Card wrapper that groups rows, with optional header and footnote. */
export function SettingsSection({ title, description, children, footer }: SettingsSectionProps) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
      {title ? (
        <View style={{ paddingHorizontal: theme.spacing.xs, gap: 2 }}>
          <AppText weight="semiBold" tone="muted" style={{ fontSize: 13, letterSpacing: 0.4 }}>
            {title}
          </AppText>
          {description ? (
            <AppText tone="subtle" style={{ fontSize: 12 }}>
              {description}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.xs,
          ...(theme.shadows.xs as object),
        }}
      >
        {children}
      </View>
      {footer ? (
        <AppText tone="subtle" style={{ fontSize: 12, paddingHorizontal: theme.spacing.xs }}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

/** Small honest badge: "تحتاج ربط الخادم" / "قريبًا". */
export const FutureTag = memo(function FutureTag({ label }: { label?: string }) {
  const theme = useAppTheme();
  const { t } = useI18n();
  // Default params cannot call hooks, so the fallback resolves in the body.
  const text = label ?? t('common.nextStage');
  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 3,
        borderRadius: theme.radii.xs,
        backgroundColor: theme.colors.accentContainer,
      }}
      accessibilityLabel={t('common.featureDisabledHint', { label: text })}
    >
      <AppText style={{ fontSize: 10.5, color: theme.colors.onAccentContainer }} weight="semiBold">
        {text}
      </AppText>
    </View>
  );
});

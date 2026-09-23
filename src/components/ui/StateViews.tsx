import { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppError } from '@/core/errors/AppError';
import { useConnectivityStore } from '@/store/connectivityStore';
import { useAppTheme } from '@/design/theme/ThemeProvider';

import { AppText } from './AppText';
import { Button } from './Button';
import { useI18n } from '@/core/i18n/I18nProvider';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Shared visual grammar for "nothing here yet". */
export const EmptyState = memo(function EmptyState({
  icon = 'leaf-outline',
  title,
  description,
  actionLabel,
  onAction,
  style,
  testID,
}: EmptyStateProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        {
          alignItems: 'center',
          gap: theme.spacing.md,
          paddingVertical: theme.spacing.hero,
          paddingHorizontal: theme.spacing.xxl,
        },
        style,
      ]}
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={[title, description].filter(Boolean).join('. ')}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: theme.radii.pill,
          backgroundColor: theme.colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={30} color={theme.colors.primary} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {description ? (
        <AppText tone="muted" align="center" style={{ maxWidth: 320 }}>
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" />
      ) : null}
    </View>
  );
});

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Error surface. Reads the `AppError` recovery hints so every recoverable
 * failure ships with a useful action, and non-recoverable ones explain why.
 */
export const ErrorState = memo(function ErrorState({ error, onRetry, title, style, testID }: ErrorStateProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const appError = error instanceof AppError ? error : AppError.from(error);
  const canRetry = appError.recoverable && Boolean(onRetry);

  const recoveryLabel =
    appError.recoveryAction === 'go-online'
      ? t('common.checkConnection')
      : appError.recoveryAction === 'open-settings'
        ? t('common.openSettings')
        : t('common.retry');

  return (
    <View
      style={[
        {
          alignItems: 'center',
          gap: theme.spacing.md,
          paddingVertical: theme.spacing.hero,
          paddingHorizontal: theme.spacing.xxl,
        },
        style,
      ]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={[title ?? t('error.genericTitle'), appError.userMessage].join(t('common.a11ySeparator'))}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: theme.radii.pill,
          backgroundColor: theme.colors.errorContainer,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="cloud-offline-outline" size={30} color={theme.colors.error} />
      </View>
      <AppText variant="heading" align="center">
        {title ?? t('error.actionFailed')}
      </AppText>
      <AppText tone="muted" align="center" style={{ maxWidth: 320 }}>
        {appError.userMessage}
      </AppText>
      {canRetry ? (
        <Button label={recoveryLabel} onPress={onRetry} variant="secondary" size="sm" icon="refresh-outline" />
      ) : null}
    </View>
  );
});

export interface LoadingStateProps {
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export const LoadingState = memo(function LoadingState({ label, style }: LoadingStateProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const text = label ?? t('common.loading');
  return (
    <View
      style={[
        { alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.hero },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={text}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radii.pill,
          borderWidth: 2,
          borderColor: theme.colors.border,
          borderTopColor: theme.colors.primary,
        }}
      />
      <AppText tone="muted">{text}</AppText>
    </View>
  );
});

/**
 * Discreet offline banner. Only mounted by surfaces that would otherwise sync;
 * bundled content never needs it.
 */
export const OfflineBanner = memo(function OfflineBanner() {
  const theme = useAppTheme();
  const { t } = useI18n();
  const state = useConnectivityStore((s) => s.state);
  if (state !== 'offline') return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.warningContainer,
        borderRadius: theme.radii.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        marginBottom: theme.spacing.md,
      }}
      accessibilityRole="alert"
      accessibilityLabel={t('error.offline')}
    >
      <Ionicons name="wifi-outline" size={16} color={theme.colors.warning} />
      <AppText style={{ color: theme.colors.warning, fontSize: 13 }} weight="medium">
        {t('error.offlineBanner')}
      </AppText>
    </View>
  );
});

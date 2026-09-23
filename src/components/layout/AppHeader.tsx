import { memo, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { useI18n } from '@/core/i18n/I18nProvider';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Shows a back button. Defaults to true outside tab roots. */
  canGoBack?: boolean;
  onBack?: () => void;
  /** Trailing actions (visually leading side in RTL). */
  actions?: ReactNode;
  /** Hides the border; used over colored surfaces. */
  transparent?: boolean;
  centerTitle?: boolean;
  testID?: string;
}

/**
 * Standard app bar. Height and safe-area come from the theme so every screen's
 * chrome is identical; the back affordance is a real navigation action.
 */
export const AppHeader = memo(function AppHeader({
  title,
  subtitle,
  canGoBack = true,
  onBack,
  actions,
  transparent = false,
  centerTitle = false,
  testID,
}: AppHeaderProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: Platform.OS === 'web' ? theme.spacing.md : Math.max(insets.top, theme.spacing.sm),
        paddingBottom: theme.spacing.sm,
        paddingHorizontal: theme.layout.screenGutter,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        backgroundColor: transparent ? 'transparent' : theme.colors.background,
        borderBottomWidth: transparent ? 0 : 1,
        borderBottomColor: theme.colors.borderSubtle,
        minHeight: theme.layout.headerHeight + (Platform.OS === 'web' ? 0 : insets.top),
      }}
      testID={testID}
    >
      {canGoBack ? (
        <IconButton
          icon="chevron-back"
          accessibilityLabel={t('common.back')}
          onPress={() => {
            if (onBack) onBack();
            else if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
        />
      ) : (
        <View style={{ width: 8 }} />
      )}

      <View style={{ flex: 1, gap: 1, alignItems: centerTitle ? 'center' : 'flex-start' }}>
        <AppText variant="heading" numberOfLines={1} accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText tone="muted" style={{ fontSize: 12 }} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {actions ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>{actions}</View> : <View style={{ width: 8 }} />}
    </View>
  );
});

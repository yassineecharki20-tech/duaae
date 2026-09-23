import { useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Controls';
import { SettingsSection } from '@/components/ui/SettingsRow';
import { useToast } from '@/components/ui/Toast';

import { useI18n } from '@/core/i18n/I18nProvider';
import { widgetContentOptions } from '@/core/i18n/options';
import { useSettingsStore } from '@/store/settingsStore';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';

const WIDGET_SIZE_OPTIONS = [
  { value: 'small', labelKey: 'settings.widget.size.small' },
  { value: 'medium', labelKey: 'settings.widget.size.medium' },
] as const;

/**
 * Widget.
 *
 * The native home-screen widget itself arrives with the next build stage (it
 * needs a widget extension / AppWidget provider, not just JavaScript). What is
 * here already works: the choice of content and size is persisted with the rest
 * of the preferences, so the widget reads a real, stored preference the moment
 * it exists. The screen says so plainly instead of showing a control that
 * pretends to change something on the home screen today.
 */
export default function WidgetSettingsScreen() {
  const theme = useAppTheme();
  const toast = useToast();
  const { t } = useI18n();

  const widgetContent = useSettingsStore((state) => state.preferences.widgetContent);
  const widgetSize = useSettingsStore((state) => state.preferences.widgetSize);
  const setWidgetContent = useSettingsStore((state) => state.setWidgetContent);
  const setWidgetSize = useSettingsStore((state) => state.setWidgetSize);

  const contentChoices = useMemo(() => widgetContentOptions(t), [t]);
  const sizeChoices = useMemo(
    () => WIDGET_SIZE_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) })),
    [t],
  );

  const track = (setting: string, value: string) => {
    void services
      .analytics()
      .track({ name: AnalyticsEvents.settingChanged, params: { setting, value } });
  };

  return (
    <Screen scroll testID="settings-widget">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title={t('settings.widget.screenTitle')} />
      </View>

      <View
        style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
      >
        <Card variant="outline" padding={theme.spacing.lg}>
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
              <AppText weight="semiBold" style={{ fontSize: 13.5 }}>
                {t('settings.widget.comingSoon')}
              </AppText>
            </View>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 21 }}>
              {t('settings.widget.comingSoonBody')}
            </AppText>
          </View>
        </Card>

        <SettingsSection
          title={t('settings.widget.content')}
          description={t('settings.widget.subtitle')}
        >
          <View style={{ padding: theme.spacing.lg }}>
            <Segmented
              options={contentChoices}
              value={widgetContent}
              onChange={(value) => {
                setWidgetContent(value);
                track('widget_content', value);
                toast.show(t('settings.widget.saved'), 'success');
              }}
              accessibilityLabel={t('settings.widget.contentA11y')}
              testID="widget-content"
            />
          </View>
        </SettingsSection>

        <SettingsSection title={t('settings.widget.size')}>
          <View style={{ padding: theme.spacing.lg }}>
            <Segmented
              options={sizeChoices}
              value={widgetSize}
              onChange={(value) => {
                setWidgetSize(value);
                track('widget_size', value);
                toast.show(t('settings.widget.saved'), 'success');
              }}
              accessibilityLabel={t('settings.widget.size')}
              testID="widget-size"
            />
          </View>
        </SettingsSection>
      </View>
    </Screen>
  );
}

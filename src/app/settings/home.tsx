import { useMemo } from 'react';
import { Switch, View } from 'react-native';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { SettingsRow, SettingsSection } from '@/components/ui/SettingsRow';
import { useToast } from '@/components/ui/Toast';

import { homeSectionOptions } from '@/core/i18n/options';
import type { HomeSectionId } from '@/core/types/domain';
import { selectHomeSections, useSettingsStore } from '@/store/settingsStore';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';
import { useI18n } from '@/core/i18n/I18nProvider';

/**
 * Home customization.
 *
 * Which sections appear on the home screen, and in what order. The list *is* the
 * persisted `preferences.homeSections` array and the home screen renders exactly
 * it, in that order — so every control here does something real. Hiding the last
 * visible section is refused with an explanation rather than leaving an empty
 * home screen.
 */
export default function HomeLayoutScreen() {
  const theme = useAppTheme();
  const toast = useToast();
  const { t } = useI18n();

  const sections = useSettingsStore(selectHomeSections);
  const toggleHomeSection = useSettingsStore((state) => state.toggleHomeSection);
  const moveHomeSection = useSettingsStore((state) => state.moveHomeSection);
  const resetHomeSections = useSettingsStore((state) => state.resetHomeSections);

  const labels = useMemo(() => {
    const map = {} as Record<HomeSectionId, string>;
    for (const option of homeSectionOptions(t)) {
      map[option.value] = option.label;
    }
    return map;
  }, [t]);

  const visible = sections.filter((section) => section.visible);
  const hidden = sections.filter((section) => !section.visible);

  const onToggle = (id: HomeSectionId, currentlyVisible: boolean) => {
    if (currentlyVisible && visible.length <= 1) {
      toast.show(t('settings.home.atLeastOne'), 'error');
      return;
    }
    toggleHomeSection(id);
    void services.analytics().track({
      name: AnalyticsEvents.settingChanged,
      params: { setting: `home_section_${id}`, value: !currentlyVisible },
    });
  };

  return (
    <Screen scroll testID="settings-home-layout">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title={t('settings.home.screenTitle')} />
      </View>

      <View
        style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
      >
        <AppText
          tone="muted"
          style={{ fontSize: 12.5, lineHeight: 20, paddingHorizontal: theme.spacing.xs }}
        >
          {t('settings.home.subtitle')}
        </AppText>

        <SettingsSection
          title={t('settings.home.visibleSection')}
          description={t('settings.home.orderHint')}
        >
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.card.radius,
              borderWidth: theme.card.borderWidth,
              borderColor: theme.card.borderColor,
              paddingHorizontal: theme.spacing.md,
            }}
          >
            {visible.map((section, index) => (
              <View
                key={section.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  paddingVertical: theme.spacing.sm,
                  minHeight: theme.layout.minTouchTarget + 8,
                  borderBottomWidth: index === visible.length - 1 ? 0 : 1,
                  borderBottomColor: theme.colors.divider,
                }}
              >
                <AppText tone="subtle" style={{ fontSize: 12, minWidth: 18 }}>
                  {index + 1}
                </AppText>
                <AppText weight="medium" style={{ flex: 1, fontSize: 14 }}>
                  {labels[section.id]}
                </AppText>
                <IconButton
                  icon="chevron-up-outline"
                  size={36}
                  iconSize={16}
                  disabled={index === 0}
                  accessibilityLabel={t('settings.home.moveUp', { section: labels[section.id] })}
                  onPress={() => moveHomeSection(section.id, -1)}
                  testID={`home-section-up-${section.id}`}
                />
                <IconButton
                  icon="chevron-down-outline"
                  size={36}
                  iconSize={16}
                  disabled={index === visible.length - 1}
                  accessibilityLabel={t('settings.home.moveDown', { section: labels[section.id] })}
                  onPress={() => moveHomeSection(section.id, 1)}
                  testID={`home-section-down-${section.id}`}
                />
                <Switch
                  value
                  onValueChange={() => onToggle(section.id, true)}
                  accessibilityRole="switch"
                  accessibilityLabel={t('settings.home.hide', { section: labels[section.id] })}
                  trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                  thumbColor={theme.colors.surface}
                  testID={`home-section-toggle-${section.id}`}
                />
              </View>
            ))}
          </View>
        </SettingsSection>

        <SettingsSection title={t('settings.home.hiddenSection')}>
          {hidden.length === 0 ? (
            <View style={{ padding: theme.spacing.lg }}>
              <AppText tone="subtle" style={{ fontSize: 12.5 }}>
                {t('common.itemsCount', { count: 0 })}
              </AppText>
            </View>
          ) : (
            hidden.map((section) => (
              <SettingsRow
                key={section.id}
                icon="eye-off-outline"
                title={labels[section.id]}
                subtitle={t('settings.home.show', { section: labels[section.id] })}
                switchValue={false}
                onSwitchChange={() => onToggle(section.id, false)}
                testID={`home-section-hidden-${section.id}`}
              />
            ))
          )}
        </SettingsSection>

        <Button
          variant="secondary"
          size="md"
          fullWidth
          label={t('settings.home.resetOrder')}
          accessibilityLabel={t('settings.home.resetOrder')}
          onPress={() => {
            resetHomeSections();
            toast.show(t('settings.home.resetDone'), 'success');
          }}
        />
      </View>
    </Screen>
  );
}

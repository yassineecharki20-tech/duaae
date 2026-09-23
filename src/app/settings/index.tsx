import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SettingsRow, SettingsSection } from '@/components/ui/SettingsRow';
import { useToast } from '@/components/ui/Toast';

import {
  accentOptions,
  appearanceOptions,
  fontProfileOptions,
  languageOptions,
  motionOptions,
  paletteOptions,
  textSizeOptions,
} from '@/core/i18n/options';
import { useSettingsStore } from '@/store/settingsStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useTasbeehStore } from '@/store/tasbeehStore';
import { useAzkarStore } from '@/store/azkarStore';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';
import { useI18n } from '@/core/i18n/I18nProvider';

/**
 * Settings — the hub.
 *
 * Every row leads to a real screen; the destructive action is a real local
 * reset with an explicit confirmation. Nothing here toggles a value that isn't
 * persisted, and every label comes from the translation catalog.
 */
export default function SettingsScreen() {
  const theme = useAppTheme();
  const toast = useToast();
  const { t } = useI18n();

  const preferences = useSettingsStore((state) => state.preferences);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const clearFavorites = useFavoritesStore((state) => state.clear);
  const resetTasbeeh = useTasbeehStore((state) => state.resetAll);
  const resetAzkar = useAzkarStore((state) => state.resetAll);

  const appearanceLabel = useMemo(
    () => appearanceOptions(t).find((option) => option.value === preferences.appearance)?.label ?? '',
    [preferences.appearance, t],
  );
  const sizeLabel = useMemo(
    () => textSizeOptions(t).find((option) => option.value === preferences.readingScale)?.label ?? '',
    [preferences.readingScale, t],
  );
  const motionLabel = useMemo(
    () => motionOptions(t).find((option) => option.value === preferences.motion)?.label ?? '',
    [preferences.motion, t],
  );
  const languageLabel = useMemo(
    () => languageOptions(t).find((option) => option.value === preferences.language)?.nativeLabel ?? '',
    [preferences.language, t],
  );
  const personalizationSummary = useMemo(() => {
    const palette =
      paletteOptions(t).find((option) => option.value === preferences.palette)?.label ?? '';
    const accent = accentOptions(t).find((option) => option.value === preferences.accent)?.label ?? '';
    const font =
      fontProfileOptions(t).find((option) => option.value === preferences.fontProfile)?.label ?? '';
    return t('settings.personalizationSummary', { palette, accent, font });
  }, [preferences.accent, preferences.fontProfile, preferences.palette, t]);

  const visibleSections = preferences.homeSections.filter((section) => section.visible).length;

  useEffect(() => {
    void services.analytics().screen('settings');
  }, []);

  const onReset = useCallback(async () => {
    setResetting(true);
    const [favorites, tasbeeh, azkar, profile] = await Promise.all([
      clearFavorites(),
      Promise.resolve(resetTasbeeh()),
      Promise.resolve(resetAzkar()),
      services.users().resetLocalData(),
    ]);
    setResetting(false);
    setConfirmReset(false);
    void services
      .analytics()
      .track({ name: AnalyticsEvents.settingChanged, params: { setting: 'reset_local_data', value: true } });

    if (!profile.ok) {
      toast.show(t('settings.resetPartial'), 'error');
      return;
    }
    void favorites;
    void tasbeeh;
    void azkar;
    toast.show(t('settings.resetDone'), 'success');
  }, [clearFavorites, resetAzkar, resetTasbeeh, t, toast]);

  return (
    <Screen scroll testID="settings-screen">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title={t('settings.screenTitle')} />
      </View>

      <View
        style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
      >
        <SettingsSection title={t('settings.section.personal')}>
          <SettingsRow
            icon="color-palette-outline"
            testID="settings-row-personalization"
            title={t('settings.personalization')}
            subtitle={personalizationSummary}
            onPress={() => router.push('/settings/personalization')}
          />
          <SettingsRow
            icon="grid-outline"
            testID="settings-row-home"
            title={t('settings.homeLayout')}
            subtitle={t('common.itemsCount', { count: visibleSections })}
            onPress={() => router.push('/settings/home')}
          />
          <SettingsRow
            icon="color-palette-outline"
            title={t('settings.appearance')}
            subtitle={t('settings.appearanceSummary', { theme: appearanceLabel, size: sizeLabel })}
            onPress={() => router.push('/settings/appearance')}
          />
          <SettingsRow
            icon="language-outline"
            title={t('settings.language')}
            subtitle={languageLabel}
            onPress={() => router.push('/settings/language')}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.section.app')}>
          <SettingsRow
            icon="notifications-outline"
            title={t('settings.reminders')}
            subtitle={t('settings.remindersNote')}
            onPress={() => router.push('/settings/notifications')}
          />
          <SettingsRow
            icon="square-outline"
            title={t('settings.widget.screenTitle')}
            subtitle={t('settings.widget.subtitle')}
            onPress={() => router.push('/settings/widget')}
          />
          <SettingsRow
            icon="pulse-outline"
            title={t('settings.motion')}
            subtitle={motionLabel}
            onPress={() => router.push('/settings/appearance')}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.account')}>
          <SettingsRow
            icon="person-circle-outline"
            title={t('settings.account.screenTitle')}
            subtitle={t('settings.accountRowNote')}
            onPress={() => router.push('/settings/account')}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.about')}>
          <SettingsRow
            icon="information-circle-outline"
            title={t('settings.aboutNote')}
            subtitle={t('settings.aboutSummary')}
            onPress={() => router.push('/settings/about')}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            title={t('settings.privacy')}
            onPress={() => router.push('/settings/privacy')}
          />
          <SettingsRow
            icon="document-text-outline"
            title={t('settings.terms')}
            onPress={() => router.push('/settings/terms')}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.section.data')}>
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }}>
              {t('settings.dataNote')}
            </AppText>
            <Button
              variant="destructive"
              size="md"
              accessibilityLabel={t('settings.resetData')}
              onPress={() => setConfirmReset(true)}
              label={t('settings.resetData')}
            />
          </View>
        </SettingsSection>
      </View>

      <BottomSheet
        visible={confirmReset}
        onDismiss={() => setConfirmReset(false)}
        title={t('settings.resetDataTitle')}
        subtitle={t('settings.resetDataBody')}
        scrollable={false}
      >
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          <AppText tone="muted" style={{ fontSize: 13, lineHeight: 21 }}>
            {t('settings.resetDataContentNote')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="ghost"
                fullWidth
                label={t('common.cancel')}
                accessibilityLabel={t('common.cancel')}
                onPress={() => setConfirmReset(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="destructive"
                fullWidth
                loading={resetting}
                label={t('settings.resetConfirm')}
                accessibilityLabel={t('settings.resetConfirmA11y')}
                onPress={() => void onReset()}
              />
            </View>
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}

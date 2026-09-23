import { useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SettingsRow, SettingsSection } from '@/components/ui/SettingsRow';
import { useToast } from '@/components/ui/Toast';

import { languageOptions } from '@/core/i18n/options';
import type { MessageKey } from '@/core/i18n/messages/ar';
import type { AppLanguage } from '@/core/types/domain';
import { selectLanguage, selectRestartNeeded, useSettingsStore } from '@/store/settingsStore';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';
import { useI18n } from '@/core/i18n/I18nProvider';

/** Native names are always shown in their own language, whatever is selected. */
const NATIVE_NAME_KEY = {
  ar: 'settings.language.native.ar',
  fr: 'settings.language.native.fr',
  en: 'settings.language.native.en',
} as const satisfies Record<AppLanguage, MessageKey>;

const LANGUAGE_ICON = {
  ar: 'language',
  fr: 'language-outline',
  en: 'language-outline',
} as const satisfies Record<AppLanguage, 'language' | 'language-outline'>;

/**
 * Language.
 *
 * Arabic, French and English are all real, selectable languages: choosing one
 * writes the preference, pushes it into the i18n runtime and re-renders the
 * whole tree immediately (on the web the writing direction flips in the same
 * frame; on native the mirrored layout completes after a relaunch, which the
 * note below states instead of hiding it).
 *
 * Religious text stays Arabic in every language — that is a content policy, not
 * a missing translation, and the screen says so explicitly.
 */
export default function LanguageSettingsScreen() {
  const theme = useAppTheme();
  const toast = useToast();
  const { t, direction } = useI18n();

  const language = useSettingsStore(selectLanguage);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const restartNeeded = useSettingsStore(selectRestartNeeded);
  const acknowledgeRestart = useSettingsStore((state) => state.acknowledgeRestart);

  const options = useMemo(() => languageOptions(t), [t]);

  const choose = (next: AppLanguage) => {
    if (next === language) return;
    setLanguage(next);
    void services
      .analytics()
      .track({ name: AnalyticsEvents.settingChanged, params: { setting: 'language', value: next } });
    toast.show(t('settings.language.changed', { language: t(NATIVE_NAME_KEY[next]) }), 'success');
  };

  return (
    <Screen scroll testID="settings-language">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title={t('settings.language.screenTitle')} />
      </View>

      <View
        style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
      >
        <SettingsSection title={t('settings.language.sectionTitle')}>
          {options.map((option) => {
            const active = option.value === language;
            return (
              <SettingsRow
                key={option.value}
                testID={`language-option-${option.value}`}
                icon={active ? 'checkmark-circle' : LANGUAGE_ICON[option.value]}
                title={option.nativeLabel}
                subtitle={`${option.label} — ${option.directionNote}`}
                value={active ? t('common.active') : undefined}
                onPress={() => choose(option.value)}
              />
            );
          })}
        </SettingsSection>

        {restartNeeded ? (
          <Card variant="outline" padding={theme.spacing.lg}>
            <View style={{ gap: theme.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
                <AppText weight="semiBold" style={{ fontSize: 13.5 }}>
                  {t('settings.language.restartTitle')}
                </AppText>
              </View>
              <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 21 }}>
                {t('settings.language.restartBody')}
              </AppText>
              <Button
                variant="secondary"
                size="sm"
                label={t('settings.language.restartAcknowledge')}
                accessibilityLabel={t('settings.language.restartAcknowledge')}
                onPress={acknowledgeRestart}
              />
            </View>
          </Card>
        ) : null}

        <Card variant="outline" padding={theme.spacing.lg}>
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Ionicons
                name={direction === 'rtl' ? 'arrow-back-outline' : 'arrow-forward-outline'}
                size={16}
                color={theme.colors.primary}
              />
              <AppText weight="semiBold" style={{ fontSize: 13.5 }}>
                {t('settings.language.directionTitle')}
              </AppText>
            </View>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 21 }}>
              {direction === 'rtl'
                ? t('settings.language.directionBodyRtl')
                : t('settings.language.directionBodyLtr')}
            </AppText>
          </View>
        </Card>

        <Card variant="muted" padding={theme.spacing.lg}>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText weight="semiBold" style={{ fontSize: 13 }}>
              {t('reader.scriptureArabicOnly')}
            </AppText>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }}>
              {t('settings.language.scriptureNote')}
            </AppText>
          </View>
        </Card>

        <Card variant="muted" padding={theme.spacing.lg}>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText weight="semiBold" style={{ fontSize: 13 }}>
              {t('settings.language.fontsTitle')}
            </AppText>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }}>
              {t('settings.language.fontsBody')}
            </AppText>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

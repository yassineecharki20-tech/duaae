import { useMemo } from 'react';
import { View } from 'react-native';
import * as Application from 'expo-application';
import { router } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { SettingsRow, SettingsSection } from '@/components/ui/SettingsRow';
import { DuaaWordmark } from '@/components/brand/DuaaLogo';

import { describeBackends, services } from '@/services/registry';
import { config } from '@/core/config/env';
import { ALL_DUAS, CONTENT_STATS, SESSIONS } from '@/data/content';
import { useI18n } from '@/core/i18n/I18nProvider';

/**
 * عن التطبيق.
 *
 * Version, content inventory, the real backend-readiness matrix (each
 * capability and what actually serves it), and the source books the corpus is
 * drawn from — computed from the content itself, not typed by hand.
 */
export default function AboutScreen() {
  const theme = useAppTheme();
  const { t } = useI18n();
  const backends = useMemo(() => describeBackends(), []);

  const sourceBooks = useMemo(() => {
    const counts = new Map<string, number>();
    for (const dua of ALL_DUAS) {
      for (const source of dua.sources) {
        counts.set(source.book, (counts.get(source.book) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, []);

  const quranCount = useMemo(
    () => ALL_DUAS.filter((dua) => dua.sources.some((source) => Boolean(source.quran))).length,
    [],
  );

  const appVersion = Application.nativeApplicationVersion ?? t('settings.about.devWeb');
  const buildVersion = Application.nativeBuildVersion ?? null;

  return (
    <Screen scroll testID="settings-about">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title={t('settings.about.screenTitle')} />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
        <Card padding={theme.spacing.xl}>
          <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
            <DuaaWordmark size={120} />
            <View style={{ flexDirection: 'row', gap: theme.spacing.xs, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Chip label={t('settings.about.version', { version: appVersion })} />
              {buildVersion ? <Chip label={t('settings.about.build', { build: buildVersion })} /> : null}
              <Chip label={t('settings.about.contentVersion', { version: CONTENT_STATS.version })} />
              <Chip label={config.environment === 'production' ? t('settings.about.env.production') : config.environment === 'preview' ? t('settings.about.env.preview') : t('settings.about.env.development')} />
            </View>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }} align="center">
              {t('settings.about.appDescription')}
            </AppText>
          </View>
        </Card>

        <SettingsSection title={t('settings.about.contentSection')}>
          <SettingsRow icon="library-outline" title={t('settings.about.contentDuas')} value={String(CONTENT_STATS.duaCount)} />
          <SettingsRow icon="albums-outline" title={t('settings.about.contentCategories')} value={String(CONTENT_STATS.categoryCount)} />
          <SettingsRow icon="today-outline" title={t('settings.about.contentSessions')} value={t('settings.about.contentSessionsValue', { count: SESSIONS.length })} />
          <SettingsRow icon="book-outline" title={t('settings.about.contentQuran')} value={String(quranCount)} />
        </SettingsSection>

        <SettingsSection
          title={t('settings.about.sourcesSection')}
          description={t('settings.about.sourcesNote')}
        >
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
            {sourceBooks.map(([book, count]) => (
              <View
                key={book}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <AppText style={{ fontSize: 13 }}>{book}</AppText>
                <AppText tone="subtle" style={{ fontSize: 12 }}>
                  {t('settings.about.contentDuasValue', { count })}
                </AppText>
              </View>
            ))}
            <AppText tone="subtle" style={{ fontSize: 11.5, lineHeight: 18, marginTop: theme.spacing.sm }}>
              {t('settings.about.noGeneratedText')}
            </AppText>
          </View>
        </SettingsSection>

        <SettingsSection
          title={t('settings.about.servicesSection')}
          description={t('settings.about.servicesNote')}
        >
          {backends.map((item) => (
            <SettingsRow
              key={item.capability}
              icon={item.ready ? 'checkmark-circle-outline' : 'time-outline'}
              title={item.capability}
              subtitle={item.backend}
              value={item.ready ? t('common.works') : t('common.later')}
            />
          ))}
        </SettingsSection>

        <SettingsSection title={t('settings.about.techSection')}>
          <SettingsRow icon="code-slash-outline" title={t('settings.about.platform')} subtitle="Expo SDK 57 · React Native · TypeScript" />
          <SettingsRow icon="server-outline" title={t('settings.about.storage')} subtitle={t('settings.about.storageValue')} />
          <SettingsRow icon="color-palette-outline" title={t('settings.about.fonts')} subtitle={t('settings.about.fontsValue')} />
          <SettingsRow
            icon="analytics-outline"
            title={t('settings.about.analytics')}
            subtitle={config.analyticsEnabled ? t('settings.about.analyticsOn') : t('settings.about.analyticsOff')}
          />
        </SettingsSection>

        <View style={{ gap: theme.spacing.sm }}>
          <AppText
            tone="primary"
            weight="medium"
            style={{ fontSize: 13 }}
            onPress={() => router.push('/settings/privacy')}
            accessibilityRole="button"
          >
            {t('settings.privacy.screenTitle')}
          </AppText>
          <AppText
            tone="primary"
            weight="medium"
            style={{ fontSize: 13 }}
            onPress={() => router.push('/settings/terms')}
            accessibilityRole="button"
          >
            {t('settings.terms')}
          </AppText>
          <AppText tone="muted" style={{ fontSize: 12.5 }}>
            {t('settings.about.contact', { email: config.supportEmail })}
          </AppText>
          <AppText tone="subtle" style={{ fontSize: 11.5 }}>
            {t('settings.about.analyticsService', {
              state: services.analytics().isEnabled ? t('settings.about.withAnalytics') : t('settings.about.withoutAnalytics'),
            })}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

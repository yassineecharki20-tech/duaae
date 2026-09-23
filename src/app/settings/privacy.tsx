import { View } from 'react-native';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';

import { config } from '@/core/config/env';
import { describeBackends } from '@/services/registry';
import { useI18n } from '@/core/i18n/I18nProvider';

interface Section {
  title: string;
  body: string[];
}

/**
 * الخصوصية — generated from what the build actually does.
 *
 * Rather than a pasted legal boilerplate that might drift from the code, this
 * document is derived from the configuration and the service registry: what
 * collects nothing today is listed as collecting nothing, and capabilities that
 * are not configured say so.
 */
export default function PrivacyScreen() {
  const theme = useAppTheme();
  const { t } = useI18n();
  const backends = describeBackends();
  const analyticsOn = config.analyticsEnabled;
  const firebaseOn = config.firebase.isConfigured;

  const sections: Section[] = [
    {
      title: t('settings.privacy.collectTitle'),
      body: [
        analyticsOn
          ? t('settings.privacy.collectAnalytics')
          : t('settings.privacy.collectAnalyticsOff'),
        firebaseOn
          ? t('settings.privacy.collectAccount')
          : t('settings.privacy.collectAccountOff'),
      ],
    },
    {
      title: t('settings.privacy.storageTitle'),
      body: [
        t('settings.privacy.storageLocal'),
        t('settings.privacy.storageOffline'),
      ],
    },
    {
      title: t('settings.privacy.permissionsTitle'),
      body: [
        t('settings.privacy.permissionNotifications'),
        t('settings.privacy.permissionShare'),
        t('settings.privacy.permissionNone'),
      ],
    },
    {
      title: t('settings.privacy.deleteTitle'),
      body: [
        t('settings.privacy.deleteReset'),
        t('settings.privacy.deleteUninstall'),
        t('settings.privacy.deleteAccountFuture'),
      ],
    },
    {
      title: t('settings.privacy.childrenTitle'),
      body: [
        t('settings.privacy.childrenBody'),
      ],
    },
    {
      title: t('settings.privacy.contactTitle'),
      body: [t('settings.privacy.contactBody', { email: config.supportEmail })],
    },
  ];

  return (
    <Screen scroll testID="settings-privacy">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader
          title={t('settings.privacy.screenTitle')}
          subtitle={t('settings.privacy.versionNote', {
            env: config.environment === 'production' ? t('settings.privacy.envProduction') : t('settings.privacy.envDevelopment'),
          })}
        />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}>
        <Card variant="outline" padding={theme.spacing.lg}>
          <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 21 }}>
            {t('settings.privacy.scopeNote')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
            {backends.map((item) => (
              <AppText key={item.capability} tone="subtle" style={{ fontSize: 11.5 }}>
                · {item.capability}: {item.backend}
              </AppText>
            ))}
          </View>
        </Card>

        {sections.map((section) => (
          <Card key={section.title} padding={theme.spacing.lg}>
            <View style={{ gap: theme.spacing.sm }}>
              <AppText weight="semiBold">{section.title}</AppText>
              {section.body.map((paragraph) => (
                <AppText key={paragraph} tone="muted" style={{ fontSize: 13, lineHeight: 22 }}>
                  {paragraph}
                </AppText>
              ))}
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

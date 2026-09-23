import { useMemo } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';

import { config } from '@/core/config/env';
import { CONTENT_STATS } from '@/data/content';
import { useI18n } from '@/core/i18n/I18nProvider';
import type { Translate } from '@/core/i18n/options';
import { formatLongDate } from '@/core/utils/date';

interface Clause {
  title: string;
  body: string[];
}

/** Date shown as "last updated"; bump it whenever the clauses change. */
const TERMS_UPDATED_AT = '2026-09-12';

/** Built per render so the clauses follow the active language. */
function buildClauses(t: Translate): Clause[] {
  return [
    {
      title: t('settings.terms.contentTitle'),
      body: [
        t('settings.terms.content1'),
        t('settings.terms.content2'),
      ],
    },
    {
      title: t('settings.terms.sourcesTitle'),
      body: [
        t('settings.terms.sources1'),
        t('settings.terms.sources2'),
        t('settings.terms.sources3'),
        t('settings.terms.sourcesStats', {
          version: CONTENT_STATS.version,
          duas: CONTENT_STATS.duaCount,
          categories: CONTENT_STATS.categoryCount,
        }),
      ],
    },
    {
      title: t('settings.terms.usageTitle'),
      body: [
        t('settings.terms.usage1'),
        t('settings.terms.usage2'),
      ],
    },
    {
      title: t('settings.terms.communityTitle'),
      body: [
        t('settings.terms.community1'),
        t('settings.terms.community2'),
      ],
    },
    {
      title: t('settings.terms.disclaimerTitle'),
      body: [
        t('settings.terms.disclaimer1'),
        t('settings.terms.disclaimer2'),
      ],
    },
    {
      title: t('settings.terms.dataTitle'),
      body: [
        t('settings.terms.data1'),
        t('settings.terms.data2'),
      ],
    },
    {
      title: t('settings.terms.changesTitle'),
      body: [
        t('settings.terms.changes1'),
        t('settings.terms.contact', { email: config.supportEmail }),
      ],
    },
  ];
}

/** Terms & use — including the content-authenticity policy. */
export default function TermsScreen() {
  const theme = useAppTheme();
  const { t, language } = useI18n();
  const clauses = useMemo(() => buildClauses(t), [t]);

  return (
    <Screen scroll testID="settings-terms">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader
          title={t('settings.terms')}
          subtitle={t('settings.terms.lastUpdated', { date: formatLongDate(TERMS_UPDATED_AT, language) })}
        />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}>
        {clauses.map((clause) => (
          <Card key={clause.title} padding={theme.spacing.lg}>
            <View style={{ gap: theme.spacing.sm }}>
              <AppText weight="semiBold">{clause.title}</AppText>
              {clause.body.map((paragraph) => (
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

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

/**
 * عن التطبيق.
 *
 * Version, content inventory, the real backend-readiness matrix (each
 * capability and what actually serves it), and the source books the corpus is
 * drawn from — computed from the content itself, not typed by hand.
 */
export default function AboutScreen() {
  const theme = useAppTheme();
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

  const appVersion = Application.nativeApplicationVersion ?? 'تطوير (ويب)';
  const buildVersion = Application.nativeBuildVersion ?? null;

  return (
    <Screen scroll testID="settings-about">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title="عن التطبيق" />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
        <Card padding={theme.spacing.xl}>
          <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
            <DuaaWordmark size={120} />
            <View style={{ flexDirection: 'row', gap: theme.spacing.xs, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Chip label={`الإصدار ${appVersion}`} />
              {buildVersion ? <Chip label={`بناء ${buildVersion}`} /> : null}
              <Chip label={`المحتوى ${CONTENT_STATS.version}`} />
              <Chip label={config.environment === 'production' ? 'إنتاج' : config.environment === 'preview' ? 'معاينة' : 'تطوير'} />
            </View>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }} align="center">
              تطبيق أدعية وأذكار يعمل دون إنترنت، بلا إعلانات وبلا تتبع. كل نص منسوب إلى مصدره المطبوع.
            </AppText>
          </View>
        </Card>

        <SettingsSection title="المحتوى">
          <SettingsRow icon="library-outline" title="نصوص الأدعية والأذكار" value={String(CONTENT_STATS.duaCount)} />
          <SettingsRow icon="albums-outline" title="التصنيفات" value={String(CONTENT_STATS.categoryCount)} />
          <SettingsRow icon="today-outline" title="جلسات الأذكار" value={`${SESSIONS.length} (صباح، مساء، نوم)`} />
          <SettingsRow icon="book-outline" title="آيات قرآنية مستخدمة كأدعية" value={String(quranCount)} />
        </SettingsSection>

        <SettingsSection
          title="المصادر"
          description="قائمة مُستخرجة من المحتوى نفسه مع عدد النصوص المنسوبة لكل مصدر."
        >
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
            {sourceBooks.map(([book, count]) => (
              <View
                key={book}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <AppText style={{ fontSize: 13 }}>{book}</AppText>
                <AppText tone="subtle" style={{ fontSize: 12 }}>
                  {count} نصًّا
                </AppText>
              </View>
            ))}
            <AppText tone="subtle" style={{ fontSize: 11.5, lineHeight: 18, marginTop: theme.spacing.sm }}>
              لا يضيف التطبيق أي نص من توليد آلي أو من مصادر غير موثوقة. ما لا يُعرف مصدره أو درجته لا
              يُنشر.
            </AppText>
          </View>
        </SettingsSection>

        <SettingsSection
          title="حالة الخدمات"
          description="ما الذي يخدم كل ميزة فعليًا في هذا البناء — بلا ادعاء."
        >
          {backends.map((item) => (
            <SettingsRow
              key={item.capability}
              icon={item.ready ? 'checkmark-circle-outline' : 'time-outline'}
              title={item.capability}
              subtitle={item.backend}
              value={item.ready ? 'يعمل' : 'لاحقًا'}
            />
          ))}
        </SettingsSection>

        <SettingsSection title="التقنية">
          <SettingsRow icon="code-slash-outline" title="المنصة" subtitle="Expo SDK 57 · React Native · TypeScript" />
          <SettingsRow icon="server-outline" title="التخزين" subtitle="تخزين الجهاز (AsyncStorage) — يعمل دون اتصال" />
          <SettingsRow icon="color-palette-outline" title="الخطوط" subtitle="أميري (نصوص شرعية) · IBM Plex Sans Arabic (واجهة)" />
          <SettingsRow
            icon="analytics-outline"
            title="التحليلات"
            subtitle={config.analyticsEnabled ? 'مفعّلة' : 'معطّلة — لا يُرسل أي حدث'}
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
            سياسة الخصوصية
          </AppText>
          <AppText
            tone="primary"
            weight="medium"
            style={{ fontSize: 13 }}
            onPress={() => router.push('/settings/terms')}
            accessibilityRole="button"
          >
            الشروط والاستخدام
          </AppText>
          <AppText tone="muted" style={{ fontSize: 12.5 }}>
            تواصل: {config.supportEmail}
          </AppText>
          <AppText tone="subtle" style={{ fontSize: 11.5 }}>
            خدمة الدعم الحالية: {services.analytics().isEnabled ? 'مع تحليلات مفعّلة' : 'بلا تحليلات'}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

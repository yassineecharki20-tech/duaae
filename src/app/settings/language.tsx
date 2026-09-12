import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { SettingsRow, SettingsSection, FutureTag } from '@/components/ui/SettingsRow';

import { useSettingsStore } from '@/store/settingsStore';
import { LANGUAGE_LABELS, PLANNED_LANGUAGES } from '@/design/tokens/labels';

/**
 * اللغة.
 *
 * Arabic ships first and is the only selectable language; English appears as a
 * clearly-labelled future option rather than a switch that would leave half the
 * app untranslated.
 */
export default function LanguageSettingsScreen() {
  const theme = useAppTheme();
  const language = useSettingsStore((state) => state.language);

  return (
    <Screen scroll testID="settings-language">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title="اللغة" />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
        <SettingsSection title="لغة التطبيق">
          <SettingsRow
            icon="checkmark-circle"
            title={LANGUAGE_LABELS[language]}
            subtitle="اللغة الحالية — واجهة واتجاه من اليمين إلى اليسار"
            value="نشط"
          />
          {PLANNED_LANGUAGES.map((item) => (
            <SettingsRow
              key={item.code}
              icon="globe-outline"
              title={item.label}
              subtitle={`${item.native} — الترجمة قيد الإعداد`}
              disabled
              rightAccessory={<FutureTag />}
            />
          ))}
        </SettingsSection>

        <Card variant="outline" padding={theme.spacing.lg}>
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Ionicons name="swap-horizontal-outline" size={16} color={theme.colors.primary} />
              <AppText weight="semiBold" style={{ fontSize: 13.5 }}>
                الاتجاه من اليمين إلى اليسار
              </AppText>
            </View>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 21 }}>
              التطبيق مبني بالكامل بالاتجاه العربي: التخطيط، التنقّل، الإيماءات، وحتى بطاقة المشاركة.
              عند إضافة الإنجليزية سيتحوّل الاتجاه تلقائيًا إلى اليسار-يمين دون إعادة بناء الواجهة —
              البنية تدعم الاتجاهين منذ اليوم الأول.
            </AppText>
          </View>
        </Card>

        <Card variant="muted" padding={theme.spacing.lg}>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText weight="semiBold" style={{ fontSize: 13 }}>
              الخطوط
            </AppText>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }}>
              «أميري» للنصوص الشرعية، و«IBM Plex Sans Arabic» للواجهة. كلاهما مفتوح المصدر ومضمّن داخل
              التطبيق، فلا حاجة للإنترنت لعرضهما.
            </AppText>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

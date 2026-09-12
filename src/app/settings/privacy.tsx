import { View } from 'react-native';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';

import { config } from '@/core/config/env';
import { describeBackends } from '@/services/registry';

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
  const backends = describeBackends();
  const analyticsOn = config.analyticsEnabled;
  const firebaseOn = config.firebase.isConfigured;

  const sections: Section[] = [
    {
      title: 'ما الذي نجمعه',
      body: [
        analyticsOn
          ? 'قد تُرسل أحداث استخدام مجمّعة (مثل فتح تصنيف أو إتمام جلسة أذكار) إلى مزوّد التحليلات، دون نص أدعيتك أو هويتك.'
          : 'في هذا البناء التحليلات معطّلة: لا يُرسل التطبيق أي حدث استخدام إلى أي جهة.',
        firebaseOn
          ? 'عند ربط Firebase وتسجيل الدخول، يُحفظ حسابك (البريد، المعرّف) وبياناتك المختارة للمزامنة على خوادم Google/Firebase وفق سياستهم.'
          : 'خدمة الحسابات غير مُهيأة، لذلك لا يُرسل التطبيق أي بيانات شخصية إلى خوادم خارجية.',
      ],
    },
    {
      title: 'أين تُخزَّن بياناتك',
      body: [
        'المفضلة، عدّادات التسبيح، تقدّم الأذكار، الاسم الذي تختاره، وتفضيلات المظهر والتذكيرات تُخزَّن محليًا على جهازك عبر تخزين التطبيق.',
        'لا يحتاج التطبيق إلى اتصال بالإنترنت لعرض الأدعية أو الأذكار أو البحث فيها؛ المحتوى مضمّن داخل الحزمة.',
      ],
    },
    {
      title: 'الأذونات',
      body: [
        'الإشعارات: يُطلب الإذن فقط عند تفعيل تذكير، ويمكن رفضه دون أن يفقد التطبيق أي وظيفة أخرى.',
        'المشاركة: عند إنشاء بطاقة مشاركة يُستخدم تخزين الجهاز المؤقت لحفظ الصورة قبل مشاركتها، ولا يُرفع شيء تلقائيًا.',
        'لا يطلب التطبيق إذن الموقع أو جهات الاتصال أو الكاميرا.',
      ],
    },
    {
      title: 'حذف بياناتك',
      body: [
        'من «الإعدادات ▸ إعادة ضبط البيانات المحلية» تُحذف كل بياناتك المخزّنة على الجهاز فورًا ودون رجعة.',
        'إلغاء تثبيت التطبيق يحذف تخزينه المحلي بالكامل.',
        'عند تفعيل الحسابات مستقبلًا سيكون حذف الحساب متاحًا من «الإعدادات ▸ الحساب» ويشمل البيانات السحابية.',
      ],
    },
    {
      title: 'الأطفال',
      body: [
        'التطبيق مخصص للاستخدام العام ولا يجمع بيانات عن قصد من الأطفال. المحتوى ديني وتعليمي ولا يتضمن إعلانات أو مشتريات داخل التطبيق.',
      ],
    },
    {
      title: 'التواصل',
      body: [`لأي استفسار يخص الخصوصية: ${config.supportEmail}`],
    },
  ];

  return (
    <Screen scroll testID="settings-privacy">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title="سياسة الخصوصية" subtitle={`الإصدار ${config.environment === 'production' ? 'الإنتاجي' : 'التطويري'}`} />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}>
        <Card variant="outline" padding={theme.spacing.lg}>
          <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 21 }}>
            هذه الصفحة تصف ما يفعله هذا البناء تحديدًا، وتُحدَّث من إعدادات التطبيق نفسها:
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

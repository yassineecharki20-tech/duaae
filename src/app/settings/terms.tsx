import { View } from 'react-native';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';

import { config } from '@/core/config/env';
import { CONTENT_STATS } from '@/data/content';

interface Clause {
  title: string;
  body: string[];
}

const CLAUSES: readonly Clause[] = [
  {
    title: 'طبيعة المحتوى',
    body: [
      'دعاء تطبيق عرض للأدعية والأذكار المأثورة مع مصادرها، وليس جهة إفتاء. لا يقدم التطبيق فتاوى ولا أحكامًا شرعية ولا يستبدل استشارة أهل العلم.',
      'الآيات القرآنية تُعرض كما وردت في المصحف، والأحاديث تُنسب إلى مجموعاتها المطبوعة مع درجتها عند توفّرها.',
    ],
  },
  {
    title: 'سياسة المصادر — لا نص بلا مرجع',
    body: [
      'كل نص في التطبيق مأخوذ من مصدر مطبوع معروف: القرآن الكريم، صحيح البخاري، صحيح مسلم، سنن أبي داود والترمذي والنسائي وابن ماجه، وحصن المسلم لسعيد بن علي بن وهف القحطاني.',
      'لا يُضاف أي نص من توليد آلي، ولا يُنسب أي قول إلى النبي ﷺ دون مصدر، ولا تُذكر درجة (صحيح/حسن) دون مرجع.',
      'عند اختلاف الروايات يُعتمد اللفظ الأشهر في حصن المسلم، ويُذكر المصدر كما هو دون تصرّف في النص.',
      `الإصدار الحالي للمحتوى: ${CONTENT_STATS.version} — ${CONTENT_STATS.duaCount} نصًّا في ${CONTENT_STATS.categoryCount} تصنيفًا.`,
    ],
  },
  {
    title: 'الاستخدام المقبول',
    body: [
      'يحق لك استخدام التطبيق ونسخ أدعيته ومشاركتها بحرية، بما في ذلك بطاقات المشاركة التي ينشئها التطبيق.',
      'لا يجوز نسب المحتوى إلى غير مصادره، أو تعديل النصوص الشرعية ثم نشرها باسم التطبيق، أو استخدام التطبيق لنشر ما يخالف أحكام الشريعة أو القانون.',
    ],
  },
  {
    title: 'المجتمع (عند تفعيله)',
    body: [
      'ميزة المجتمع غير مُفعّلة في هذا البناء ولن تُفعّل قبل توفير خدمة حسابات وآلية إشراف.',
      'عند تفعيلها: كل منشور يخالف سياسة المصادر أو يتضمن إساءة يُحذف، ويحق للمستخدم الإبلاغ عن أي محتوى.',
    ],
  },
  {
    title: 'الإخلاء من المسؤولية',
    body: [
      'الأدعية المتعلقة بالشفاء أو الرزق أو قضاء الحاجة هي أدعية مأثورة يُستحب الدعاء بها، وليست بديلًا عن العلاج الطبي أو السعي المشروع أو الاستشارة المختصة.',
      'التطبيق يُقدَّم «كما هو» دون ضمانات تتجاوز صحة نسبة النصوص إلى مصادرها المعلنة.',
    ],
  },
  {
    title: 'البيانات والملكية',
    body: [
      'بياناتك المحلية ملكك، وتحذفها متى شئت من الإعدادات.',
      'خط «أميري» و«IBM Plex Sans Arabic» مفتوحا المصدر ويُستخدمان وفق رخصتيهما، وأيقونات Ionicons وفق رخصة MIT.',
    ],
  },
  {
    title: 'تعديل الشروط',
    body: [
      'قد تُحدَّث هذه الشروط مع إضافة ميزات جديدة (كالحسابات والمجتمع). سيظهر تاريخ التحديث في هذه الصفحة.',
      `للتواصل: ${config.supportEmail}`,
    ],
  },
];

/** الشروط والاستخدام — including the content-authenticity policy. */
export default function TermsScreen() {
  const theme = useAppTheme();

  return (
    <Screen scroll testID="settings-terms">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title="الشروط والاستخدام" subtitle="آخر تحديث: ٢٠٢٦/٠٩/١٢" />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}>
        {CLAUSES.map((clause) => (
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

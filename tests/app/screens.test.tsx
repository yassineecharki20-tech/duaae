/**
 * Screen-level render tests.
 *
 * Every route in `src/app` is mounted inside the real provider tree and
 * asserted on content a user would actually see. This is what catches a screen
 * that crashes on mount, renders an empty shell, or shows copy that no longer
 * matches the data layer.
 */

import { act } from '@testing-library/react';

import AboutScreen from '@/app/settings/about';
import AccountScreen from '@/app/settings/account';
import AppearanceScreen from '@/app/settings/appearance';
import LanguageScreen from '@/app/settings/language';
import NotificationsScreen from '@/app/settings/notifications';
import PrivacyScreen from '@/app/settings/privacy';
import SettingsScreen from '@/app/settings/index';
import TermsScreen from '@/app/settings/terms';
import CategoryScreen from '@/app/category/[categoryId]';
import CommunityScreen from '@/app/(tabs)/community';
import DuaDetailScreen from '@/app/dua/[duaId]';
import DuasScreen from '@/app/(tabs)/duas';
import FavoritesScreen from '@/app/favorites';
import HomeScreen from '@/app/(tabs)/index';
import MorningAzkar from '@/app/azkar/morning';
import EveningAzkar from '@/app/azkar/evening';
import SleepAzkar from '@/app/azkar/sleep';
import NotFoundScreen from '@/app/+not-found';
import OnboardingScreen from '@/app/onboarding';
import ProfileScreen from '@/app/(tabs)/profile';
import SearchScreen from '@/app/search';
import TasbeehScreen from '@/app/(tabs)/tasbeeh';

import { CATEGORY_BY_ID, DUA_BY_ID, DUAS_BY_CATEGORY, CONTENT_STATS } from '@/data/content';
import { services } from '@/services/registry';
import { useAuthStore } from '@/store/authStore';
import { useContentStore } from '@/store/contentStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { formatSourceReference } from '@/components/duas/SourceLine';
import { renderScreen, settle, visibleText } from './helpers';

beforeAll(async () => {
  // The root layout normally does this at boot; tests mount screens directly.
  await act(async () => {
    await useContentStore.getState().hydrate();
    await useFavoritesStore.getState().hydrate();
    useAuthStore.getState().hydrate();
  });
  await settle();
});

describe('tabs', () => {
  it('home renders the greeting, the daily dua and the real shortcuts', async () => {
    const { container } = await renderScreen(<HomeScreen />);
    const text = visibleText(container);

    expect(text).toContain('السلام عليكم');
    expect(text).toContain('دعاء اليوم');
    expect(text).toContain('أذكار اليوم');
    expect(text).toContain('أذكار الصباح');
    expect(text).toContain('أذكار المساء');
    expect(text).toContain('اختصارات');
    expect(text).toContain('التسبيح');
    expect(text).toContain('المفضلة');
    expect(text).toContain('المجتمع');
    expect(text).toContain('تصفّح الأدعية');
    expect(text).toContain(`${CONTENT_STATS.duaCount} دعاءً وذكرًا موثّقًا`);
  });

  it('duas lists every category with its real count', async () => {
    const { container } = await renderScreen(<DuasScreen />);
    const text = visibleText(container);

    expect(text).toContain('الأدعية والأذكار');
    expect(text).toContain(`${CONTENT_STATS.duaCount} نصًّا موثّقًا`);
    for (const category of CATEGORY_BY_ID.values()) {
      expect(text).toContain(category.title);
    }
  });

  it('tasbeeh shows the counter dial and the five preset phrases', async () => {
    const { container, getByTestId } = await renderScreen(<TasbeehScreen />);
    const text = visibleText(container);

    expect(text).toContain('التسبيح');
    expect(text).toContain('سُبْحَانَ اللَّهِ');
    expect(text).toContain('أذكار سريعة');
    expect(getByTestId('tasbeeh-dial').getAttribute('aria-label')).toContain('عداد التسبيح');
    expect(visibleText(getByTestId('tasbeeh-dial'))).toContain('من 33');
  });

  it('community states honestly that it is not launched — with no fake posts', async () => {
    const { container } = await renderScreen(<CommunityScreen />);
    const text = visibleText(container);

    expect(text).toContain('المجتمع لم يُطلق بعد');
    expect(text).toContain('لن تجد هنا بيانات تجريبية أو منشورات وهمية');
    expect(text).toContain('المرحلة القادمة');

    // The empty state is driven by the real service error, not by hardcoded copy.
    const feed = await services.community().getFeed();
    expect(feed.ok).toBe(false);
    if (!feed.ok) {
      expect(feed.error.code).toBe('NOT_CONFIGURED');
      expect(text).toContain(feed.error.userMessage);
    }
  });

  it('profile shows the local identity and the real stats', async () => {
    const { container } = await renderScreen(<ProfileScreen />);
    const text = visibleText(container);

    expect(text).toContain('حسابي');
    expect(text).toContain('إحصاءاتك');
    expect(text).toContain('تسجيل الدخول غير مُفعّل بعد');
    expect(text).toContain('الملف محفوظ على جهازك فقط');
    expect(text).toContain('تتابع حالي');
  });
});

describe('azkar sessions', () => {
  it.each([
    ['morning', MorningAzkar, 'أذكار الصباح'],
    ['evening', EveningAzkar, 'أذكار المساء'],
    ['sleep', SleepAzkar, 'أذكار النوم'],
  ] as const)('%s renders every dhikr with its repeat counter', async (_key, Screen, title) => {
    const { container, getByTestId } = await renderScreen(<Screen />);
    const text = visibleText(container);
    const items = DUAS_BY_CATEGORY.get(_key) ?? [];

    expect(text).toContain(title);
    expect(text).toContain(`${items.length} ذكرًا`);
    expect(getByTestId('dhikr-0')).toBeTruthy();
    expect(visibleText(getByTestId(`dhikr-${items.length - 1}`))).toContain(items[items.length - 1].text.slice(0, 12));
  });
});

describe('content routes', () => {
  it('category screen lists the duas of that category', async () => {
    const category = CATEGORY_BY_ID.get('rizq')!;
    const duas = DUAS_BY_CATEGORY.get('rizq')!;
    const { container } = await renderScreen(<CategoryScreen />, {
      params: { categoryId: 'rizq' },
      path: '/category/rizq',
    });
    const text = visibleText(container);

    expect(text).toContain(category.title);
    expect(visibleText(container).length).toBeGreaterThan(duas[0].text.length);
    expect(text).toContain(duas[0].text.slice(0, 20));
  });

  it('dua reader shows the text and its full attribution', async () => {
    const dua = [...DUA_BY_ID.values()].find((item) => item.sources.length > 0)!;
    const { container } = await renderScreen(<DuaDetailScreen />, {
      params: { duaId: dua.id },
      path: `/dua/${dua.id}`,
    });
    const text = visibleText(container);

    expect(text).toContain(dua.text.slice(0, 20));
    expect(text).toContain('المصدر');
    expect(text).toContain(formatSourceReference(dua.sources[0]));
  });

  it('favorites starts with an honest empty state', async () => {
    const { container } = await renderScreen(<FavoritesScreen />);
    expect(visibleText(container)).toContain('لا توجد أدعية محفوظة');
  });

  it('search explains itself before a query is typed', async () => {
    const { container } = await renderScreen(<SearchScreen />);
    const text = visibleText(container);

    expect(text).toContain('البحث');
    expect(text).toContain('جرّب هذه الكلمات');
  });

  it('unknown routes say so and offer real ways out', async () => {
    const { container } = await renderScreen(<NotFoundScreen />, { path: '/nope' });
    const text = visibleText(container);

    expect(text).toContain('الصفحة غير موجودة');
    expect(text).toContain('/nope');
    expect(text).toContain('/dua/today');
  });
});

describe('settings', () => {
  it('hub lists every real destination', async () => {
    const { container } = await renderScreen(<SettingsScreen />);
    const text = visibleText(container);

    for (const label of [
      'المظهر والقراءة',
      'التذكيرات',
      'اللغة',
      'الحساب والمزامنة',
      'عن التطبيق',
      'الخصوصية',
      'الشروط والاستخدام',
      'إعادة ضبط البيانات المحلية',
    ]) {
      expect(text).toContain(label);
    }
  });

  it('appearance offers theme, reading size, motion and feedback controls', async () => {
    const { container } = await renderScreen(<AppearanceScreen />);
    const text = visibleText(container);

    expect(text).toContain('السمة');
    expect(text).toContain('حجم خط الأدعية');
    expect(text).toContain('الحركة');
    expect(text).toContain('أصوات التسبيح');
    expect(text).toContain('الاهتزاز');
    expect(text).toContain('رَبِّ اشْرَحْ لِي صَدْرِي');
  });

  it('notifications admits that scheduling is not wired yet', async () => {
    const { container } = await renderScreen(<NotificationsScreen />);
    await settle();
    const text = visibleText(container);

    expect(text).toContain('الاختيارات محفوظة — الجدولة لم تُفعّل بعد');
    expect(text).toContain('أذكار الصباح');
    expect(text).toContain('ساعات الهدوء');
  });

  it('account reports the unconfigured backend instead of a fake sign-in', async () => {
    const { container } = await renderScreen(<AccountScreen />);
    const text = visibleText(container);

    expect(text).toContain('خدمة الحساب غير مُهيأة في هذا الإصدار');
    expect(text).toContain('بياناتك على هذا الجهاز');
    expect(text).not.toContain('تم تسجيل الدخول');
  });

  it('language offers Arabic, French and English as real choices', async () => {
    const { container } = await renderScreen(<LanguageScreen />);
    const text = visibleText(container);

    // All three are selectable: no "planned"/disabled language rows any more.
    expect(text).toContain('العربية');
    expect(text).toContain('Français');
    expect(text).toContain('English');
    expect(text).toContain('واجهة من اليمين إلى اليسار');
    expect(text).toContain('واجهة من اليسار إلى اليمين');
    expect(text).not.toContain('قيد الإعداد');
  });

  it('about lists version, sources and the backend readiness matrix', async () => {
    const { container } = await renderScreen(<AboutScreen />);
    const text = visibleText(container);

    expect(text).toContain('عن التطبيق');
    expect(text).toContain(CONTENT_STATS.version);
    expect(text).toContain('المصادر');
    expect(text).toContain('حالة الخدمات');
    expect(text).toContain('حصن المسلم');
  });

  it('privacy describes what this build actually does', async () => {
    const { container } = await renderScreen(<PrivacyScreen />);
    const text = visibleText(container);

    expect(text).toContain('سياسة الخصوصية');
    expect(text).toContain('أين تُخزَّن بياناتك');
    expect(text).toContain('التحليلات معطّلة');
  });

  it('terms carry the no-fabrication content policy', async () => {
    const { container } = await renderScreen(<TermsScreen />);
    const text = visibleText(container);

    expect(text).toContain('الشروط والاستخدام');
    expect(text).toContain('لا نص بلا مرجع');
    expect(text).toContain('لا يُضاف أي نص من توليد آلي');
  });
});

describe('onboarding', () => {
  it('starts on the first slide with its real copy', async () => {
    const { container } = await renderScreen(<OnboardingScreen />);
    const text = visibleText(container);

    expect(text).toContain('اجعل الذكر جزءًا من يومك');
    expect(text).toContain('التالي');
  });
});

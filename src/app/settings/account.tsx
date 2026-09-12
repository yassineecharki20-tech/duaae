import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SettingsRow, SettingsSection, FutureTag } from '@/components/ui/SettingsRow';
import { useToast } from '@/components/ui/Toast';

import { useAuthStore } from '@/store/authStore';
import { services } from '@/services/registry';
import { config } from '@/core/config/env';
import { useUserProfile } from '@/features/user/useUserProfile';

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  email: 'البريد الإلكتروني',
  anonymous: 'حساب ضيف',
};

/**
 * الحساب والمزامنة — an honest account screen.
 *
 * With no Firebase project configured the auth service reports
 * `NOT_CONFIGURED`; this screen shows that state, lists the providers the
 * service declares, and explains exactly what changes once it is wired. There
 * is no simulated sign-in and no button that claims to connect to a server it
 * cannot reach.
 */
export default function AccountSettingsScreen() {
  const theme = useAppTheme();
  const toast = useToast();
  const auth = services.auth();
  const { profile, stats } = useUserProfile();

  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isConfigured = useAuthStore((state) => state.isConfigured);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const signIn = useCallback(
    async (provider: 'google' | 'apple' | 'anonymous') => {
      setBusy(true);
      const result = await auth.signInWithProvider(provider);
      setBusy(false);
      if (result.ok) {
        toast.show('تم تسجيل الدخول', 'success');
      } else {
        toast.show(result.error.userMessage, 'error');
      }
    },
    [auth, toast],
  );

  const signOut = useCallback(async () => {
    setBusy(true);
    const result = await auth.signOut();
    setBusy(false);
    toast.show(result.ok ? 'تم تسجيل الخروج' : result.error.userMessage, result.ok ? 'success' : 'error');
  }, [auth, toast]);

  const deleteAccount = useCallback(async () => {
    setBusy(true);
    const result = await auth.deleteAccount();
    setBusy(false);
    setConfirmDelete(false);
    toast.show(result.ok ? 'تم حذف الحساب' : result.error.userMessage, result.ok ? 'success' : 'error');
  }, [auth, toast]);

  return (
    <Screen scroll testID="settings-account">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title="الحساب والمزامنة" />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
        {/* Current state */}
        <Card variant={status === 'authenticated' ? 'muted' : 'outline'} padding={theme.spacing.lg}>
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Ionicons
                name={status === 'authenticated' ? 'cloud-done-outline' : 'cloud-offline-outline'}
                size={18}
                color={status === 'authenticated' ? theme.colors.success : theme.colors.textMuted}
              />
              <AppText weight="semiBold" style={{ fontSize: 13.5 }}>
                {status === 'authenticated'
                  ? `مسجّل الدخول${user?.email ? ` — ${user.email}` : ''}`
                  : status === 'unavailable'
                    ? 'خدمة الحساب غير مُهيأة في هذا الإصدار'
                    : 'جارٍ التحقق من الجلسة…'}
              </AppText>
            </View>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }}>
              {isConfigured
                ? 'الجلسة مرتبطة بخادم الحسابات وتُستعاد تلقائيًا عند فتح التطبيق.'
                : `لم تُضبط مفاتيح Firebase في هذا البناء، لذلك لا يحاول التطبيق الاتصال بأي خادم. بياناتك (الاسم، المفضلة، التسبيح، الأذكار) محفوظة على جهازك${profile?.displayName ? ` باسم «${profile.displayName}»` : ''} وتعمل بالكامل دون إنترنت.`}
            </AppText>
          </View>
        </Card>

        {isConfigured ? (
          status === 'authenticated' ? (
            <SettingsSection title="الجلسة">
              <SettingsRow icon="mail-outline" title={user?.email ?? 'بريد غير معروف'} subtitle={user?.provider ? PROVIDER_LABELS[user.provider] ?? user.provider : undefined} />
              <SettingsRow icon="shield-checkmark-outline" title="توثيق البريد" subtitle={user?.emailVerified ? 'موثّق' : 'غير موثّق'} />
              <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
                <Button variant="outline" size="md" loading={busy} accessibilityLabel="تسجيل الخروج" onPress={() => void signOut()} label="تسجيل الخروج" />
                <Button variant="destructive" size="md" accessibilityLabel="حذف الحساب" onPress={() => setConfirmDelete(true)} label="حذف الحساب وبياناته" />
              </View>
            </SettingsSection>
          ) : (
            <SettingsSection title="تسجيل الدخول" description="اختر طريقة الدخول لمزامنة بياناتك بين الأجهزة.">
              {auth.supportedProviders.map((provider) => (
                <SettingsRow
                  key={provider}
                  icon={provider === 'google' ? 'logo-google' : provider === 'apple' ? 'logo-apple' : 'mail-outline'}
                  title={`الدخول عبر ${PROVIDER_LABELS[provider] ?? provider}`}
                  subtitle="يحتاج اتصالًا بالإنترنت مرة واحدة"
                  onPress={() => void signIn(provider === 'google' || provider === 'apple' ? provider : 'anonymous')}
                />
              ))}
            </SettingsSection>
          )
        ) : (
          <SettingsSection
            title="ما الذي سيتغيّر عند ربط الحسابات؟"
            description="الكود جاهز؛ ما ينقص هو المفاتيح في ملف البيئة."
          >
            {[
              { icon: 'logo-google' as const, title: 'الدخول بـ Google', body: 'مزامنة المفضلة والتسبيح والأذكار بين الأجهزة.' },
              { icon: 'cloud-upload-outline' as const, title: 'نسخ احتياطي سحابي', body: 'استعادة بياناتك عند تغيير الهاتف أو إعادة التثبيت.' },
              { icon: 'people-outline' as const, title: 'المجتمع', body: 'النشر والتفاعل يحتاج هوية موثوقة لمنع الإساءة.' },
            ].map((item) => (
              <View key={item.title} style={{ padding: theme.spacing.lg, gap: 4, flexDirection: 'row' }}>
                <Ionicons name={item.icon} size={18} color={theme.colors.accent} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 2, marginStart: theme.spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    <AppText weight="medium" style={{ fontSize: 13.5 }}>
                      {item.title}
                    </AppText>
                    <FutureTag />
                  </View>
                  <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }}>
                    {item.body}
                  </AppText>
                </View>
              </View>
            ))}
          </SettingsSection>
        )}

        <SettingsSection title="بياناتك على هذا الجهاز">
          <SettingsRow icon="heart-outline" title="المفضلة" value={String(stats?.favoriteCount ?? 0)} />
          <SettingsRow icon="repeat-outline" title="إجمالي التسبيح" value={String(stats?.tasbeehTotal ?? 0)} />
          <SettingsRow icon="checkmark-circle-outline" title="جلسات أذكار مكتملة" value={String(stats?.azkarSessionsCompleted ?? 0)} />
          <SettingsRow icon="flame-outline" title="التتابع الحالي" value={`${stats?.currentStreakDays ?? 0} يوم`} />
        </SettingsSection>

        <AppText tone="subtle" style={{ fontSize: 11.5, lineHeight: 18 }}>
          للتواصل بشأن الحساب أو البيانات: {config.supportEmail}
        </AppText>
      </View>

      <BottomSheet
        visible={confirmDelete}
        onDismiss={() => setConfirmDelete(false)}
        title="حذف الحساب"
        subtitle="لا يمكن التراجع عن هذه الخطوة"
        scrollable={false}
      >
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          <AppText tone="muted" style={{ fontSize: 13, lineHeight: 21 }}>
            سيُحذف حسابك وبياناتك المرتبطة به من الخادم. البيانات المحفوظة على جهازك تُحذف من شاشة
            «الإعدادات ▸ إعادة ضبط البيانات المحلية».
          </AppText>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="ghost"
                fullWidth
                label="إلغاء"
                accessibilityLabel="إلغاء"
                onPress={() => setConfirmDelete(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="destructive"
                fullWidth
                loading={busy}
                label="حذف نهائي"
                accessibilityLabel="تأكيد حذف الحساب"
                onPress={() => void deleteAccount()}
              />
            </View>
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SettingsRow, SettingsSection } from '@/components/ui/SettingsRow';
import { useToast } from '@/components/ui/Toast';

import { useSettingsStore } from '@/store/settingsStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useTasbeehStore } from '@/store/tasbeehStore';
import { useAzkarStore } from '@/store/azkarStore';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';
import { APPEARANCE_LABELS, MOTION_LABELS, READING_SCALE_LABELS } from '@/design/tokens/labels';

/**
 * الإعدادات — the hub.
 *
 * Every row leads to a real screen; the destructive action is a real local
 * reset with an explicit confirmation. Nothing here toggles a value that isn't
 * persisted.
 */
export default function SettingsScreen() {
  const theme = useAppTheme();
  const toast = useToast();
  const appearance = useSettingsStore((state) => state.appearance);
  const readingScale = useSettingsStore((state) => state.readingScale);
  const motion = useSettingsStore((state) => state.motion);
  const language = useSettingsStore((state) => state.language);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const clearFavorites = useFavoritesStore((state) => state.clear);
  const resetTasbeeh = useTasbeehStore((state) => state.resetAll);
  const resetAzkar = useAzkarStore((state) => state.resetAll);

  useEffect(() => {
    void services.analytics().screen('settings');
  }, []);

  const onReset = useCallback(async () => {
    setResetting(true);
    const [favorites, tasbeeh, azkar, profile] = await Promise.all([
      clearFavorites(),
      Promise.resolve(resetTasbeeh()),
      Promise.resolve(resetAzkar()),
      services.users().resetLocalData(),
    ]);
    setResetting(false);
    setConfirmReset(false);
    void services
      .analytics()
      .track({ name: AnalyticsEvents.settingChanged, params: { setting: 'reset_local_data', value: true } });

    if (!profile.ok) {
      toast.show('حُذفت البيانات المحلية لكن تعذّر مسح الملف الشخصي', 'error');
      return;
    }
    void favorites;
    void tasbeeh;
    void azkar;
    toast.show('تم مسح البيانات المحلية', 'success');
  }, [clearFavorites, resetAzkar, resetTasbeeh, toast]);

  return (
    <Screen scroll testID="settings-screen">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title="الإعدادات" />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
        <SettingsSection title="التطبيق">
          <SettingsRow
            icon="color-palette-outline"
            title="المظهر والقراءة"
            subtitle={`${APPEARANCE_LABELS[appearance]} · خط ${READING_SCALE_LABELS[readingScale]}`}
            onPress={() => router.push('/settings/appearance')}
          />
          <SettingsRow
            icon="notifications-outline"
            title="التذكيرات"
            subtitle="الأوقات محفوظة محليًا — الجدولة في المرحلة القادمة"
            onPress={() => router.push('/settings/notifications')}
          />
          <SettingsRow
            icon="language-outline"
            title="اللغة"
            subtitle={language === 'ar' ? 'العربية' : 'English'}
            onPress={() => router.push('/settings/language')}
          />
        </SettingsSection>

        <SettingsSection title="الحساب">
          <SettingsRow
            icon="person-circle-outline"
            title="الحساب والمزامنة"
            subtitle="حالة تسجيل الدخول والبيانات"
            onPress={() => router.push('/settings/account')}
          />
        </SettingsSection>

        <SettingsSection title="حول">
          <SettingsRow
            icon="information-circle-outline"
            title="عن التطبيق"
            subtitle="الإصدار، الخدمات، المصادر"
            onPress={() => router.push('/settings/about')}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            title="الخصوصية"
            onPress={() => router.push('/settings/privacy')}
          />
          <SettingsRow
            icon="document-text-outline"
            title="الشروط والاستخدام"
            onPress={() => router.push('/settings/terms')}
          />
        </SettingsSection>

        <SettingsSection title="الحركة واللمس">
          <SettingsRow
            icon="pulse-outline"
            title="تقليل الحركة"
            subtitle={MOTION_LABELS[motion]}
            onPress={() => router.push('/settings/appearance')}
          />
        </SettingsSection>

        <SettingsSection title="البيانات">
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }}>
              كل بياناتك (المفضلة، التسبيح، الأذكار، التفضيلات) محفوظة على هذا الجهاز فقط. إعادة الضبط
              تحذفها نهائيًا ولا يمكن التراجع.
            </AppText>
            <Button
              variant="destructive"
              size="md"
              accessibilityLabel="إعادة ضبط البيانات المحلية"
              onPress={() => setConfirmReset(true)} label="إعادة ضبط البيانات المحلية" />
          </View>
        </SettingsSection>
      </View>

      <BottomSheet
        visible={confirmReset}
        onDismiss={() => setConfirmReset(false)}
        title="تأكيد إعادة الضبط"
        subtitle="سيُحذف: المفضلة، عدّادات التسبيح، جلسات الأذكار، الاسم، والتفضيلات"
        scrollable={false}
      >
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          <AppText tone="muted" style={{ fontSize: 13, lineHeight: 21 }}>
            سيظل المحتوى (الأدعية والأذكار) متاحًا لأنه جزء من التطبيق نفسه.
          </AppText>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="ghost"
                fullWidth
                label="إلغاء"
                accessibilityLabel="إلغاء"
                onPress={() => setConfirmReset(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="destructive"
                fullWidth
                loading={resetting}
                label="نعم، احذف"
                accessibilityLabel="تأكيد الحذف"
                onPress={() => void onReset()}
              />
            </View>
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}

import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Progress';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextField } from '@/components/ui/Controls';
import { SettingsRow, SettingsSection, FutureTag } from '@/components/ui/SettingsRow';
import { OfflineBanner } from '@/components/ui/StateViews';
import { DuaaMark } from '@/components/brand/DuaaLogo';
import { useToast } from '@/components/ui/Toast';

import { useUserProfile } from '@/features/user/useUserProfile';
import { useAuthStore } from '@/store/authStore';
import { services } from '@/services/registry';

/**
 * حسابي.
 *
 * Real local profile: editable display name, live stats from the on-device
 * stores, and settings shortcuts. The sign-in row is honest — with no auth
 * backend configured it explains the state and offers the Google button only
 * when a backend exists (no simulated sign-in, ever).
 */
export default function ProfileScreen() {
  const theme = useAppTheme();
  const toast = useToast();
  const { profile, stats, loading, saveDisplayName } = useUserProfile();
  const authStatus = useAuthStore((state) => state.status);
  const authUser = useAuthStore((state) => state.user);
  const isConfigured = useAuthStore((state) => state.isConfigured);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);

  const displayName = profile?.displayName?.trim();
  const initials = displayName ? displayName.charAt(0) : 'د';

  const signInWithGoogle = useCallback(async () => {
    const result = await services.auth().signInWithProvider('google');
    if (!result.ok) {
      toast.show(result.error.userMessage, 'error');
      return;
    }
    toast.show('تم تسجيل الدخول', 'success');
  }, [toast]);

  return (
    <Screen scroll edges={['top', 'left', 'right']} testID="profile-screen">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader
          title="حسابي"
          canGoBack={false}
          actions={
            <IconButton
              icon="settings-outline"
              accessibilityLabel="الإعدادات"
              onPress={() => router.push('/settings')}
            />
          }
        />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
        <OfflineBanner />

        {/* Identity */}
        <Card padding={theme.spacing.xl}>
          <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: theme.radii.pill,
                backgroundColor: theme.colors.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityElementsHidden
            >
              <AppText variant="scriptureTitle" style={{ fontSize: 34, color: theme.colors.primary }}>
                {initials}
              </AppText>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              {loading ? (
                <Skeleton width={120} height={18} />
              ) : (
                <AppText variant="heading">{displayName || 'ضيف دعاء'}</AppText>
              )}
              <AppText tone="subtle" style={{ fontSize: 12 }}>
                {authStatus === 'authenticated' && authUser?.email
                  ? authUser.email
                  : 'الملف محفوظ على جهازك فقط'}
              </AppText>
            </View>
            <Button
              variant="outline"
              size="sm"
              label="تعديل الاسم"
              accessibilityLabel="تعديل الاسم"
              onPress={() => {
                setDraftName(displayName ?? '');
                setEditing(true);
              }}
            />
          </View>
        </Card>

        {/* Stats */}
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">إحصاءاتك</AppText>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <StatCard label="المفضلة" value={stats?.favoriteCount} icon="heart-outline" />
            <StatCard label="تسبيحات" value={stats?.tasbeehTotal} icon="repeat-outline" />
            <StatCard label="جلسات مكتملة" value={stats?.azkarSessionsCompleted} icon="checkmark-circle-outline" />
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Chip icon="flame-outline" label={`تتابع حالي: ${stats?.currentStreakDays ?? 0} يوم`} />
            <Chip icon="trophy-outline" label={`أطول تتابع: ${stats?.longestStreakDays ?? 0} يوم`} />
          </View>
        </View>

        {/* Account */}
        <SettingsSection title="الحساب">
          {isConfigured ? (
            authStatus === 'authenticated' ? (
              <SettingsRow
                icon="person-circle-outline"
                title={authUser?.email ?? 'حساب مرتبط'}
                subtitle="مسجّل الدخول"
                onPress={() => router.push('/settings/account')}
              />
            ) : (
              <SettingsRow
                icon="logo-google"
                title="تسجيل الدخول بـ Google"
                subtitle="لمزامنة المفضلة والتسبيح"
                onPress={() => void signInWithGoogle()}
              />
            )
          ) : (
            <View
              style={{
                gap: theme.spacing.sm,
                padding: theme.spacing.lg,
                alignItems: 'flex-start',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.textMuted} />
                <AppText weight="medium" style={{ fontSize: 13.5 }}>
                  تسجيل الدخول غير مُفعّل بعد
                </AppText>
                <FutureTag />
              </View>
              <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }}>
                خدمة الحساب جاهزة في الكود لكنها تنتظر ربط Firebase Auth. حتى ذلك الحين يبقى ملفك
                وإحصاءاتك ومفضلتك محفوظة على هذا الجهاز فقط — ولن يعرض التطبيق زر دخول وهميًا.
              </AppText>
              <AppText
                tone="primary"
                weight="medium"
                style={{ fontSize: 12.5 }}
                onPress={() => router.push('/settings/account')}
                accessibilityRole="button"
                accessibilityLabel="تفاصيل الحساب"
              >
                التفاصيل ←
              </AppText>
            </View>
          )}
          <SettingsRow
            icon="settings-outline"
            title="الإعدادات"
            subtitle="المظهر، التذكيرات، اللغة"
            onPress={() => {
              void services.analytics().screen('settings');
              router.push('/settings');
            }}
          />
        </SettingsSection>

        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <DuaaMark size={28} />
          <AppText tone="subtle" style={{ fontSize: 11.5 }}>
            دعاء — يعمل دون إنترنت، بلا إعلانات، بلا تتبع.
          </AppText>
        </View>
      </View>

      <BottomSheet
        visible={editing}
        onDismiss={() => setEditing(false)}
        title="اسمك في دعاء"
        subtitle="يُحفظ على جهازك ويظهر في الترحيب"
        scrollable={false}
      >
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          <TextField
            value={draftName}
            onChangeText={setDraftName}
            label="الاسم"
            placeholder="مثال: أبو يوسف"
            maxLength={40}
            autoFocus
            accessibilityLabel="اسمك في دعاء"
          />
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="ghost"
                fullWidth
                label="إلغاء"
                accessibilityLabel="إلغاء"
                onPress={() => setEditing(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                fullWidth
                loading={saving}
                label="حفظ"
                accessibilityLabel="حفظ الاسم"
                onPress={async () => {
                  setSaving(true);
                  const saved = await saveDisplayName(draftName);
                  setSaving(false);
                  if (saved) {
                    setEditing(false);
                    toast.show('تم تحديث الاسم', 'success');
                  } else {
                    toast.show('تعذّر حفظ الاسم', 'error');
                  }
                }}
              />
            </View>
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | undefined;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useAppTheme();
  return (
    <Card variant="outline" padding={theme.spacing.md} style={{ flex: 1 }}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
        {value === undefined ? (
          <Skeleton width={32} height={20} />
        ) : (
          <AppText variant="scriptureTitle" style={{ fontSize: 22, color: theme.colors.primary }}>
            {value}
          </AppText>
        )}
        <AppText tone="subtle" style={{ fontSize: 11.5 }} numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </Card>
  );
}

import { useCallback, useMemo, useState } from 'react';
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
import { useI18n } from '@/core/i18n/I18nProvider';
import type { Translate } from '@/core/i18n/options';

/** Provider names, resolved per render so they follow the active language. */
function buildProviderLabels(t: Translate): Record<string, string> {
  return {
    google: t('settings.account.provider.google'),
    apple: t('settings.account.provider.apple'),
    email: t('settings.account.provider.email'),
    anonymous: t('settings.account.guest'),
  };
}

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
  const { t, tp } = useI18n();
  const providerLabels = useMemo(() => buildProviderLabels(t), [t]);
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
        toast.show(t('settings.account.signedIn'), 'success');
      } else {
        toast.show(result.error.userMessage, 'error');
      }
    },
    [auth, toast, t],
  );

  const signOut = useCallback(async () => {
    setBusy(true);
    const result = await auth.signOut();
    setBusy(false);
    toast.show(result.ok ? t('settings.account.signedOut') : result.error.userMessage, result.ok ? 'success' : 'error');
  }, [auth, toast, t]);

  const deleteAccount = useCallback(async () => {
    setBusy(true);
    const result = await auth.deleteAccount();
    setBusy(false);
    setConfirmDelete(false);
    toast.show(result.ok ? t('settings.account.deleted') : result.error.userMessage, result.ok ? 'success' : 'error');
  }, [auth, toast, t]);

  return (
    <Screen scroll testID="settings-account">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title={t('settings.account.screenTitle')} />
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
                  ? user?.email
                    ? t('settings.account.signedInWithEmail', { email: user.email })
                    : t('settings.account.signedIn')
                  : status === 'unavailable'
                    ? t('settings.account.notConfigured')
                    : t('settings.account.checking')}
              </AppText>
            </View>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }}>
              {isConfigured
                ? t('settings.account.sessionNote')
                : t('settings.account.localOnly', {
                    suffix: profile?.displayName ? t('settings.account.localSuffix', { name: profile.displayName }) : '',
                  })}
            </AppText>
          </View>
        </Card>

        {isConfigured ? (
          status === 'authenticated' ? (
            <SettingsSection title={t('settings.account.sessionSection')}>
              <SettingsRow icon="mail-outline" title={user?.email ?? t('settings.account.unknownEmail')} subtitle={user?.provider ? (providerLabels[user.provider] ?? user.provider) : undefined} />
              <SettingsRow icon="shield-checkmark-outline" title={t('settings.account.emailVerification')} subtitle={user?.emailVerified ? t('settings.account.verified') : t('settings.account.notVerified')} />
              <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
                <Button variant="outline" size="md" loading={busy} accessibilityLabel={t('settings.account.signOut')} onPress={() => void signOut()} label={t('settings.account.signOut')} />
                <Button variant="destructive" size="md" accessibilityLabel={t('settings.account.deleteAccount')} onPress={() => setConfirmDelete(true)} label={t('settings.account.deleteAccountA11y')} />
              </View>
            </SettingsSection>
          ) : (
            <SettingsSection title={t('settings.account.signIn')} description={t('settings.account.signInNote')}>
              {auth.supportedProviders.map((provider) => (
                <SettingsRow
                  key={provider}
                  icon={provider === 'google' ? 'logo-google' : provider === 'apple' ? 'logo-apple' : 'mail-outline'}
                  title={t('settings.account.signInWith', { provider: providerLabels[provider] ?? provider })}
                  subtitle={t('settings.account.needsInternetOnce')}
                  onPress={() => void signIn(provider === 'google' || provider === 'apple' ? provider : 'anonymous')}
                />
              ))}
            </SettingsSection>
          )
        ) : (
          <SettingsSection
            title={t('settings.account.whatChanges')}
            description={t('settings.account.whatChangesNote')}
          >
            {[
              { icon: 'logo-google' as const, title: t('settings.account.benefit.google'), body: t('settings.account.benefit.googleBody') },
              { icon: 'cloud-upload-outline' as const, title: t('settings.account.benefit.backup'), body: t('settings.account.benefit.backupBody') },
              { icon: 'people-outline' as const, title: t('settings.account.benefit.community'), body: t('settings.account.benefit.communityBody') },
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

        <SettingsSection title={t('settings.account.localData')}>
          <SettingsRow icon="heart-outline" title={t('settings.account.stat.favorites')} value={String(stats?.favoriteCount ?? 0)} />
          <SettingsRow icon="repeat-outline" title={t('settings.account.stat.tasbeeh')} value={String(stats?.tasbeehTotal ?? 0)} />
          <SettingsRow icon="checkmark-circle-outline" title={t('settings.account.stat.sessions')} value={String(stats?.azkarSessionsCompleted ?? 0)} />
          <SettingsRow icon="flame-outline" title={t('settings.account.stat.streak')} value={tp('common.days', stats?.currentStreakDays ?? 0)} />
        </SettingsSection>

        <AppText tone="subtle" style={{ fontSize: 11.5, lineHeight: 18 }}>
          {t('settings.account.contactSupport', { email: config.supportEmail })}
        </AppText>
      </View>

      <BottomSheet
        visible={confirmDelete}
        onDismiss={() => setConfirmDelete(false)}
        title={t('settings.account.deleteAccount')}
        subtitle={t('settings.account.deleteIrreversible')}
        scrollable={false}
      >
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          <AppText tone="muted" style={{ fontSize: 13, lineHeight: 21 }}>
            {t('settings.account.deleteBody')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="ghost"
                fullWidth
                label={t('common.cancel')}
                accessibilityLabel={t('common.cancel')}
                onPress={() => setConfirmDelete(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="destructive"
                fullWidth
                loading={busy}
                label={t('settings.account.deleteConfirm')}
                accessibilityLabel={t('settings.account.deleteConfirmA11y')}
                onPress={() => void deleteAccount()}
              />
            </View>
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}

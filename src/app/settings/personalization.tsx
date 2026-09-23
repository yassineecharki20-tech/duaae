import { useMemo } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Segmented } from '@/components/ui/Controls';
import { SettingsRow, SettingsSection } from '@/components/ui/SettingsRow';
import { useToast } from '@/components/ui/Toast';

import {
  accentOptions,
  appearanceOptions,
  cardStyleOptions,
  densityOptions,
  fontProfileOptions,
  paletteOptions,
  textSizeOptions,
} from '@/core/i18n/options';
import { ACCENT_SEEDS, PALETTE_SEEDS } from '@/design/tokens/palettes';
import type { ReadingScale } from '@/design/tokens/typography';
import { useSettingsStore } from '@/store/settingsStore';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';
import { useI18n } from '@/core/i18n/I18nProvider';

/**
 * Personalization.
 *
 * Theme mode, palette, accent colour, typography profile, text size, reading
 * density, card style and a high-readability switch. Every control writes one
 * field of the single `AppPreferences` object, and the theme provider rebuilds
 * the theme from it — so each change is visible immediately, in both light and
 * dark mode, and survives a restart.
 *
 * The palettes are calm, low-saturation seeds (derived in
 * `design/tokens/palettes.ts`) rather than bright decorative colours, and the
 * accent is contrast-checked against the surface it sits on.
 */
export default function PersonalizationScreen() {
  const theme = useAppTheme();
  const toast = useToast();
  const { t } = useI18n();

  const preferences = useSettingsStore((state) => state.preferences);
  const setAppearance = useSettingsStore((state) => state.setAppearance);
  const setPalette = useSettingsStore((state) => state.setPalette);
  const setAccent = useSettingsStore((state) => state.setAccent);
  const setFontProfile = useSettingsStore((state) => state.setFontProfile);
  const setReadingScale = useSettingsStore((state) => state.setReadingScale);
  const setDensity = useSettingsStore((state) => state.setDensity);
  const setCardStyle = useSettingsStore((state) => state.setCardStyle);
  const setHighReadability = useSettingsStore((state) => state.setHighReadability);
  const resetAppearancePreferences = useSettingsStore((state) => state.resetAppearancePreferences);

  const scheme = theme.scheme;
  const themeChoices = useMemo(() => appearanceOptions(t), [t]);
  const sizeChoices = useMemo(() => textSizeOptions(t), [t]);
  const densityChoices = useMemo(() => densityOptions(t), [t]);
  const fontChoices = useMemo(() => fontProfileOptions(t), [t]);
  const cardChoices = useMemo(() => cardStyleOptions(t), [t]);

  const paletteChips = useMemo(
    () =>
      paletteOptions(t).map((option) => ({
        value: option.value,
        label: option.label,
        color: PALETTE_SEEDS[option.value][scheme].primary,
      })),
    [scheme, t],
  );

  const accentChips = useMemo(
    () =>
      accentOptions(t).map((option) => ({
        value: option.value,
        label: option.label,
        color: ACCENT_SEEDS[option.value][scheme],
      })),
    [scheme, t],
  );

  const track = (setting: string, value: string | boolean) => {
    void services
      .analytics()
      .track({ name: AnalyticsEvents.settingChanged, params: { setting, value } });
  };

  return (
    <Screen scroll testID="settings-personalization">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title={t('settings.personalization.screenTitle')} />
      </View>

      <View
        style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
      >
        <SettingsSection
          title={t('settings.personalization.themeSection')}
          description={t('settings.personalization.themeNote')}
        >
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <Segmented
              options={themeChoices}
              value={preferences.appearance}
              onChange={(value) => {
                setAppearance(value as typeof preferences.appearance);
                track('appearance', value);
              }}
              accessibilityLabel={t('settings.appearance.themeA11y')}
              testID="personalization-theme"
            />
          </View>
        </SettingsSection>

        <SettingsSection
          title={t('settings.personalization.paletteSection')}
          description={t('settings.personalization.paletteNote')}
        >
          <View style={{ padding: theme.spacing.lg }}>
            <ChoiceChips
              items={paletteChips}
              value={preferences.palette}
              onChange={(value) => {
                setPalette(value);
                track('palette', value);
              }}
              accessibilityLabel={t('settings.personalization.paletteA11y')}
              columns={2}
              testID="personalization-palette"
            />
          </View>
        </SettingsSection>

        <SettingsSection
          title={t('settings.personalization.accentSection')}
          description={t('settings.personalization.accentNote')}
        >
          <View style={{ padding: theme.spacing.lg }}>
            <ChoiceChips
              items={accentChips}
              value={preferences.accent}
              onChange={(value) => {
                setAccent(value);
                track('accent', value);
              }}
              accessibilityLabel={t('settings.personalization.accentA11y')}
              variant="swatch"
              columns={6}
              testID="personalization-accent"
            />
          </View>
        </SettingsSection>

        <SettingsSection
          title={t('settings.personalization.fontSection')}
          description={t('settings.personalization.fontNote')}
        >
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <ChoiceChips
              items={fontChoices}
              value={preferences.fontProfile}
              onChange={(value) => {
                setFontProfile(value);
                track('font_profile', value);
              }}
              accessibilityLabel={t('settings.personalization.fontA11y')}
              columns={2}
              testID="personalization-font"
            />
          </View>
        </SettingsSection>

        <SettingsSection title={t('settings.appearance.textSize')}>
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <Segmented
              options={sizeChoices}
              value={preferences.readingScale}
              onChange={(value) => {
                setReadingScale(value as ReadingScale);
                track('reading_scale', value);
              }}
              accessibilityLabel={t('settings.appearance.textSizeA11y')}
              testID="personalization-text-size"
            />
          </View>
        </SettingsSection>

        <SettingsSection
          title={t('settings.appearance.reading')}
          description={t('settings.appearance.densityNote')}
        >
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <Segmented
              options={densityChoices}
              value={preferences.density}
              onChange={(value) => {
                setDensity(value as typeof preferences.density);
                track('reading_density', value);
              }}
              accessibilityLabel={t('settings.appearance.densityA11y')}
              testID="personalization-density"
            />
          </View>
        </SettingsSection>

        <SettingsSection
          title={t('settings.appearance.cardStyle')}
          description={t('settings.appearance.cardStyleNote')}
        >
          <View style={{ padding: theme.spacing.lg }}>
            <ChoiceChips
              items={cardChoices}
              value={preferences.cardStyle}
              onChange={(value) => {
                setCardStyle(value);
                track('card_style', value);
              }}
              accessibilityLabel={t('settings.appearance.cardStyleA11y')}
              columns={3}
              testID="personalization-card-style"
            />
          </View>
        </SettingsSection>

        <SettingsSection title={t('settings.personalization.previewTitle')}>
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <Card variant="muted" padding={Math.round(theme.spacing.lg * theme.card.paddingScale)}>
              <View style={{ gap: theme.density.paragraphGap }}>
                <AppText weight="semiBold" style={{ fontSize: 15 }}>
                  {t('settings.personalization.previewTitle')}
                </AppText>
                <AppText variant="scripture" align="center">
                  {t('settings.appearance.previewText')}
                </AppText>
                <AppText tone="muted" style={{ fontSize: 13 }}>
                  {t('app.tagline')}
                </AppText>
              </View>
            </Card>
            <SettingsRow
              icon="eye-outline"
              title={t('settings.appearance.highReadability')}
              subtitle={t('settings.appearance.highReadabilityNote')}
              switchValue={preferences.highReadability}
              onSwitchChange={(next) => {
                setHighReadability(next);
                track('high_readability', next);
              }}
            />
            <Button
              variant="secondary"
              size="md"
              fullWidth
              label={t('settings.personalization.reset')}
              accessibilityLabel={t('settings.personalization.reset')}
              onPress={() => {
                resetAppearancePreferences();
                track('personalization_reset', true);
                toast.show(t('settings.personalization.resetDone'), 'success');
              }}
            />
          </View>
        </SettingsSection>
      </View>
    </Screen>
  );
}

import { forwardRef, useEffect, useMemo } from 'react';
import { View } from 'react-native';

import type { Dua } from '@/core/types/domain';
import { useAppTheme } from '@/design/theme/ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { DuaaMark } from '@/components/brand/DuaaLogo';
import { formatSources } from '@/features/share/shareText';
import { registerCardRef } from '@/features/share/cardCaptureRegistry';
import { computeShareCardLayout } from '@/features/share/shareCardLayout';
import { useI18n } from '@/core/i18n/I18nProvider';

export interface ShareCardViewProps {
  dua: Dua;
  categoryTitle?: string;
  scheme?: 'light' | 'dark';
}

/**
 * The share card as a live React Native view.
 *
 * It is what the user previews in the share sheet and, on native, the exact
 * surface `react-native-view-shot` rasterises — so preview and output match.
 * Geometry is shared with the web canvas renderer through
 * `computeShareCardLayout`.
 */
export const ShareCardView = forwardRef<View, ShareCardViewProps>(function ShareCardView(
  { dua, categoryTitle, scheme },
  ref,
) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const effectiveScheme = scheme ?? (theme.isDark ? 'dark' : 'light');
  const layout = useMemo(() => computeShareCardLayout(dua, { scheme: effectiveScheme }), [dua, effectiveScheme]);
  const { palette } = layout;

  // Register for native capture while mounted.
  useEffect(() => {
    if (!ref || typeof ref !== 'object' || !('current' in ref)) return undefined;
    return registerCardRef(ref.current);
  }, [ref]);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        backgroundColor: palette.background,
        borderWidth: 1,
        borderColor: palette.frame,
        borderRadius: theme.radii.lg,
        overflow: 'hidden',
        padding: 22,
        gap: 14,
      }}
      accessibilityLabel={t('share.cardA11y', { text: dua.text })}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', gap: 6, paddingTop: 10 }}>
        <DuaaMark size={44} color={palette.gold} accent={palette.gold} />
        <AppText
          variant="scriptureTitle"
          style={{ color: palette.ink, fontSize: 34, lineHeight: 44 }}
        >
          {t('share.cardTitle')}
        </AppText>
        <View style={{ width: 74, height: 2, backgroundColor: palette.gold, borderRadius: 2 }} />
        <AppText weight="medium" style={{ color: palette.gold, fontSize: 11, letterSpacing: 4 }}>
          DUAA
        </AppText>
      </View>

      {/* Body */}
      <View style={{ gap: 10, paddingVertical: 6 }}>
        {dua.title ? (
          <AppText variant="scriptureTitle" align="center" style={{ color: palette.gold, fontSize: 17 }}>
            ﴿ {dua.title} ﴾
          </AppText>
        ) : null}
        <AppText
          variant="scripture"
          align="center"
          style={{ color: palette.ink, fontSize: Math.min(layout.fontSize * 0.42, 21), lineHeight: Math.min(layout.fontSize * 0.42, 21) * 2 }}
        >
          {dua.text}
        </AppText>
        {dua.virtue ? (
          <AppText align="center" style={{ color: palette.muted, fontSize: 12, lineHeight: 20 }}>
            {dua.virtue}
          </AppText>
        ) : null}
      </View>

      {/* Footer */}
      <View style={{ alignItems: 'center', gap: 8, paddingTop: 4 }}>
        {dua.sources.length > 0 ? (
          <View
            style={{
              backgroundColor: palette.chipBackground,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 6,
              maxWidth: '100%',
            }}
          >
            <AppText align="center" style={{ color: palette.muted, fontSize: 11 }} numberOfLines={2}>
              {t('duas.source.label', { text: formatSources(dua) })}
            </AppText>
          </View>
        ) : null}
        {categoryTitle ? (
          <AppText style={{ color: palette.muted, fontSize: 11 }}>{categoryTitle}</AppText>
        ) : null}
        <View
          style={{
            height: 1,
            alignSelf: 'stretch',
            backgroundColor: palette.frame,
            marginVertical: 2,
          }}
        />
        <AppText weight="medium" style={{ color: palette.gold, fontSize: 11 }}>
          {t('share.cardTagline')}
        </AppText>
      </View>

    </View>
  );
});

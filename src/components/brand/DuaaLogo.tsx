import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, Mask, Text as SvgText } from 'react-native-svg';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { maskHide, maskReveal } from '@/design/tokens';
import { useI18n } from '@/core/i18n/I18nProvider';

export interface DuaaMarkProps {
  /** Side of the square mark in logical pixels. */
  size?: number;
  color?: string;
  accent?: string;
}

/**
 * The DUAA mark as live vector: a thin crescent with a single gold point.
 * Mirrors `scripts/generate-brand-assets.mjs` exactly so raster and vector
 * branding can never drift apart.
 */
export const DuaaMark = memo(function DuaaMark({ size = 40, color, accent }: DuaaMarkProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const ink = color ?? theme.colors.primary;
  const gold = accent ?? theme.colors.accent;
  const maskId = `crescent-${size}-${ink.replace('#', '')}`;

  const r = 22;
  const cx = 24;
  const cy = 24;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel={t('app.logoA11y')} role="img">
      <Defs>
        <Mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
          <Circle cx={cx} cy={cy} r={r} fill={maskReveal} />
          <Circle cx={cx + r * 0.4} cy={cy - r * 0.4} r={r * 0.9} fill={maskHide} />
        </Mask>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} fill={ink} mask={`url(#${maskId})`} />
      <Circle cx={cx + r * 0.62} cy={cy - r * 0.62} r={r * 0.16} fill={gold} />
    </Svg>
  );
});

export interface DuaaWordmarkProps {
  /** Height of the lockup in logical pixels. */
  size?: number;
  color?: string;
  accent?: string;
  /** Show the small "DUAA" line under the wordmark. */
  showLatin?: boolean;
}

/** Vertical lockup: crescent + «دعاء» + rule + DUAA. */
export const DuaaWordmark = memo(function DuaaWordmark({
  size = 120,
  color,
  accent,
  showLatin = true,
}: DuaaWordmarkProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const ink = color ?? theme.colors.text;
  const gold = accent ?? theme.colors.accent;
  const width = size;
  const height = size * (showLatin ? 1.0 : 0.86);
  const maskId = `lockup-${size}-${ink.replace('#', '')}`;

  return (
    <Svg width={width} height={height} viewBox="0 0 200 200" accessibilityLabel={t('app.logoWordmarkA11y')} role="img">
      <Defs>
        <Mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <Circle cx={100} cy={42} r={26} fill={maskReveal} />
          <Circle cx={110.4} cy={31.6} r={23.4} fill={maskHide} />
        </Mask>
      </Defs>
      <Circle cx={100} cy={42} r={26} fill={gold} mask={`url(#${maskId})`} />
      <Circle cx={116.1} cy={25.9} r={4.2} fill={gold} />
      <SvgText
        x={100}
        y={128}
        fontSize={64}
        fill={ink}
        textAnchor="middle"
        fontFamily={theme.fontFamilies.scripture.bold}
      >
        {t('app.name')}
      </SvgText>
      {showLatin ? (
        <>
          <Line x1={70} y1={146} x2={130} y2={146} stroke={gold} strokeWidth={2} strokeLinecap="round" />
          <SvgText
            x={100}
            y={172}
            fontSize={15}
            fill={gold}
            textAnchor="middle"
            letterSpacing={6}
            fontFamily={theme.fontFamilies.ui.medium}
          >
            DUAA
          </SvgText>
        </>
      ) : null}
    </Svg>
  );
});

/** Mark + word side by side, used in compact headers. */
export const DuaaInlineLogo = memo(function DuaaInlineLogo({ size = 28 }: { size?: number }) {
  const theme = useAppTheme();
  const { t } = useI18n();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <DuaaMark size={size} />
      <View style={{ gap: 0 }}>
        <View
          style={{
            height: size * 0.72,
            justifyContent: 'center',
          }}
        >
          <Svg width={size * 2.1} height={size * 0.72} viewBox="0 0 84 29" role="img" accessibilityLabel={t('app.name')}>
            <SvgText
              x={42}
              y={24}
              fontSize={26}
              fill={theme.colors.text}
              textAnchor="middle"
              fontFamily={theme.fontFamilies.scripture.bold}
                  >
              {t('app.name')}
            </SvgText>
          </Svg>
        </View>
      </View>
    </View>
  );
});

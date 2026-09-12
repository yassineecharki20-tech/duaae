import { memo } from 'react';
import Svg, { Circle, Defs, Line, Mask, Path, Rect } from 'react-native-svg';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { maskHide, maskReveal } from '@/design/tokens';

export type IllustrationKind = 'rhythm' | 'library' | 'reminder' | 'share';

export interface IllustrationProps {
  kind: IllustrationKind;
  size?: number;
}

/**
 * Onboarding illustrations — pure geometry in brand colors.
 * No clipart, no gradients-for-the-sake-of-it: one idea per slide, drawn with
 * the same crescent language as the logo.
 */
export const Illustration = memo(function Illustration({ kind, size = 220 }: IllustrationProps) {
  const theme = useAppTheme();
  const primary = theme.colors.primary;
  const gold = theme.colors.accent;
  const muted = theme.colors.borderStrong;
  const surface = theme.colors.surfaceMuted;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityElementsHidden>
      <Defs>
        <Mask id={`il-${kind}`} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <Rect width="200" height="200" fill={maskReveal} />
        </Mask>
      </Defs>
      <Circle cx="100" cy="100" r="86" fill={surface} />

      {kind === 'rhythm' ? (
        <>
          {/* sun + moon orbiting a day ring */}
          <Circle cx="100" cy="100" r="52" fill="none" stroke={muted} strokeWidth="1.5" strokeDasharray="3 6" />
          <Circle cx="100" cy="48" r="16" fill={gold} />
          <Circle cx="146" cy="128" r="14" fill={primary} mask={`url(#il-${kind}-moon)`} />
          <Defs>
            <Mask id={`il-${kind}-moon`} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
              <Circle cx="146" cy="128" r="14" fill={maskReveal} />
              <Circle cx="152" cy="122" r="12.6" fill={maskHide} />
            </Mask>
          </Defs>
          <Line x1="70" y1="100" x2="130" y2="100" stroke={primary} strokeWidth="2" strokeLinecap="round" />
          <Line x1="80" y1="112" x2="120" y2="112" stroke={muted} strokeWidth="2" strokeLinecap="round" />
        </>
      ) : null}

      {kind === 'library' ? (
        <>
          {/* open book */}
          <Path d="M100 66 C 82 54, 62 54, 50 60 L 50 132 C 62 126, 82 126, 100 138 Z" fill={primary} />
          <Path d="M100 66 C 118 54, 138 54, 150 60 L 150 132 C 138 126, 118 126, 100 138 Z" fill={theme.colors.surface} stroke={primary} strokeWidth="1.5" />
          <Line x1="110" y1="80" x2="140" y2="76" stroke={muted} strokeWidth="2" strokeLinecap="round" />
          <Line x1="110" y1="94" x2="140" y2="90" stroke={muted} strokeWidth="2" strokeLinecap="round" />
          <Line x1="110" y1="108" x2="132" y2="105" stroke={gold} strokeWidth="2" strokeLinecap="round" />
          <Circle cx="100" cy="152" r="4" fill={gold} />
        </>
      ) : null}

      {kind === 'reminder' ? (
        <>
          {/* bell + quiet rings */}
          <Circle cx="100" cy="100" r="40" fill="none" stroke={gold} strokeWidth="1.5" opacity="0.5" />
          <Circle cx="100" cy="100" r="56" fill="none" stroke={gold} strokeWidth="1" opacity="0.28" />
          <Path d="M100 62 c -16 0 -24 12 -24 26 c 0 12 -4 16 -8 20 h 64 c -4 -4 -8 -8 -8 -20 c 0 -14 -8 -26 -24 -26 Z" fill={primary} />
          <Circle cx="100" cy="118" r="6" fill={gold} />
          <Line x1="100" y1="50" x2="100" y2="58" stroke={primary} strokeWidth="3" strokeLinecap="round" />
        </>
      ) : null}

      {kind === 'share' ? (
        <>
          {/* three connected nodes */}
          <Line x1="100" y1="70" x2="66" y2="122" stroke={muted} strokeWidth="2" />
          <Line x1="100" y1="70" x2="134" y2="122" stroke={muted} strokeWidth="2" />
          <Line x1="66" y1="122" x2="134" y2="122" stroke={muted} strokeWidth="2" />
          <Circle cx="100" cy="70" r="16" fill={primary} />
          <Circle cx="66" cy="122" r="12" fill={surface} stroke={primary} strokeWidth="2" />
          <Circle cx="134" cy="122" r="12" fill={surface} stroke={gold} strokeWidth="2" />
          <Circle cx="100" cy="70" r="5" fill={gold} />
        </>
      ) : null}
    </Svg>
  );
});

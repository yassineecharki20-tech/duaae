import { memo, useMemo } from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { fontSizes, letterSpacing, type FontSizeToken } from '@/design/tokens/typography';

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'callout'
  | 'caption'
  | 'scripture'
  | 'scriptureTitle';

export type TextWeight = 'regular' | 'medium' | 'semiBold' | 'bold';

export interface AppTextProps extends Omit<TextProps, 'style'> {
  variant?: TextVariant;
  weight?: TextWeight;
  /** Overrides the variant color. Prefer semantic names. */
  tone?: 'default' | 'muted' | 'subtle' | 'primary' | 'accent' | 'inverse' | 'error' | 'success';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  selectable?: boolean;
  style?: StyleProp<TextStyle>;
}

const VARIANT_SIZE: Record<TextVariant, FontSizeToken> = {
  display: 'hero',
  title: 'title1',
  heading: 'title2',
  body: 'body',
  callout: 'callout',
  caption: 'footnote',
  scripture: 'callout',
  scriptureTitle: 'title3',
};

/**
 * The only text component in the app.
 *
 * Everything typographic funnels through here so the accessibility font scale,
 * the user's text size and density, the active typography profile and the
 * Arabic face choices are applied exactly once. Scripture variants stay
 * right-to-left (the texts are always Arabic); interface text is `auto`, so it
 * follows whichever language the interface is in.
 *
 * `role`-correct accessibility props are forwarded untouched.
 */
export const AppText = memo(function AppText({
  variant = 'body',
  weight = 'regular',
  tone = 'default',
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  const theme = useAppTheme();

  const textStyle = useMemo<TextStyle>(() => {
    const colors = theme.colors;
    const toneColor =
      tone === 'muted'
        ? colors.textMuted
        : tone === 'subtle'
          ? colors.textSubtle
          : tone === 'primary'
            ? colors.primary
            : tone === 'accent'
              ? colors.accent
              : tone === 'inverse'
                ? colors.textInverse
                : tone === 'error'
                  ? colors.error
                  : tone === 'success'
                    ? colors.success
                    : colors.text;

    if (variant === 'scripture' || variant === 'scriptureTitle') {
      const scripture = theme.scripture(variant === 'scriptureTitle' ? 'bold' : 'regular');
      return {
        fontFamily: scripture.fontFamily,
        fontSize: variant === 'scriptureTitle' ? scripture.fontSize * 1.12 : scripture.fontSize,
        lineHeight:
          variant === 'scriptureTitle'
            ? Math.round(scripture.fontSize * 1.6)
            : scripture.lineHeight,
        color: colors.textScripture,
        writingDirection: 'rtl',
        ...(align ? { textAlign: align } : null),
      };
    }

    const sizeToken = VARIANT_SIZE[variant];
    const base = theme.typography[sizeToken];
    const isTitle = variant === 'display' || variant === 'title' || variant === 'heading';
    // Families come from the active typography profile, not from the token
    // table, so the user's font choice reaches every label in the app.
    const ui = theme.fontFamilies.ui;
    const family = isTitle
      ? theme.fontProfile.display.bold
      : (ui[weight] ?? ui.regular);

    return {
      fontFamily: family,
      fontSize: base.fontSize,
      // `base.lineHeight` already carries the profile's body/tight rhythm.
      lineHeight: base.lineHeight,
      letterSpacing: variant === 'caption' ? letterSpacing.wide : base.letterSpacing,
      color: toneColor,
      // Interface text follows the active language; `auto` also keeps mixed
      // Arabic/Latin strings (a dua title inside a French sentence) correct.
      writingDirection: 'auto',
      ...(align ? { textAlign: align } : null),
    };
  }, [theme, variant, weight, tone, align]);

  return (
    <Text
      accessibilityRole="text"
      style={[textStyle, style]}
      {...rest}
    >
      {children}
    </Text>
  );
});

export const baseFontSizes = fontSizes;

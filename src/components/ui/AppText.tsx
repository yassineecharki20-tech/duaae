import { memo, useMemo } from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { fontFamilies, fontSizes, letterSpacing, lineHeights, type FontSizeToken } from '@/design/tokens/typography';

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

const WEIGHT_FAMILY: Record<TextWeight, string> = {
  regular: fontFamilies.ui.regular,
  medium: fontFamilies.ui.medium,
  semiBold: fontFamilies.ui.semiBold,
  bold: fontFamilies.ui.bold,
};

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
 * the scripture reading scale and the Arabic face choices are applied exactly
 * once. `role`-correct accessibility props are forwarded untouched.
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

    return {
      fontFamily: WEIGHT_FAMILY[isTitle ? 'bold' : weight],
      fontSize: base.fontSize,
      lineHeight:
        variant === 'body' || variant === 'callout'
          ? Math.round(base.fontSize * lineHeights.normal)
          : Math.round(base.fontSize * lineHeights.tight),
      letterSpacing: variant === 'caption' ? letterSpacing.wide : letterSpacing.normal,
      color: toneColor,
      writingDirection: 'rtl',
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

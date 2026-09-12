/**
 * DUAA — Color primitives.
 *
 * This file contains RAW palette values only. Nothing in the app should import
 * from here directly; import the semantic tokens from `@/design/tokens` instead.
 *
 * Brand direction: Deep Emerald Green + Warm Ivory + Subtle Gold (accent only).
 */

export const emerald = {
  50: '#EDF6F1',
  100: '#D7EBE1',
  200: '#AFD7C6',
  300: '#7FBDA5',
  400: '#4F9F81',
  500: '#2A8365',
  600: '#14704F',
  700: '#0B5C41',
  800: '#084833',
  900: '#063627',
  950: '#03211A',
} as const;

export const pine = {
  400: '#3D7A6C',
  500: '#235C50',
  600: '#164A40',
  700: '#0F3A32',
  900: '#08221D',
} as const;

export const ivory = {
  50: '#FDFCF8',
  100: '#F9F6EE',
  200: '#F3EEE1',
  300: '#EAE3D2',
  400: '#DED5BF',
  500: '#CFC4AA',
} as const;

export const gold = {
  100: '#F6EBD0',
  200: '#EBD8A8',
  300: '#DDC07C',
  400: '#CBA754',
  500: '#B98F35',
  600: '#9C762A',
  700: '#7A5B21',
  900: '#3E2E11',
} as const;

export const ink = {
  900: '#0B1512',
  800: '#12211C',
  700: '#1D2F29',
  600: '#33473F',
  500: '#4C6058',
  400: '#6B7D75',
  300: '#8D9C95',
  200: '#B3BEB8',
  100: '#D8DFDA',
  50: '#EEF2EF',
} as const;

export const night = {
  950: '#060D0B',
  900: '#0A1512',
  850: '#0D1A16',
  800: '#101D19',
  750: '#14241F',
  700: '#1A2C26',
  600: '#22382F',
  500: '#2C463C',
  400: '#3B5A4E',
} as const;

export const semanticRaw = {
  errorLight: '#B42318',
  errorDark: '#F2756B',
  successLight: '#12805C',
  successDark: '#4CD3A0',
  warningLight: '#B26A00',
  warningDark: '#E5A93C',
  infoLight: '#1B6C8F',
  infoDark: '#66BEDD',
} as const;

export const neutral = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

/**
 * DUAA — Spacing, radius, sizing and motion tokens.
 *
 * A single 4pt-based scale keeps rhythm consistent across every screen and
 * makes layout maths predictable when the accessibility font scale grows.
 */

/** 4pt spacing scale. Always prefer these over magic numbers. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  section: 48,
  hero: 64,
} as const;

export type SpacingToken = keyof typeof spacing;

/** Corner radii. `pill` is used for chips and the tasbeeh counter button. */
export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;

/** Layout constants. */
export const layout = {
  /** Horizontal gutter used by every screen. */
  screenGutter: spacing.lg,
  /** Cards sit inside this maximum width so tablets/web stay readable. */
  maxContentWidth: 720,
  /** Minimum touch target — WCAG 2.5.8 / Apple HIG. */
  minTouchTarget: 44,
  /** Comfortable touch target for primary actions. */
  comfortableTouchTarget: 52,
  /** Height of the custom bottom tab bar (excludes safe-area inset). */
  tabBarHeight: 64,
  /** Height of a standard app header. */
  headerHeight: 56,
} as const;

/** Motion tokens. All of these are suppressed when `reduceMotion` is on. */
export const motion = {
  duration: {
    instant: 80,
    fast: 140,
    base: 220,
    slow: 340,
    slower: 520,
  },
  easing: {
    standard: [0.2, 0, 0, 1] as [number, number, number, number],
    emphasize: [0.2, 0, 0, 1.1] as [number, number, number, number],
    decelerate: [0, 0, 0, 1] as [number, number, number, number],
    accelerate: [0.3, 0, 1, 1] as [number, number, number, number],
  },
} as const;

export const zIndex = {
  base: 0,
  content: 1,
  header: 10,
  tabBar: 20,
  overlay: 40,
  toast: 60,
  splash: 100,
} as const;

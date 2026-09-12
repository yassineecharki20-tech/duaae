/**
 * DUAA — Brand mark constants.
 *
 * Values the logo and onboarding illustrations need that must NOT follow the
 * theme:
 *
 *   * SVG mask luminance. Inside a `<Mask>`, white reveals and black hides —
 *     these are mask semantics, not colours, so swapping them with theme
 *     surface/ink would silently break the crescent cut-out in dark mode.
 *
 * Everything else in a mark comes from the semantic theme tokens.
 */
import { fixedColors } from './themeColors';

/** Reveals the masked area (SVG mask luminance = 1). */
export const maskReveal = fixedColors.white;

/** Hides the masked area (SVG mask luminance = 0). */
export const maskHide = fixedColors.black;

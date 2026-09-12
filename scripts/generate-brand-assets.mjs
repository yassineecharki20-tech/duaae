/**
 * DUAA — Brand asset generator.
 *
 * Renders every raster brand asset (app icon, adaptive icon layers, splash,
 * favicons, monochrome themed icon) from a single set of inline SVG templates so
 * the whole brand stays pixel-consistent and regenerable.
 *
 * The mark: the word «دعاء» in Amiri Bold, crowned by a thin geometric crescent
 * and a single gold point — nothing more. Re-run with `npm run brand:generate`.
 *
 * Colors come from the same palette as `src/design/tokens/colors.ts`; keep them
 * in sync when the palette changes.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'assets', 'images');
const FONT_REGULAR = join(ROOT, 'assets', 'fonts', 'Amiri-Regular.ttf');
const FONT_BOLD = join(ROOT, 'assets', 'fonts', 'Amiri-Bold.ttf');
const FONT_UI = join(ROOT, 'assets', 'fonts', 'IBMPlexSansArabic-Medium.ttf');

/* Palette (mirrors src/design/tokens/colors.ts) */
const EMERALD = '#0B5C41';
const EMERALD_DEEP = '#063627';
const IVORY = '#F9F6EE';
const GOLD = '#CBA754';
const GOLD_DEEP = '#B98F35';
const NIGHT = '#0A1512';

const FONT_FILES = [FONT_REGULAR, FONT_BOLD, FONT_UI];

/**
 * Crescent + point mark.
 * The crescent is a circle with an offset circle subtracted via a mask.
 */
function mark({ cx, cy, r, color, pointColor = GOLD, rotate = 0 }) {
  const offset = r * 0.40;
  const cutR = r * 0.90;
  const pointX = cx + r * 0.62;
  const pointY = cy - r * 0.62;
  const id = `cr${Math.round(cx)}${Math.round(cy)}${Math.round(r)}${rotate}`;
  return `
  <g transform="rotate(${rotate} ${cx} ${cy})">
    <mask id="${id}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>
      <circle cx="${cx + offset}" cy="${cy - offset}" r="${cutR}" fill="#000"/>
    </mask>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" mask="url(#${id})"/>
    <circle cx="${pointX}" cy="${pointY}" r="${r * 0.16}" fill="${pointColor}"/>
  </g>`;
}

/** The «دعاء» wordmark. */
function wordmark({ x, y, size, color, weight = 700 }) {
  return `<text x="${x}" y="${y}" font-family="Amiri" font-weight="${weight}" font-size="${size}" fill="${color}" text-anchor="middle" direction="rtl">${'دعاء'}</text>`;
}

/** Small letterspaced Latin brand line. */
function latinLine({ x, y, size, color, letterSpacing = 8 }) {
  return `<text x="${x}" y="${y}" font-family="IBM Plex Sans Arabic" font-weight="500" font-size="${size}" fill="${color}" text-anchor="middle" letter-spacing="${letterSpacing}" direction="ltr">DUAA</text>`;
}

/** Thin divider rule used by the wordmark lockups. */
function rule({ x1, x2, y, color, width = 2 }) {
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

/** Square app icon. Full-bleed background; iOS/Android mask it themselves. */
function iconTemplate(bg) {
  const ink = bg === EMERALD || bg === NIGHT || bg === EMERALD_DEEP ? IVORY : EMERALD;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${bg}"/>
  <rect width="1024" height="1024" fill="url(#grain)"/>
  ${mark({ cx: 512, cy: 258, r: 92, color: GOLD, pointColor: GOLD, rotate: -12 })}
  ${wordmark({ x: 512, y: 618, size: 310, color: ink })}
  ${rule({ x1: 366, x2: 658, y: 692, color: GOLD, width: 4 })}
  ${latinLine({ x: 512, y: 776, size: 50, color: GOLD, letterSpacing: 26 })}
</svg>`;
}

/** Android adaptive-icon foreground: content inside the safe 66% zone. */
function adaptiveForeground() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 432 432">
  ${mark({ cx: 216, cy: 148, r: 44, color: GOLD, pointColor: GOLD })}
  ${wordmark({ x: 216, y: 286, size: 132, color: IVORY })}
  ${rule({ x1: 152, x2: 280, y: 318, color: GOLD, width: 3 })}
</svg>`;
}

/** Android monochrome (themed icon) — pure white silhouette. */
function adaptiveMonochrome() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 432 432">
  ${mark({ cx: 216, cy: 148, r: 44, color: '#FFFFFF', pointColor: '#FFFFFF' })}
  ${wordmark({ x: 216, y: 286, size: 132, color: '#FFFFFF' })}
  ${rule({ x1: 152, x2: 280, y: 318, color: '#FFFFFF', width: 3 })}
</svg>`;
}

/** Splash lockup on transparent background. */
function splashTemplate(ink) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
  ${mark({ cx: 320, cy: 160, r: 58, color: GOLD, pointColor: GOLD, rotate: -12 })}
  ${wordmark({ x: 320, y: 392, size: 190, color: ink })}
  ${rule({ x1: 228, x2: 412, y: 442, color: GOLD, width: 3 })}
  ${latinLine({ x: 320, y: 502, size: 33, color: ink === IVORY ? GOLD : GOLD_DEEP, letterSpacing: 18 })}
</svg>`;
}

/** Horizontal wordmark lockup (light / dark). */
function lockupTemplate(ink) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="320" viewBox="0 0 1024 320">
  ${mark({ cx: 512, cy: 80, r: 38, color: GOLD, pointColor: GOLD, rotate: -12 })}
  ${wordmark({ x: 512, y: 220, size: 126, color: ink })}
  ${latinLine({ x: 512, y: 282, size: 29, color: GOLD, letterSpacing: 16 })}
</svg>`;
}

/** Mark only — favicons and tiny contexts. */
function markOnly(bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  ${bg ? `<rect width="256" height="256" fill="${bg}"/>` : ''}
  ${mark({ cx: 128, cy: 118, r: 62, color: fg, pointColor: GOLD })}
  ${wordmark({ x: 128, y: 218, size: 88, color: fg })}
</svg>`;
}

/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

function render(svg, width, height = width) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
      defaultFontFamily: 'Amiri',
    },
  });
  const buffer = resvg.render().asPng();
  return buffer;
}

mkdirSync(OUT_DIR, { recursive: true });

const outputs = [
  // App icon — full bleed on brand emerald.
  ['icon.png', iconTemplate(EMERALD), 1024],
  // Splash lockups (light / dark).
  ['splash-icon.png', splashTemplate(EMERALD), 640],
  ['splash-icon-dark.png', splashTemplate(IVORY), 640],
  // Wordmark lockups.
  ['logo-light.png', lockupTemplate(EMERALD), 1024],
  ['logo-dark.png', lockupTemplate(IVORY), 1024],
  // Small / tiny contexts.
  ['icon-small.png', markOnly(EMERALD, IVORY), 256],
  ['favicon.png', markOnly(null, EMERALD), 64],
  ['favicon-32.png', markOnly(null, EMERALD), 32],
  // Android adaptive layers.
  ['android-icon-foreground.png', adaptiveForeground(), 432],
  ['android-icon-monochrome.png', adaptiveMonochrome(), 432],
  // PWA / iOS tiles.
  ['icon-night.png', iconTemplate(NIGHT), 1024],
];

for (const [name, svg, size] of outputs) {
  const buffer = render(svg, size);
  writeFileSync(join(OUT_DIR, name), buffer);
  console.log(`✓ assets/images/${name} — ${size}px, ${(buffer.length / 1024).toFixed(1)} KB`);
}

/* SVG sources kept alongside for design tools and the web share card. */
const svgDir = join(ROOT, 'assets', 'logo');
mkdirSync(svgDir, { recursive: true });
writeFileSync(join(svgDir, 'mark.svg'), markOnly(null, EMERALD));
writeFileSync(join(svgDir, 'lockup-light.svg'), lockupTemplate(EMERALD));
writeFileSync(join(svgDir, 'lockup-dark.svg'), lockupTemplate(IVORY));
writeFileSync(join(svgDir, 'icon.svg'), iconTemplate(EMERALD));
console.log('✓ assets/logo/*.svg written');

console.log('Brand assets generated.');

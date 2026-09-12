/**
 * Web share-card renderer — Canvas 2D.
 *
 * Why canvas and not "SVG in an <img>": an SVG document loaded as an image is
 * rendered in an isolated context where the page's @font-face rules do not
 * apply, which would silently fall back to a system font for Arabic. Canvas
 * draws with the document's loaded fonts (Amiri is registered by expo-font), so
 * the Arabic is shaped exactly like the app's own typography.
 */

import type { Dua } from '@/core/types/domain';
import { CARD_WIDTH, computeShareCardLayout, type ShareCardLayout } from './shareCardLayout';

export interface RenderedCard {
  dataUri: string;
  width: number;
  height: number;
}

const SCALE = 2; // render at 2x for crisp social sharing

export function renderShareCard(dua: Dua, scheme: 'light' | 'dark' = 'light'): RenderedCard {
  const layout = computeShareCardLayout(dua, { scheme });
  const canvas = document.createElement('canvas');
  canvas.width = layout.width * SCALE;
  canvas.height = layout.height * SCALE;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.scale(SCALE, SCALE);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  try {
    (ctx as CanvasRenderingContext2D & { direction: string }).direction = 'rtl';
  } catch {
    /* older engines: Arabic still shapes, alignment stays centred */
  }

  drawBackground(ctx, layout);
  drawFrame(ctx, layout);
  drawHeader(ctx, layout);
  drawDua(ctx, dua, layout);
  drawFooter(ctx, dua, layout);

  return {
    dataUri: canvas.toDataURL('image/png'),
    width: layout.width * SCALE,
    height: layout.height * SCALE,
  };
}

function drawBackground(ctx: CanvasRenderingContext2D, layout: ShareCardLayout): void {
  ctx.fillStyle = layout.palette.background;
  ctx.fillRect(0, 0, layout.width, layout.height);

  // Very soft vertical wash so the ivory is not flat.
  const gradient = ctx.createLinearGradient(0, 0, 0, layout.height);
  gradient.addColorStop(0, 'rgba(255,255,255,0.05)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.05)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, layout.width, layout.height);
}

function drawFrame(ctx: CanvasRenderingContext2D, layout: ShareCardLayout): void {
  const { frameInset: inset, palette } = layout;
  ctx.strokeStyle = palette.frame;
  ctx.lineWidth = 2;
  ctx.strokeRect(inset, inset, layout.width - inset * 2, layout.height - inset * 2);

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1;
  ctx.strokeRect(inset + 12, inset + 12, layout.width - (inset + 12) * 2, layout.height - (inset + 12) * 2);
  ctx.restore();

  // Gold corner ticks — the only ornament on the card.
  const tick = 26;
  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 3;
  const corners: [number, number, number, number][] = [
    [inset, inset, 1, 1],
    [layout.width - inset, inset, -1, 1],
    [inset, layout.height - inset, 1, -1],
    [layout.width - inset, layout.height - inset, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + sx * tick, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * tick);
    ctx.stroke();
  }
}

function drawCrescent(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  gold: string,
  background: string,
): void {
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.arc(cx + r * 0.4, cy - r * 0.4, r * 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(cx + r * 0.62, cy - r * 0.62, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

function drawHeader(ctx: CanvasRenderingContext2D, layout: ShareCardLayout): void {
  const { palette, mark } = layout;
  drawCrescent(ctx, mark.cx, mark.cy, mark.r, palette.gold, palette.background);

  ctx.fillStyle = palette.ink;
  ctx.font = '700 104px Amiri, "Noto Naskh Arabic", serif';
  ctx.fillText('دعاء', layout.width / 2, 320);

  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(layout.width / 2 - 108, 356);
  ctx.lineTo(layout.width / 2 + 108, 356);
  ctx.stroke();

  ctx.fillStyle = palette.gold;
  ctx.font = '500 30px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('D U A A', layout.width / 2, 408);
}

function drawDua(ctx: CanvasRenderingContext2D, dua: Dua, layout: ShareCardLayout): void {
  const { palette } = layout;
  ctx.fillStyle = palette.ink;
  ctx.font = `400 ${layout.fontSize}px Amiri, "Noto Naskh Arabic", serif`;

  layout.lines.forEach((line, index) => {
    const y = layout.textTop + layout.lineHeight * (index + 0.82);
    ctx.fillText(line, layout.width / 2, y);
  });
}

function drawFooter(ctx: CanvasRenderingContext2D, dua: Dua, layout: ShareCardLayout): void {
  const { palette, footerTop } = layout;

  const sourceText =
    dua.sources.length > 0
      ? `المصدر: ${dua.sources
          .map((source) =>
            source.quran
              ? `${source.book} — ${source.quran.surah} ${source.quran.ayah}`
              : `${source.book}${source.number ? ` ${source.number}` : ''}`,
          )
          .join(' · ')}`
      : null;

  if (sourceText) {
    ctx.font = '500 28px "IBM Plex Sans Arabic", sans-serif';
    const metrics = ctx.measureText(sourceText);
    const chipWidth = Math.min(layout.width - 200, metrics.width + 72);
    const chipHeight = 56;
    const chipX = layout.width / 2 - chipWidth / 2;

    ctx.fillStyle = palette.chipBackground;
    roundRect(ctx, chipX, footerTop - chipHeight + 12, chipWidth, chipHeight, 28);
    ctx.fill();

    ctx.fillStyle = palette.muted;
    ctx.fillText(sourceText, layout.width / 2, footerTop + 2);
  }

  // Branding line.
  const brandY = layout.height - layout.frameInset - 60;
  drawCrescent(ctx, layout.width / 2 - 92, brandY - 10, 14, palette.gold, palette.background);
  ctx.fillStyle = palette.gold;
  ctx.font = '500 30px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('دعاء — رفيقك اليومي للذكر', layout.width / 2 + 26, brandY);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const c = ctx as CanvasRenderingContext2D & {
    roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
  };
  if (typeof c.roundRect === 'function') {
    c.roundRect(x, y, width, height, radius);
    return;
  }
  c.beginPath();
  c.moveTo(x + radius, y);
  c.arcTo(x + width, y, x + width, y + height, radius);
  c.arcTo(x + width, y + height, x, y + height, radius);
  c.arcTo(x, y + height, x, y, radius);
  c.arcTo(x, y, x + width, y, radius);
  c.closePath();
}

export const CARD_EXPORT_WIDTH = CARD_WIDTH * SCALE;

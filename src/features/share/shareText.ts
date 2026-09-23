import type { Dua, SourceReference } from '@/core/types/domain';
import { translate, translatePlural } from '@/core/i18n/state';

/** Human-readable source line, e.g. `صحيح البخاري ٦٣٠٦` or `القرآن الكريم — البقرة ٢٥`. */
export function formatSource(reference: SourceReference): string {
  if (reference.quran) {
    return translate('duas.source.quranFull', {
      surah: reference.quran.surah,
      ayah: reference.quran.ayah,
    });
  }
  const parts = [reference.book];
  if (reference.number) parts.push(reference.number);
  if (reference.grade) parts.push(`(${reference.grade})`);
  return parts.join(' ');
}

export function formatSources(dua: Dua, separator = ' · '): string {
  return dua.sources.map(formatSource).join(separator);
}

export interface ShareTextOptions {
  /** Category display name, used as a context line. */
  categoryTitle?: string;
  /** Append the app signature. On by default. */
  includeBranding?: boolean;
}

/**
 * Plain-text share payload.
 *
 * Deliberately quiet: the supplication first, its source second (religious
 * attribution matters more than marketing), branding last and small.
 */
export function buildShareText(dua: Dua, options: ShareTextOptions = {}): string {
  const { categoryTitle, includeBranding = true } = options;
  const blocks: string[] = [];

  if (dua.title) blocks.push(`﴿ ${dua.title} ﴾`);
  blocks.push(dua.text);

  if (dua.virtue) blocks.push(translate('duas.virtueLabel', { text: dua.virtue }));

  const meta: string[] = [];
  if (categoryTitle) meta.push(categoryTitle);
  if (dua.sources.length > 0) meta.push(translate('duas.source.label', { text: formatSources(dua) }));
  if (dua.repeat > 1) meta.push(translatePlural('duas.repeatTimes', dua.repeat));
  if (meta.length > 0) blocks.push(meta.join(' — '));

  if (includeBranding) {
    blocks.push(`—\n${translate('share.branding')}`);
  }

  return blocks.join('\n\n');
}

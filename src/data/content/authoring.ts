/**
 * DUAA — Content authoring helpers.
 *
 * Seed data is written with these helpers so every entry carries the same
 * shape, a source list, and an explicit order. Keeping authoring separate from
 * the UI is what lets the Firestore stage replace the data source without
 * touching a single screen.
 *
 * POLICY (docs/CONTENT-POLICY.md): every text here comes from the Qur'an or the
 * Sunnah as recorded in the printed collections cited in `sources`. Nothing is
 * paraphrased, generated, or attributed without a reference.
 */

import type { Dua, DuaCategory, SourceReference } from '@/core/types/domain';

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

export const Source = {
  quran: (surah: string, ayah: string): SourceReference => ({
    book: 'القرآن الكريم',
    quran: { surah, ayah },
    grade: 'متواتر',
  }),
  bukhari: (number?: string, narrator?: string): SourceReference => ({
    book: 'صحيح البخاري',
    number,
    narrator,
    grade: 'صحيح',
  }),
  muslim: (number?: string, narrator?: string): SourceReference => ({
    book: 'صحيح مسلم',
    number,
    narrator,
    grade: 'صحيح',
  }),
  abuDaoud: (number?: string, narrator?: string, grade?: string): SourceReference => ({
    book: 'سنن أبي داود',
    number,
    narrator,
    grade,
  }),
  tirmidhi: (number?: string, narrator?: string, grade = 'حسن'): SourceReference => ({
    book: 'سنن الترمذي',
    number,
    narrator,
    grade,
  }),
  nasaai: (number?: string, narrator?: string, grade?: string): SourceReference => ({
    book: 'سنن النسائي',
    number,
    narrator,
    grade,
  }),
  ibnMajah: (number?: string, narrator?: string, grade?: string): SourceReference => ({
    book: 'سنن ابن ماجه',
    number,
    narrator,
    grade,
  }),
  ahmad: (number?: string, narrator?: string, grade?: string): SourceReference => ({
    book: 'مسند أحمد',
    number,
    narrator,
    grade,
  }),
  hakim: (number?: string, narrator?: string, grade = 'صحيح'): SourceReference => ({
    book: 'المستدرك على الصحيحين',
    number,
    narrator,
    grade,
  }),
  ibnSinni: (number?: string, narrator?: string, grade?: string): SourceReference => ({
    book: 'عمل اليوم والليلة لابن السني',
    number,
    narrator,
    grade,
  }),
  dayAndNight: (number?: string, narrator?: string, grade?: string): SourceReference => ({
    book: 'عمل اليوم والليلة للنسائي',
    number,
    narrator,
    grade,
  }),
  adabMufrad: (number?: string, narrator?: string, grade?: string): SourceReference => ({
    book: 'الأدب المفرد للبخاري',
    number,
    narrator,
    grade,
  }),
  tabarani: (number?: string, narrator?: string, grade?: string): SourceReference => ({
    book: 'المعجم للطبراني',
    number,
    narrator,
    grade,
  }),
  ibnHibban: (number?: string, narrator?: string, grade?: string): SourceReference => ({
    book: 'صحيح ابن حبان',
    number,
    narrator,
    grade,
  }),
  baihaqi: (number?: string, narrator?: string, grade?: string): SourceReference => ({
    book: 'السنن الكبرى للبيهقي',
    number,
    narrator,
    grade,
  }),
  /** Compilation reference — used for the ordering/virtue notes of حصن المسلم. */
  hisn: (section?: string): SourceReference => ({
    book: 'حصن المسلم',
    number: section,
  }),
} as const;

/* ------------------------------------------------------------------ */
/* Duas                                                                */
/* ------------------------------------------------------------------ */

export interface DuaDraft {
  id: string;
  categoryId: string;
  title?: string;
  text: string;
  virtue?: string;
  repeat?: number;
  sources: SourceReference[];
  keywords?: string[];
  order: number;
}

export function dua(draft: DuaDraft): Dua {
  return {
    id: draft.id,
    categoryId: draft.categoryId,
    title: draft.title,
    text: draft.text.trim().replace(/\s+/g, ' '),
    virtue: draft.virtue?.trim().replace(/\s+/g, ' '),
    repeat: draft.repeat ?? 1,
    sources: draft.sources,
    keywords: draft.keywords ?? [],
    order: draft.order,
  };
}

/** Helper for the very common "morning/evening" pair of an identical dhikr. */
export function sessionVirtue(morning: boolean, extra?: string): string {
  const base = morning ? 'من قالها حين يصبح' : 'من قالها حين يمسي';
  return extra ? `${base} ${extra}` : base;
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export interface CategoryDraft {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  order: number;
  kind?: DuaCategory['kind'];
  sessionKey?: DuaCategory['sessionKey'];
}

export function category(draft: CategoryDraft): DuaCategory {
  return {
    id: draft.id,
    title: draft.title,
    subtitle: draft.subtitle,
    icon: draft.icon,
    kind: draft.kind ?? 'collection',
    sessionKey: draft.sessionKey,
    order: draft.order,
  };
}

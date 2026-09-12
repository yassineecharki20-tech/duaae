import { buildShareText, formatSource, formatSources } from '@/features/share/shareText';
import { CARD_WIDTH, computeShareCardLayout } from '@/features/share/shareCardLayout';
import { ALL_DUAS, DUA_BY_ID } from '@/data/content';
import type { Dua, SourceReference } from '@/core/types/domain';

const SAMPLE: Dua = {
  id: 'sample-1',
  categoryId: 'general',
  title: 'دعاء اختباري',
  text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
  virtue: 'من قالها صباحًا ومساءً كفاه الله ما أهمّه.',
  repeat: 3,
  sources: [
    { book: 'سنن أبي داود', number: '٥٠٧٤', narrator: 'عبد الله بن عمر', grade: 'صحيح' },
    { book: 'حصن المسلم', number: 'أذكار الصباح والمساء' },
  ],
  keywords: ['العفو', 'العافية'],
  order: 1,
};

describe('formatSource', () => {
  it('renders a hadith reference with its number and grade', () => {
    const reference: SourceReference = { book: 'صحيح البخاري', number: '٦٣٠٦', grade: 'صحيح' };
    expect(formatSource(reference)).toBe('صحيح البخاري ٦٣٠٦ (صحيح)');
  });

  it('renders a Quranic citation by surah and ayah', () => {
    const reference: SourceReference = {
      book: 'القرآن الكريم',
      quran: { surah: 'البقرة', ayah: '١٨٦' },
      grade: 'متواتر',
    };
    expect(formatSource(reference)).toBe('القرآن الكريم — سورة البقرة، الآية ١٨٦');
  });

  it('omits missing parts instead of printing empty placeholders', () => {
    expect(formatSource({ book: 'حصن المسلم' })).toBe('حصن المسلم');
    expect(formatSource({ book: 'مسند أحمد', narrator: 'أبو هريرة' })).toBe('مسند أحمد');
  });

  it('joins multiple sources', () => {
    expect(formatSources(SAMPLE)).toBe(
      'سنن أبي داود ٥٠٧٤ (صحيح) · حصن المسلم أذكار الصباح والمساء',
    );
  });
});

describe('buildShareText', () => {
  it('leads with the supplication and keeps attribution', () => {
    const text = buildShareText(SAMPLE, { categoryTitle: 'أدعية عامة' });
    expect(text.indexOf(SAMPLE.text)).toBeLessThan(text.indexOf('المصدر:'));
    expect(text).toContain('﴿ دعاء اختباري ﴾');
    expect(text).toContain('فضله:');
    expect(text).toContain('يُقال 3 مرات');
    expect(text).toContain('أدعية عامة');
  });

  it('includes branding by default and can omit it', () => {
    expect(buildShareText(SAMPLE)).toContain('دعاء | DUAA');
    expect(buildShareText(SAMPLE, { includeBranding: false })).not.toContain('دعاء | DUAA');
  });

  it('works for every dua in the corpus without throwing', () => {
    for (const dua of ALL_DUAS) {
      const text = buildShareText(dua, { includeBranding: false });
      expect(text).toContain(dua.text);
      expect(text.length).toBeGreaterThan(dua.text.length);
    }
  });
});

describe('computeShareCardLayout', () => {
  it('returns a fixed-width canvas layout', () => {
    const layout = computeShareCardLayout(SAMPLE);
    expect(layout.width).toBe(CARD_WIDTH);
    expect(layout.height).toBeGreaterThan(0);
    expect(layout.lines.length).toBeGreaterThan(0);
  });

  it('shrinks the font until the text fits the text area', () => {
    const longDua: Dua = { ...SAMPLE, id: 'long', text: `${SAMPLE.text} ${'وَنَسْأَلُكَ الْجَنَّةَ'.repeat(40)}` };
    const shortLayout = computeShareCardLayout(SAMPLE);
    const longLayout = computeShareCardLayout(longDua);
    expect(longLayout.fontSize).toBeLessThanOrEqual(shortLayout.fontSize);
  });

  it('never lets the text overflow the footer', () => {
    for (const dua of ALL_DUAS) {
      const layout = computeShareCardLayout(dua);
      expect(layout.footerTop).toBeGreaterThanOrEqual(layout.textTop + layout.textHeight);
      expect(layout.footerTop).toBeLessThan(layout.height);
      expect(layout.lines.join(' ').length).toBeGreaterThan(0);
    }
  });

  it('offers distinct light and dark palettes', () => {
    const light = computeShareCardLayout(SAMPLE, { scheme: 'light' });
    const dark = computeShareCardLayout(SAMPLE, { scheme: 'dark' });
    expect(light.palette).not.toEqual(dark.palette);
  });

  it('keeps the crescent mark geometry stable', () => {
    const layout = computeShareCardLayout(DUA_BY_ID.get(ALL_DUAS[0].id)!);
    expect(layout.mark.cx).toBe(CARD_WIDTH / 2);
    expect(layout.mark.r).toBeGreaterThan(0);
  });
});

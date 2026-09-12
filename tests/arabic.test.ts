import {
  arabicCount,
  containsArabic,
  normalizeArabic,
  stripTashkeel,
  toArabicDigits,
  toSearchKey,
  tokenize,
  wrapText,
} from '@/core/utils/arabic';

describe('normalizeArabic', () => {
  it('folds alef/ya/ta-marbuta variants so search is forgiving', () => {
    expect(normalizeArabic('أ')).toBe('ا');
    expect(normalizeArabic('إله')).toBe('اله');
    expect(normalizeArabic('مُنى')).toBe('مني');
    expect(normalizeArabic('جنة')).toBe('جنه');
  });

  it('removes tashkeel and tatweel', () => {
    expect(normalizeArabic('سُبْحَانَ اللَّهِ')).toBe('سبحان الله');
    expect(normalizeArabic('كــتــاب')).toBe('كتاب');
  });

  it('is a no-op for empty input', () => {
    expect(normalizeArabic('')).toBe('');
  });
});

describe('toSearchKey', () => {
  it('normalises, lowercases and collapses whitespace', () => {
    expect(toSearchKey('  الرَّحمن   الرحيم  ')).toBe('الرحمن الرحيم');
    expect(toSearchKey('Duaa')).toBe('duaa');
  });
});

describe('tokenize', () => {
  it('splits on whitespace after normalisation', () => {
    expect(tokenize('أذكار الصباح')).toEqual(['اذكار', 'الصباح']);
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('stripTashkeel', () => {
  it('keeps the letters but drops the vowel marks', () => {
    expect(stripTashkeel('اللَّهُمَّ')).toBe('اللهم');
  });
});

describe('containsArabic', () => {
  it('detects Arabic letters and digits', () => {
    expect(containsArabic('دعاء')).toBe(true);
    expect(containsArabic('٣')).toBe(true);
    expect(containsArabic('dua')).toBe(false);
    expect(containsArabic('')).toBe(false);
  });
});

describe('arabicCount', () => {
  const forms = { one: 'ذكر واحد', two: 'ذكران', few: 'أذكار', many: 'ذكرًا' };

  it('uses the singular and dual forms without a number', () => {
    expect(arabicCount(1, forms)).toBe('ذكر واحد');
    expect(arabicCount(2, forms)).toBe('ذكران');
  });

  it('uses the plural (3–10) and the accusative (11+) forms', () => {
    expect(arabicCount(3, forms)).toBe('3 أذكار');
    expect(arabicCount(10, forms)).toBe('10 أذكار');
    expect(arabicCount(11, forms)).toBe('11 ذكرًا');
    expect(arabicCount(100, forms)).toBe('100 ذكرًا');
  });
});

describe('toArabicDigits', () => {
  it('maps Western digits to Arabic-Indic', () => {
    expect(toArabicDigits(2026)).toBe('٢٠٢٦');
    expect(toArabicDigits('10/9')).toBe('١٠/٩');
  });
});

describe('wrapText', () => {
  it('never exceeds the requested line width', () => {
    const text = 'اللهم إني أسألك الهدى والتقى والعفاف والغنى';
    const lines = wrapText(text, 20);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(20);
    expect(lines.join(' ').replace(/\s+/g, ' ')).toBe(text);
  });

  it('keeps a single long word intact instead of dropping it', () => {
    expect(wrapText('كلمةطويلةجدا', 4)).toEqual(['كلمةطويلةجدا']);
  });

  it('returns no lines for empty text', () => {
    expect(wrapText('', 10)).toEqual([]);
  });
});

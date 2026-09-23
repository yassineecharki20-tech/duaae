/**
 * Enforcement — no hardcoded user-facing strings.
 *
 * The rule the whole i18n stage rests on: **Arabic (or any language) text may
 * only live in the catalogs**. Screens and components call `t()` / `translate()`;
 * the religious corpus stays in `src/data` (never translated, by policy); the
 * Arabic normalisation tables stay in `src/core/utils/arabic.ts`.
 *
 * The scan is a small lexer rather than a line grep, so Arabic inside a comment
 * (documentation is written in both languages on purpose) is allowed while
 * Arabic inside a string literal, a template literal or JSX text is not.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const REPO_ROOT = join(__dirname, '..');
const SRC = join(REPO_ROOT, 'src');

/**
 * Arabic *text*: letters, digits and Arabic punctuation (، ؟).
 *
 * The presentation-forms blocks are deliberately excluded because they hold the
 * Quranic ornamental brackets ﴿ ﴾ that frame a supplication title. Those are
 * part of how scripture is presented — identical in every interface language —
 * not a translatable string, so they may appear beside `dua.title`.
 */
const ARABIC = /[\u0600-\u06FF\u0750-\u077F]/;

/** Paths where Arabic is the content, not a hardcoded UI string. */
const ALLOWED_PATHS = [
  join('src', 'data'), // the dua/azkar corpus — scripture is never translated
  join('src', 'core', 'i18n', 'messages'), // the catalogs themselves
  join('src', 'core', 'utils', 'arabic.ts'), // normalisation tables and regexes
] as const;

type State = 'code' | 'lineComment' | 'blockComment' | 'single' | 'double' | 'template';

interface Violation {
  file: string;
  line: number;
  where: 'code' | 'string';
  text: string;
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      yield full;
    }
  }
}

function isAllowed(path: string): boolean {
  return ALLOWED_PATHS.some((allowed) => path === allowed || path.startsWith(allowed + sep));
}

/**
 * Scan one source file. Arabic in a comment is fine; anywhere a user could see
 * it (string, template, JSX text) is a violation.
 */
function scan(path: string, source: string): Violation[] {
  const violations: Violation[] = [];
  const lines = source.split('\n');
  let state: State = 'code';
  let line = 1;

  const report = (where: 'code' | 'string') => {
    violations.push({ file: path, line, where, text: (lines[line - 1] ?? '').trim().slice(0, 120) });
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '\n') {
      line += 1;
      if (state === 'lineComment') state = 'code';
      continue;
    }

    switch (state) {
      case 'code':
        if (char === '/' && next === '/') {
          state = 'lineComment';
          index += 1;
        } else if (char === '/' && next === '*') {
          state = 'blockComment';
          index += 1;
        } else if (char === "'") {
          state = 'single';
        } else if (char === '"') {
          state = 'double';
        } else if (char === '`') {
          state = 'template';
        } else if (ARABIC.test(char)) {
          report('code');
        }
        break;

      case 'blockComment':
        if (char === '*' && next === '/') {
          state = 'code';
          index += 1;
        }
        break;

      case 'single':
      case 'double':
        if (char === '\\') {
          index += 1;
        } else if ((state === 'single' && char === "'") || (state === 'double' && char === '"')) {
          state = 'code';
        } else if (ARABIC.test(char)) {
          report('string');
        }
        break;

      case 'template':
        if (char === '\\') {
          index += 1;
        } else if (char === '`') {
          state = 'code';
        } else if (ARABIC.test(char)) {
          report('string');
        }
        break;

      default:
        break;
    }
  }

  // Safety net: an unbalanced apostrophe in prose (JSX text, English copy) can
  // open a phantom string state. A hit on a line that is visibly a comment is
  // dropped — the lexer already ignores real comments, so this only removes
  // artefacts, never a genuine hardcoded string.
  return violations.filter((violation) => !/^(\*|\/\/|\/\*)/.test(violation.text));
}

describe('no hardcoded strings outside the catalogs', () => {
  const files = [...walk(SRC)].map((file) => relative(REPO_ROOT, file)).sort();
  const scanned = files.map((file) => ({ file, source: readFileSync(join(REPO_ROOT, file), 'utf8') }));

  it('scans the whole source tree', () => {
    expect(files.length).toBeGreaterThan(100);
    expect(files).toContain(join('src', 'app', '(tabs)', 'index.tsx'));
    expect(files).toContain(join('src', 'core', 'i18n', 'messages', 'ar.ts'));
  });

  it('keeps every Arabic literal inside the corpus, the catalogs or the Arabic utils', () => {
    const violations = scanned
      .filter(({ file }) => !isAllowed(file))
      .flatMap(({ file, source }) => scan(file, source));

    expect(violations).toEqual([]);
  });

  it('really does contain Arabic where it is supposed to', () => {
    // Guards against the test passing because the corpus was emptied.
    const corpus = scanned.filter(({ file }) => file.startsWith(join('src', 'data')));
    expect(corpus.some(({ source }) => ARABIC.test(source))).toBe(true);

    const catalogs = ['ar', 'fr', 'en'].map((language) =>
      scanned.find(({ file }) => file === join('src', 'core', 'i18n', 'messages', `${language}.ts`)),
    );
    for (const catalog of catalogs) {
      expect(catalog).toBeTruthy();
      expect((catalog?.source.match(/^ {2}'[^']+'/gm) ?? []).length).toBeGreaterThan(700);
    }
    expect(ARABIC.test(catalogs[0]!.source)).toBe(true);
  });

  it('forbids per-language label maps outside the i18n module', () => {
    // A `Record<AppLanguage, string>` in a component freezes labels at import
    // time and bypasses the catalogs; pickers must build from `t`. Maps keyed by
    // language that hold *message keys* (or icons) are the sanctioned pattern.
    const offenders = scanned
      .filter(({ file }) => !file.startsWith(join('src', 'core', 'i18n')))
      .filter(({ source }) => /Record<\s*AppLanguage\s*,\s*string\s*>/.test(source))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);

    // …and the language picker really does resolve its labels through keys.
    const languageScreen = scanned.find(
      ({ file }) => file === join('src', 'app', 'settings', 'language.tsx'),
    )?.source;
    expect(languageScreen).toMatch(/Record<AppLanguage, MessageKey>/);
    expect(languageScreen).not.toMatch(/'العربية'|'Français'|'English'/);
  });

  it('has no catalog imports leaking into the data layer', () => {
    const offenders = scanned
      .filter(({ file }) => file.startsWith(join('src', 'data')))
      .filter(({ source }) => /@\/core\/i18n/.test(source))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});

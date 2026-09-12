/**
 * App manifest drift guard.
 *
 * `app.json` is JSON, so it cannot import the design tokens — the native splash
 * and browser-chrome colours are duplicated by necessity. This suite fails the
 * build the moment the manifest and the tokens disagree, which is how a
 * "the splash is a slightly different ivory" bug normally ships.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { darkColors, lightColors } from '@/design/tokens/themeColors';

const ROOT = join(__dirname, '..');
const raw = readFileSync(join(ROOT, 'app.json'), 'utf8');
const manifest = JSON.parse(raw).expo as {
  name: string;
  slug: string;
  scheme: string;
  backgroundColor: string;
  primaryColor: string;
  icon: string;
  splash: { image: string; backgroundColor: string };
  web: { lang: string; dir: string; themeColor: string; backgroundColor: string; favicon: string; output: string };
  android: {
    package: string;
    adaptiveIcon: { backgroundColor: string; foregroundImage: string; monochromeImage: string };
    intentFilters: { data: { scheme: string }[] }[];
  };
  ios: { bundleIdentifier: string };
  plugins: unknown[];
};

function splashPlugin(): Record<string, any> {
  const entry = manifest.plugins.find(
    (plugin): plugin is [string, Record<string, any>] => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
  );
  if (!entry) throw new Error('expo-splash-screen plugin is missing from app.json');
  return entry[1];
}

describe('app.json ↔ design tokens', () => {
  it('uses the token background and primary colours everywhere', () => {
    expect(manifest.backgroundColor).toBe(lightColors.background);
    expect(manifest.primaryColor).toBe(lightColors.primary);
    expect(manifest.splash.backgroundColor).toBe(lightColors.background);
    expect(manifest.web.backgroundColor).toBe(lightColors.background);
    expect(manifest.web.themeColor).toBe(lightColors.primary);
    expect(manifest.android.adaptiveIcon.backgroundColor).toBe(lightColors.primary);
  });

  it('ships a dark splash that matches the dark background token', () => {
    expect(splashPlugin().backgroundColor).toBe(lightColors.background);
    expect(splashPlugin().dark.backgroundColor).toBe(darkColors.background);
    expect(splashPlugin().dark.image).toContain('splash-icon-dark');
  });
});

describe('app.json — locale, links and identity', () => {
  it('is Arabic and RTL at the document level', () => {
    expect(manifest.web.lang).toBe('ar');
    expect(manifest.web.dir).toBe('rtl');
  });

  it('declares the duaa:// deep-link scheme on both native platforms', () => {
    expect(manifest.scheme).toBe('duaa');
    expect(manifest.android.intentFilters[0].data[0].scheme).toBe('duaa');
  });

  it('exports the web build as static files', () => {
    expect(manifest.web.output).toBe('static');
  });

  it('has stable identifiers', () => {
    expect(manifest.slug).toBe('duaa');
    expect(manifest.ios.bundleIdentifier).toBe('app.duaa.mobile');
    expect(manifest.android.package).toBe('app.duaa.mobile');
  });
});

describe('app.json — hygiene', () => {
  it('only references image assets that exist on disk', () => {
    const referenced = [
      manifest.icon,
      manifest.splash.image,
      manifest.web.favicon,
      manifest.android.adaptiveIcon.foregroundImage,
      manifest.android.adaptiveIcon.monochromeImage,
      splashPlugin().image,
      splashPlugin().dark.image,
    ];

    expect(referenced.length).toBeGreaterThan(0);
    for (const relative of referenced) {
      expect(existsSync(join(ROOT, relative))).toBe(true);
    }
  });

  it('carries no credentials', () => {
    expect(raw).not.toMatch(/api[_-]?key|secret|passw(or)?d|private[_-]?key|AIza[0-9A-Za-z_-]{10,}/i);
  });
});

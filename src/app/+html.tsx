import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { darkColors, lightColors } from '@/design/tokens';

/**
 * Web document shell.
 *
 * `dir="rtl"` and `lang="ar"` are declared here — in the actual HTML — so the
 * document direction is correct *before* any JavaScript runs. react-native-web
 * reads the locale context from our RTLProvider, and the browser handles
 * scrollbars, form controls and text selection in RTL from the very first paint.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        {/* Browser chrome follows the OS scheme before any JS runs; once the
            app hydrates, ThemeProvider rewrites both to the chosen theme. */}
        <meta
          name="theme-color"
          content={lightColors.background}
          media="(prefers-color-scheme: light)"
        />
        <meta name="theme-color" content={darkColors.background} media="(prefers-color-scheme: dark)" />
        <meta name="color-scheme" content="light dark" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: baseStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

/**
 * Pre-hydration shell CSS. Every colour is interpolated from the design tokens
 * so the first paint cannot drift from the themed app that replaces it.
 */
const baseStyles = `
html, body, #root { height: 100%; }
body {
  margin: 0;
  background: ${lightColors.background};
  overscroll-behavior: none;
}
@media (prefers-color-scheme: dark) {
  body { background: ${darkColors.background}; }
}
/* Arabic-first typography defaults while webfonts load. */
body { font-family: 'IBM Plex Sans Arabic', system-ui, -apple-system, 'Segoe UI', sans-serif; }
input, textarea, button { font-family: inherit; }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: ${lightColors.borderStrong}; border-radius: 8px; }
`;

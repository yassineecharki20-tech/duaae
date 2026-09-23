/**
 * Render helpers for screen-level tests.
 *
 * Screens are mounted inside the same providers the app uses at runtime
 * (i18n ▸ RTL ▸ theme ▸ toast), then flushed so persisted stores finish
 * hydrating. The default language is Arabic, so assertions read Arabic strings
 * unless a test changes the language first.
 */

import type { ReactElement } from 'react';
import { act, render, type RenderResult } from '@testing-library/react';

import { I18nProvider } from '@/core/i18n/I18nProvider';
import { RTLProvider } from '@/design/rtl/RTLProvider';
import { AppThemeProvider } from '@/design/theme/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';

export function withProviders(ui: ReactElement): ReactElement {
  return (
    <I18nProvider>
      <RTLProvider>
        <AppThemeProvider>
          <ToastProvider>{ui}</ToastProvider>
        </AppThemeProvider>
      </RTLProvider>
    </I18nProvider>
  );
}

/** Render a screen and let pending promises/effects settle. */
export async function renderScreen(
  ui: ReactElement,
  options: { params?: Record<string, string>; path?: string } = {},
): Promise<RenderResult> {
  (globalThis as any).__ROUTE_PARAMS__ = options.params ?? {};
  (globalThis as any).__ROUTE_PATH__ = options.path ?? '/';

  let result!: RenderResult;
  await act(async () => {
    result = render(withProviders(ui));
  });
  await settle();
  return result;
}

/** Flush microtasks + timers so store hydration and async services resolve. */
export async function settle(rounds = 4): Promise<void> {
  for (let index = 0; index < rounds; index += 1) {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

/** All visible text of the rendered tree, whitespace-collapsed. */
export function visibleText(container: HTMLElement): string {
  return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Render helpers for screen-level tests.
 *
 * Screens are mounted inside the same providers the app uses at runtime
 * (RTL ▸ theme ▸ toast), then flushed so persisted stores finish hydrating.
 */

import type { ReactElement } from 'react';
import { act, render, type RenderResult } from '@testing-library/react';

import { RTLProvider } from '@/design/rtl/RTLProvider';
import { AppThemeProvider } from '@/design/theme/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';

export function withProviders(ui: ReactElement): ReactElement {
  return (
    <RTLProvider>
      <AppThemeProvider>
        <ToastProvider>{ui}</ToastProvider>
      </AppThemeProvider>
    </RTLProvider>
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

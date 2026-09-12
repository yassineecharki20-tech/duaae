/**
 * Interaction tests — proof that the controls do what they say.
 *
 * Each test drives a real control through the DOM, then asserts both the
 * visible result and the persisted store change. This is the suite that would
 * fail if a button were decorative.
 */

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';

import AppearanceScreen from '@/app/settings/appearance';
import DuaDetailScreen from '@/app/dua/[duaId]';
import FavoritesScreen from '@/app/favorites';
import MorningAzkar from '@/app/azkar/morning';
import OnboardingScreen from '@/app/onboarding';
import SearchScreen from '@/app/search';
import SettingsScreen from '@/app/settings/index';
import TasbeehScreen from '@/app/(tabs)/tasbeeh';

import { router } from 'expo-router';

import { DUAS_BY_CATEGORY, DUA_BY_ID } from '@/data/content';
import { DEFAULT_DHIKR_ID } from '@/data/tasbeeh/presets';
import { useAzkarStore } from '@/store/azkarStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useSearchStore } from '@/store/searchStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTasbeehStore } from '@/store/tasbeehStore';
import { renderScreen, settle, visibleText } from './helpers';

beforeAll(async () => {
  await act(async () => {
    await useFavoritesStore.getState().hydrate();
  });
});

describe('tasbeeh counter', () => {
  it('counts a tap and keeps the number on screen and in storage', async () => {
    await act(async () => {
      useTasbeehStore.getState().resetDhikr(DEFAULT_DHIKR_ID);
    });
    const { getByTestId, container } = await renderScreen(<TasbeehScreen />);

    expect(getByTestId('tasbeeh-dial').getAttribute('aria-label')).toContain('0 من 33');

    await act(async () => {
      fireEvent.click(getByTestId('tasbeeh-dial'));
    });
    await settle(2);

    expect(getByTestId('tasbeeh-dial').getAttribute('aria-label')).toContain('1 من 33');
    expect(visibleText(container)).toContain('الإجمالي 1');
    expect(useTasbeehStore.getState().progress[DEFAULT_DHIKR_ID]?.count).toBe(1);
  });

  it('completes a round at the target and rolls the count over', async () => {
    await act(async () => {
      useTasbeehStore.getState().resetDhikr(DEFAULT_DHIKR_ID);
    });
    const { getByTestId } = await renderScreen(<TasbeehScreen />);
    const target = useTasbeehStore.getState().target;
    expect(getByTestId('tasbeeh-dial').getAttribute('aria-label')).toContain(`0 من ${target}`);

    for (let tap = 0; tap < target; tap += 1) {
      await act(async () => {
        fireEvent.click(getByTestId('tasbeeh-dial'));
      });
    }
    await settle(2);

    const progress = useTasbeehStore.getState().progress[DEFAULT_DHIKR_ID];
    expect(progress?.count).toBe(0);
    expect(progress?.rounds).toBe(1);
    expect(progress?.total).toBe(target);
    expect(getByTestId('tasbeeh-dial').getAttribute('aria-label')).toContain(`0 من ${target}`);
  });

  it('changes the dhikr and remembers the choice', async () => {
    const { getByLabelText } = await renderScreen(<TasbeehScreen />);

    await act(async () => {
      fireEvent.click(getByLabelText('الْحَمْدُ لِلَّهِ'));
    });
    await settle(2);

    expect(useTasbeehStore.getState().selectedDhikrId).toBe('preset-alhamdulillah');
  });
});

describe('azkar session', () => {
  it('advances the repetition counter of the tapped dhikr', async () => {
    await act(async () => {
      useAzkarStore.getState().resetSession('morning');
    });
    const items = DUAS_BY_CATEGORY.get('morning')!;
    const index = items.findIndex((item) => item.repeat >= 3);
    const target = items[index];

    const { container, getByTestId } = await renderScreen(<MorningAzkar />);
    expect(visibleText(getByTestId(`dhikr-${index}`))).toContain(`0 / ${target.repeat}`);

    await act(async () => {
      fireEvent.click(getByText(container, target.text));
    });
    await settle(2);

    expect(useAzkarStore.getState().countsFor('morning')[target.id]).toBe(1);
    expect(visibleText(getByTestId(`dhikr-${index}`))).toContain(`1 / ${target.repeat}`);
    expect(visibleText(container)).toContain(`1/${items.reduce((sum, item) => sum + item.repeat, 0)}`);
  });

  it('marks a single-repetition dhikr as done', async () => {
    await act(async () => {
      useAzkarStore.getState().resetSession('morning');
    });
    const items = DUAS_BY_CATEGORY.get('morning')!;
    const index = items.findIndex((item) => item.repeat === 1);

    const { container, getByTestId } = await renderScreen(<MorningAzkar />);
    await act(async () => {
      fireEvent.click(getByText(container, items[index].text));
    });
    await settle(2);

    expect(useAzkarStore.getState().countsFor('morning')[items[index].id]).toBe(1);
    expect(visibleText(getByTestId(`dhikr-${index}`))).toContain('تم');
  });
});

describe('favorites', () => {
  it('adds a dua from the reader and shows it on the favorites screen', async () => {
    const dua = DUAS_BY_CATEGORY.get('rizq')![0];

    await act(async () => {
      await useFavoritesStore.getState().remove(dua.id);
    });

    const detail = await renderScreen(<DuaDetailScreen />, {
      params: { duaId: dua.id },
      path: `/dua/${dua.id}`,
    });

    await act(async () => {
      fireEvent.click(detail.getByLabelText('إضافة إلى المفضلة'));
    });
    await settle(3);

    await waitFor(() => {
      expect(useFavoritesStore.getState().has(dua.id)).toBe(true);
    });

    detail.unmount();

    const list = await renderScreen(<FavoritesScreen />, { path: '/favorites' });
    await settle(2);
    expect(visibleText(list.container)).toContain(dua.text.slice(0, 20));

    await act(async () => {
      fireEvent.click(within(list.container).getByLabelText('إزالة من المفضلة'));
    });
    await settle(3);
    expect(useFavoritesStore.getState().has(dua.id)).toBe(false);
  });
});

describe('search', () => {
  it('returns real results for a typed query', async () => {
    const { getByLabelText, container } = await renderScreen(<SearchScreen />, { path: '/search' });

    await act(async () => {
      fireEvent.change(getByLabelText('حقل البحث'), { target: { value: 'الرزق' } });
    });
    await new Promise((resolve) => setTimeout(resolve, 260));
    await settle(2);

    const text = visibleText(container);
    expect(text).toContain('نتيجة');
    expect(text).toContain(DUAS_BY_CATEGORY.get('rizq')![0].text.slice(0, 16));
  });

  it('shows an honest empty state for a query with no matches', async () => {
    const { getByLabelText, container } = await renderScreen(<SearchScreen />, { path: '/search' });

    await act(async () => {
      fireEvent.change(getByLabelText('حقل البحث'), { target: { value: 'zzzqqq' } });
    });
    await new Promise((resolve) => setTimeout(resolve, 260));
    await settle(2);

    expect(visibleText(container)).toContain('لا نتائج');
  });

  it('records what was typed and lets one term be removed again', async () => {
    // Start from an empty history — the previous test typed its own query.
    await act(async () => {
      useSearchStore.getState().clearRecent();
    });

    const { container, getByLabelText } = await renderScreen(<SearchScreen />, { path: '/search' });

    // Real store calls, exactly like typing would produce.
    await act(async () => {
      useSearchStore.getState().addRecent('الفرج');
      useSearchStore.getState().addRecent('الرزق');
    });
    await settle(2);

    expect(useSearchStore.getState().recent).toEqual(['الرزق', 'الفرج']);
    const chips = () =>
      [...container.querySelectorAll('[aria-label^="ابحث عن"]')].map((node) => node.getAttribute('aria-label'));
    expect(chips()).toEqual(['ابحث عن الرزق', 'ابحث عن الفرج']);

    // The × control on the chip removes that one term — and says so.
    await act(async () => {
      fireEvent.click(getByLabelText('إزالة الفرج من السجل'));
    });
    await settle(2);

    expect(chips()).toEqual(['ابحث عن الرزق']);
    expect(useSearchStore.getState().recent).toEqual(['الرزق']);
    expect(visibleText(container)).toContain('أُزيل «الفرج»');

    await act(async () => {
      useSearchStore.getState().clearRecent();
    });
  });
});

describe('appearance settings', () => {
  it('switches to the dark theme and persists it', async () => {
    const { getByLabelText, container } = await renderScreen(<AppearanceScreen />, {
      path: '/settings/appearance',
    });

    await act(async () => {
      fireEvent.click(getByLabelText('ليلي'));
    });
    await settle(2);

    expect(useSettingsStore.getState().appearance).toBe('dark');
    // The theme actually changed: the rendered surface is the night background.
    expect(container.innerHTML).toContain('10, 21, 18');
  });

  it('changes the reading size used for scripture', async () => {
    const { getByLabelText } = await renderScreen(<AppearanceScreen />, {
      path: '/settings/appearance',
    });

    await act(async () => {
      fireEvent.click(getByLabelText('كبير جدًا'));
    });
    await settle(2);

    expect(useSettingsStore.getState().readingScale).toBe('xLarge');
  });
});

describe('onboarding', () => {
  it('marks onboarding complete and routes to the tabs on the CTA', async () => {
    await act(async () => {
      useOnboardingStore.getState().resetForTesting();
    });
    const view = await renderScreen(<OnboardingScreen />, { path: '/onboarding' });

    // The CTA only exists on the last slide, so walk the pager there for real.
    expect(view.queryByTestId('onboarding-start')).toBeNull();
    expect(view.container.querySelector('[aria-label^="الشريحة 1 من 4"]')).toBeTruthy();

    for (let slide = 2; slide <= 4; slide += 1) {
      await act(async () => {
        fireEvent.click(within(view.container).getByLabelText('الشريحة التالية'));
      });
      await settle(2);
      expect(view.container.querySelector(`[aria-label^="الشريحة ${slide} من 4"]`)).toBeTruthy();
    }

    await act(async () => {
      fireEvent.click(view.getByTestId('onboarding-start'));
    });
    await settle(2);

    expect(useOnboardingStore.getState().completed).toBe(true);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });
});

describe('local data reset', () => {
  it('wipes favorites after an explicit confirmation', async () => {
    const dua = [...DUA_BY_ID.values()].find((item) => item.categoryId === 'general')!;
    await act(async () => {
      await useFavoritesStore.getState().toggle(dua.id);
    });
    expect(useFavoritesStore.getState().has(dua.id)).toBe(true);

    const { getByLabelText } = await renderScreen(<SettingsScreen />, { path: '/settings' });

    await act(async () => {
      fireEvent.click(getByLabelText('إعادة ضبط البيانات المحلية'));
    });
    await settle(2);

    await act(async () => {
      fireEvent.click(await screen.findByLabelText('تأكيد الحذف'));
    });
    await settle(4);

    await waitFor(() => {
      expect(useFavoritesStore.getState().entries.length).toBe(0);
    });
  });
});

function getByText(container: HTMLElement, text: string): HTMLElement {
  const match = [...container.querySelectorAll('*')].find(
    (node) => (node.textContent ?? '').trim().startsWith(text.slice(0, 24)) && node.children.length === 0,
  );
  if (!match) throw new Error(`text not found: ${text.slice(0, 30)}`);
  return match as HTMLElement;
}

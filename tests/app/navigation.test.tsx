/**
 * Tab bar regression tests.
 *
 * The custom bar reads `descriptors[route.key]` — React Navigation keys
 * descriptors by route *key*, not route name. Keying by name crashed the whole
 * tab navigator on first paint, so both the happy path and a missing-descriptor
 * path are pinned here.
 */

import type { ComponentProps } from 'react';
import * as React from 'react';
import { act, fireEvent } from '@testing-library/react';

import TabsLayout from '@/app/(tabs)/_layout';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { renderScreen, visibleText } from './helpers';

const ROUTES = [
  { key: 'index-abc', name: 'index' },
  { key: 'duas-def', name: 'duas' },
  { key: 'tasbeeh-ghi', name: 'tasbeeh' },
  { key: 'community-jkl', name: 'community' },
  { key: 'profile-mno', name: 'profile' },
];

const TITLES: Record<string, string> = {
  index: 'الرئيسية',
  duas: 'الأدعية',
  tasbeeh: 'التسبيح',
  community: 'المجتمع',
  profile: 'حسابي',
};

type TabBarProps = ComponentProps<typeof BottomTabBar>;
type FakeNavigation = { emit: jest.Mock; navigate: jest.Mock; addListener: jest.Mock };

function buildProps(overrides: { index?: number; dropDescriptors?: boolean } = {}): {
  props: TabBarProps;
  navigation: FakeNavigation;
} {
  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    navigate: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  };
  const descriptors: Record<string, { options: { title?: string } }> = {};
  if (!overrides.dropDescriptors) {
    for (const route of ROUTES) {
      descriptors[route.key] = { options: { title: TITLES[route.name] } };
    }
  }
  const props = {
    state: {
      index: overrides.index ?? 0,
      routes: ROUTES,
      key: 'tab-state',
      stale: false as const,
      type: 'tab' as const,
      history: [],
    },
    navigation,
    descriptors,
  } as unknown as TabBarProps;

  return { props, navigation: navigation as FakeNavigation };
}

describe('BottomTabBar', () => {
  it('renders all five destinations with their Arabic labels', async () => {
    const { props } = buildProps();
    const { container } = await renderScreen(<BottomTabBar {...props} />);
    const text = visibleText(container);

    for (const title of Object.values(TITLES)) {
      expect(text).toContain(title);
    }
    expect(container.querySelectorAll('[role="tab"]').length).toBe(5);
    expect(container.querySelector('[role="tablist"]')).toBeTruthy();
  });

  it('marks the active route as selected for assistive tech', async () => {
    const { props } = buildProps({ index: 2 });
    const { container } = await renderScreen(<BottomTabBar {...props} />);
    const tabs = [...container.querySelectorAll('[role="tab"]')];

    // react-native-web needs the explicit ARIA attribute; see core/a11y/stateProps.
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[0].getAttribute('aria-label')).toBe('الرئيسية');
  });

  it('navigates on tap of an unfocused tab', async () => {
    const { props, navigation } = buildProps({ index: 0 });
    const { getByTestId } = await renderScreen(<BottomTabBar {...props} />);

    await act(async () => {
      fireEvent.click(getByTestId('tab-duas'));
    });

    expect(navigation.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'duas-def', canPreventDefault: true }),
    );
    expect(navigation.navigate).toHaveBeenCalledWith('duas');
  });

  it('does not re-navigate to the tab that is already focused', async () => {
    const { props, navigation } = buildProps({ index: 1 });
    const { getByTestId } = await renderScreen(<BottomTabBar {...props} />);

    await act(async () => {
      fireEvent.click(getByTestId('tab-duas'));
    });

    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('survives a missing descriptor instead of crashing the navigator', async () => {
    const { props } = buildProps({ dropDescriptors: true });
    const { container } = await renderScreen(<BottomTabBar {...props} />);

    // Falls back to the built-in Arabic labels, so the bar stays usable.
    expect(container.querySelectorAll('[role="tab"]').length).toBe(5);
    for (const title of Object.values(TITLES)) {
      expect(visibleText(container)).toContain(title);
    }
  });
});

describe('tab navigator wiring (src/app/(tabs)/_layout.tsx)', () => {
  type RecordedTabs = {
    tabBar?: unknown;
    children?: unknown;
    screenOptions?: { headerShown?: boolean; lazy?: boolean; sceneStyle?: { backgroundColor?: string } };
  };

  function recordedTabsProps(): RecordedTabs {
    const all = ((globalThis as unknown as { __expoTabsProps?: RecordedTabs[] }).__expoTabsProps ?? []);
    return all[all.length - 1] ?? {};
  }

  function recordedScreens(): { name: string; options: { title?: string } }[] {
    return (globalThis as unknown as { __expoTabScreens?: never }).__expoTabScreens ?? [];
  }

  it('declares the five destinations, headerless and lazy', async () => {
    await renderScreen(<TabsLayout />);

    // The harness may mount twice (hydration pass), so compare the declared set.
    expect([...new Set(recordedScreens().map((screen) => screen.name))]).toEqual([
      'index',
      'duas',
      'tasbeeh',
      'community',
      'profile',
    ]);
    // Titles come from the layout; headers are disabled and loading is lazy
    // through screenOptions.
    const titles = [...new Set(recordedScreens().map((screen) => screen.options.title))] as string[];
    expect(titles).toEqual(['الرئيسية', 'الأدعية', 'التسبيح', 'المجتمع', 'حسابي']);

    const screenOptions = recordedTabsProps().screenOptions ?? {};
    expect(screenOptions.headerShown).toBe(false);
    expect(screenOptions.lazy).toBe(true);
    expect(screenOptions.sceneStyle?.backgroundColor).toBeTruthy();
    expect(typeof recordedTabsProps().tabBar).toBe('function');
  });

  it('renders the real BottomTabBar through the layout render prop', async () => {
    await renderScreen(<TabsLayout />);
    const renderTabBar = recordedTabsProps().tabBar as (props: never) => React.ReactElement;

    const { props } = buildProps({ index: 3 });
    const { container } = await renderScreen(renderTabBar(props as never));

    expect(container.querySelectorAll('[role="tab"]').length).toBe(5);
    const text = visibleText(container);
    expect(text).toContain('المجتمع');
    expect(container.querySelectorAll('[role="tab"]')[3].getAttribute('aria-selected')).toBe('true');
  });
});

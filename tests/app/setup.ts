/**
 * Jest setup for the app (react-native-web) project.
 *
 * Every native module the app touches is replaced with an honest in-memory
 * double: navigation records calls instead of navigating, haptics/audio record
 * that they were asked, and the platform APIs return deterministic values. The
 * point is to exercise the real components, stores and services — not to
 * re-test the mocks.
 */

import '@testing-library/react';

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const SafeAreaView = React.forwardRef((props: any, ref: any) =>
    React.createElement(View, { ...props, ref }),
  );
  return {
    __esModule: true,
    default: { SafeAreaView },
    SafeAreaView,
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaInsetsContext: React.createContext(insets),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

jest.mock('expo-router', () => {
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
    setParams: jest.fn(),
    navigate: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
  };
  const Stack: any = ({ children }: any) => children ?? null;
  Stack.Screen = () => null;
  return {
    __esModule: true,
    default: { router, Stack },
    router,
    useRouter: () => router,
    useLocalSearchParams: () => (globalThis as any).__ROUTE_PARAMS__ ?? {},
    usePathname: () => (globalThis as any).__ROUTE_PATH__ ?? '/',
    useSegments: () => [],
    useGlobalSearchParams: () => (globalThis as any).__ROUTE_PARAMS__ ?? {},
    Redirect: () => null,
    Link: ({ children }: any) => children ?? null,
    Stack,
    ThemeProvider: ({ children }: any) => children,
    DefaultTheme: { dark: false, colors: {} },
    DarkTheme: { dark: true, colors: {} },
  };
});

jest.mock('expo-router/js-tabs', () => {
  // The real Tabs needs a full expo-router context ("No filename found"), so the
  // stub renders its children and *records the props it was given*. Tests can
  // then invoke the real `tabBar` render prop from src/app/(tabs)/_layout.tsx,
  // which keeps the navigator wiring honest without a router harness.
  const Tabs: any = (props: any) => {
    (globalThis as any).__expoTabsProps = (globalThis as any).__expoTabsProps ?? [];
    (globalThis as any).__expoTabsProps.push(props);
    return props.children ?? null;
  };
  Tabs.Screen = (props: any) => {
    (globalThis as any).__expoTabScreens = (globalThis as any).__expoTabScreens ?? [];
    (globalThis as any).__expoTabScreens.push({ name: props.name, options: props.options });
    return null;
  };
  return { __esModule: true, default: Tabs, Tabs };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const makeIcon = (family: string) => {
    const Icon = ({ name, ...rest }: any) =>
      React.createElement(Text, { testID: `${family}-icon` }, `${family}:${String(name)}`);
    Icon.glyphMap = new Proxy({} as Record<string, number>, {
      get: () => 1,
      has: () => true,
    });
    Icon.loadFont = () => Promise.resolve();
    return Icon;
  };
  return {
    __esModule: true,
    default: { loadFont: () => Promise.resolve() },
    Ionicons: makeIcon('ionicons'),
    MaterialIcons: makeIcon('material'),
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const make = (tag: string) => {
    class SvgComponent extends React.Component<any> {
      render() {
        return React.createElement(View, { testID: `svg-${tag}` }, this.props.children);
      }
    }
    return SvgComponent;
  };
  const Svg = make('root');
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Circle: make('circle'),
    Rect: make('rect'),
    Path: make('path'),
    Text: make('text'),
    TSpan: make('tspan'),
    G: make('g'),
    Defs: make('defs'),
    Line: make('line'),
    Ellipse: make('ellipse'),
    Polygon: make('polygon'),
    Polyline: make('polyline'),
    ClipPath: make('clippath'),
    Mask: make('mask'),
    Pattern: make('pattern'),
    Symbol: make('symbol'),
    Use: make('use'),
    Image: make('image'),
    ForeignObject: make('foreignobject'),
    LinearGradient: make('lineargradient'),
    RadialGradient: make('radialgradient'),
    Stop: make('stop'),
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-audio', () => {
  const player = {
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    replace: jest.fn(),
    remove: jest.fn(),
    release: jest.fn(),
  };
  return {
    __esModule: true,
    createAudioPlayer: jest.fn(() => player),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    useAudioPlayer: () => player,
    useAudioPlayerStatus: () => ({ idle: true, playing: false }),
    AudioPlayer: player,
  };
});

jest.mock('expo-clipboard', () => ({
  __esModule: true,
  setStringAsync: jest.fn().mockResolvedValue(true),
  getStringAsync: jest.fn().mockResolvedValue(''),
  addListener: jest.fn(),
  removeListener: jest.fn(),
}));

jest.mock('expo-application', () => ({
  __esModule: true,
  applicationId: 'com.duaa.app',
  applicationName: 'DUAA | دعاء',
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
}));

jest.mock('expo-system-ui', () => ({
  __esModule: true,
  setBackgroundColorAsync: jest.fn().mockResolvedValue(undefined),
  getBackgroundColorAsync: jest.fn().mockResolvedValue('#F7F4EC'),
}));

jest.mock('expo-status-bar', () => ({
  __esModule: true,
  StatusBar: () => null,
  setStatusBarStyle: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  __esModule: true,
  preventAutoHideAsync: jest.fn().mockResolvedValue(true),
  hideAsync: jest.fn().mockResolvedValue(true),
  setOptions: jest.fn(),
}));

jest.mock('expo-font', () => ({
  __esModule: true,
  loadAsync: jest.fn().mockResolvedValue(undefined),
  isLoaded: jest.fn(() => true),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true, type: 'wifi' }),
  },
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true, type: 'wifi' }),
  useNetInfo: () => ({ isConnected: true, isInternetReachable: true, type: 'wifi' }),
}));

jest.mock('react-native-view-shot', () => ({
  __esModule: true,
  captureRef: jest.fn().mockResolvedValue('file:///tmp/card.png'),
  captureScreen: jest.fn().mockResolvedValue('file:///tmp/screen.png'),
}));

// Silence the intentional "capability not configured" warnings from the
// honest service implementations, and React's act() noise from RTL.
const originalError = console.error;
const originalWarn = console.warn;
const IGNORED = [
  'Not act(',
  'inside a test was not wrapped in act',
  'NOT_CONFIGURED',
  'not configured',
];

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    if (IGNORED.some((needle) => message.includes(needle))) return;
    originalError(...args);
  };
  console.warn = (...args: unknown[]) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    if (IGNORED.some((needle) => message.includes(needle))) return;
    originalWarn(...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

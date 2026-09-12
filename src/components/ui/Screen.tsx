import { forwardRef, type PropsWithChildren, type ReactElement } from 'react';
import {
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useAppTheme } from '@/design/theme/ThemeProvider';

export interface ScreenProps extends PropsWithChildren {
  /** Scrolls when true; plain View otherwise. */
  scroll?: boolean;
  /** Safe-area edges to respect. Tab screens drop `bottom`. */
  edges?: Edge[];
  /** Removes the horizontal gutter (full-bleed designs). */
  gutter?: boolean;
  /** Centers content inside `layout.maxContentWidth` on wide viewports. */
  centered?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** ScrollView props passthrough. */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  contentOffset?: { x: number; y: number };
  refreshControl?: ReactElement<RefreshControlProps>;
}

/**
 * App frame: themed background, safe-area, gutter, and a max content width so
 * the same screen reads well on a phone, a tablet and a desktop browser.
 */
export const Screen = forwardRef<ScrollView, ScreenProps>(function Screen(
  {
    scroll = false,
    edges = ['top', 'left', 'right'],
    gutter = true,
    centered = true,
    contentContainerStyle,
    style,
    children,
    ...rest
  },
  ref,
) {
  const theme = useAppTheme();

  const inner = (
    <View
      style={[
        gutter && { paddingHorizontal: theme.layout.screenGutter },
        centered && { maxWidth: theme.layout.maxContentWidth, width: '100%', alignSelf: 'center' },
        { flex: 1 },
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}
    >
      {scroll ? (
        <ScrollView
          ref={ref}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[{ paddingBottom: theme.spacing.xxxl }, contentContainerStyle]}
          {...rest}
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
});

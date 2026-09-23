import { memo } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { useI18n } from '@/core/i18n/I18nProvider';
import type { MessageKey } from '@/core/i18n/messages/ar';
import { AppText } from '@/components/ui/AppText';

import { a11yState } from '@/core/a11y/stateProps';

interface TabMeta {
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  /** Message key, resolved at render so labels follow the active language. */
  labelKey: MessageKey;
}

const TAB_META: Record<string, TabMeta> = {
  index: { icon: 'home-outline', iconActive: 'home', labelKey: 'nav.tab.home' },
  duas: { icon: 'book-outline', iconActive: 'book', labelKey: 'nav.tab.duas' },
  tasbeeh: { icon: 'repeat-outline', iconActive: 'repeat', labelKey: 'nav.tab.tasbeeh' },
  community: { icon: 'people-outline', iconActive: 'people', labelKey: 'nav.tab.community' },
  profile: { icon: 'person-outline', iconActive: 'person', labelKey: 'nav.tab.profile' },
};

/**
 * Custom bottom tab bar — identical on iOS, Android and web.
 *
 * Five destinations, 56pt row + safe-area inset, active state signalled by a
 * filled glyph plus a gold underline dot. Direction follows the app's RTL.
 */
export const BottomTabBar = memo(function BottomTabBar({
  state,
  navigation,
  descriptors,
}: BottomTabBarProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: theme.colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: theme.colors.tabBarBorder,
        paddingBottom: Platform.OS === 'web' ? theme.spacing.sm : Math.max(insets.bottom, theme.spacing.xs),
        ...(theme.shadows.sm as object),
      }}
      accessibilityRole="tablist"
    >
      <View
        style={{
          flexDirection: 'row',
          height: theme.layout.tabBarHeight,
          maxWidth: theme.layout.maxContentWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        {state.routes.map((route, routeIndex) => {
          const meta = TAB_META[route.name];
          const fallbackLabel = route.name;
          const isFocused = state.index === routeIndex;
          // React Navigation keys descriptors by route *key*, not route name.
          const descriptor = descriptors[route.key];
          const label =
            (descriptor?.options?.title as string | undefined) ??
            (meta ? t(meta.labelKey) : fallbackLabel);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              testID={`tab-${route.name}`}
              accessibilityRole="tab"
              accessibilityLabel={label}
              {...a11yState({ selected: isFocused })}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                backgroundColor: pressed ? theme.colors.pressed : 'transparent',
              })}
            >
              <View style={{ position: 'relative' }}>
                <Ionicons
                  name={isFocused ? (meta?.iconActive ?? 'ellipse') : (meta?.icon ?? 'ellipse-outline')}
                  size={22}
                  color={isFocused ? theme.colors.tabActive : theme.colors.tabInactive}
                />
              </View>
              <AppText
                weight={isFocused ? 'semiBold' : 'medium'}
                style={{
                  fontSize: 10.5,
                  color: isFocused ? theme.colors.tabActive : theme.colors.tabInactive,
                }}
              >
                {label}
              </AppText>
              <View
                style={{
                  position: 'absolute',
                  top: 2,
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isFocused ? theme.colors.accent : 'transparent',
                }}
                accessibilityElementsHidden
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

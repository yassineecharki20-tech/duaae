import { memo, useEffect, useRef, type PropsWithChildren } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { useI18n } from '@/core/i18n/I18nProvider';

export interface BottomSheetProps extends PropsWithChildren {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  subtitle?: string;
  /** Max height as a fraction of the window. */
  maxHeightRatio?: number;
  scrollable?: boolean;
  testID?: string;
}

/**
 * Modal bottom sheet used for actions (share, dhikr picker, font size…).
 *
 * Real modal semantics: focus is trapped by `Modal`, dismissal via scrim tap,
 * and the drag handle is decorative-but-labelled. Web renders it centred when
 * the viewport is wide.
 */
export const BottomSheet = memo(function BottomSheet({
  visible,
  onDismiss,
  title,
  subtitle,
  maxHeightRatio = 0.82,
  scrollable = true,
  children,
  testID,
}: BottomSheetProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    if (theme.reduceMotion) {
      slide.setValue(1);
      return;
    }
    slide.setValue(0);
    Animated.spring(slide, { toValue: 1, useNativeDriver: true, friction: 10, tension: 70 }).start();
  }, [visible, slide, theme.reduceMotion]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [320, 0] });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
      testID={testID}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          accessibilityLabel={t('common.close')}
          accessibilityRole="button"
          onPress={onDismiss}
          style={{
            flex: 1,
            backgroundColor: theme.colors.scrim,
            justifyContent: 'flex-end',
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            accessibilityRole="none"
            style={{ maxHeight: `${maxHeightRatio * 100}%` }}
          >
            <Animated.View
              style={{
                transform: [{ translateY: theme.reduceMotion ? 0 : translateY }],
                backgroundColor: theme.colors.surface,
                borderTopStartRadius: theme.radii.xl,
                borderTopEndRadius: theme.radii.xl,
                paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
                ...(theme.shadows.lg as object),
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  paddingTop: theme.spacing.md,
                  paddingBottom: theme.spacing.xs,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 4,
                    borderRadius: theme.radii.pill,
                    backgroundColor: theme.colors.borderStrong,
                  }}
                  accessibilityElementsHidden
                />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: theme.spacing.lg,
                  paddingBottom: theme.spacing.md,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="heading">{title}</AppText>
                  {subtitle ? (
                    <AppText tone="muted" style={{ fontSize: 13 }}>
                      {subtitle}
                    </AppText>
                  ) : null}
                </View>
                <IconButton
                  icon="close-outline"
                  onPress={onDismiss}
                  accessibilityLabel={t('common.closeSheet')}
                />
              </View>

              {scrollable ? (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={{ paddingHorizontal: theme.spacing.lg }}>{children}</View>
              )}
            </Animated.View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
});

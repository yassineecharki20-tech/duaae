import { useCallback, useMemo, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { useOnboardingStore } from '@/store/onboardingStore';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { DuaaMark } from '@/components/brand/DuaaLogo';
import { Illustration, type IllustrationKind } from '@/components/onboarding/Illustration';
import { useI18n } from '@/core/i18n/I18nProvider';
import type { Translate } from '@/core/i18n/options';

interface Slide {
  id: string;
  title: string;
  description: string;
  illustration: IllustrationKind;
}

/** Built per render so the slides follow the active language. */
function buildSlides(t: Translate): Slide[] {
  return [
  {
    id: 'rhythm',
    title: t('onboarding.slide1.title'),
    description: t('onboarding.slide1.body'),
    illustration: 'rhythm',
  },
  {
    id: 'library',
    title: t('onboarding.slide2.title'),
    description: t('onboarding.slide2.body'),
    illustration: 'library',
  },
  {
    id: 'reminder',
    title: t('onboarding.slide3.title'),
    description: t('onboarding.slide3.body'),
    illustration: 'reminder',
  },
  {
    id: 'share',
    title: t('onboarding.slide4.title'),
    description: t('onboarding.slide4.body'),
    illustration: 'share',
  },
  ];
}

/**
 * Onboarding — four swipeable slides.
 *
 * The pager is hand-rolled (translate + PanResponder) instead of a horizontal
 * ScrollView so paging behaves identically on RTL and LTR devices, on iOS,
 * Android and the web, where native scroll offsets flip under RTL.
 * Completion is stored locally; returning users never see this again.
 */
export default function OnboardingScreen() {
  const theme = useAppTheme();
  const { t } = useI18n();
  const slides = useMemo(() => buildSlides(t), [t]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [translate] = useState(() => new Animated.Value(0));
  const complete = useOnboardingStore((state) => state.complete);

  const isLast = index === slides.length - 1;

  const goTo = useCallback(
    (next: number, animated = true) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, next));
      setIndex(clamped);
      const target = -clamped * width;
      if (animated && !theme.reduceMotion) {
        Animated.spring(translate, { toValue: target, useNativeDriver: true, friction: 9, tension: 60 }).start();
      } else {
        translate.setValue(target);
      }
    },
    [translate, width, theme.reduceMotion],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dy) < 30,
        onPanResponderMove: (_evt, gesture) => {
          translate.setValue(-index * width + gesture.dx);
        },
        onPanResponderRelease: (_evt, gesture) => {
          const threshold = width / 4;
          if (gesture.dx < -threshold) goTo(index + 1);
          else if (gesture.dx > threshold) goTo(index - 1);
          else goTo(index);
        },
        onPanResponderTerminate: () => goTo(index),
      }),
    [goTo, index, translate, width],
  );

  const finish = useCallback(() => {
    complete();
    void services.analytics().track({ name: AnalyticsEvents.onboardingCompleted });
    void services.feedback().haptic('success');
    router.replace('/(tabs)');
  }, [complete]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
          paddingTop: Platform.OS === 'web' ? theme.spacing.lg : insets.top + theme.spacing.md,
        }}
      >
        <DuaaMark size={34} />
        {isLast ? (
          <View style={{ width: 56 }} />
        ) : (
          <Pressable
            onPress={finish}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.skip')}
            hitSlop={8}
            style={{ padding: theme.spacing.sm }}
          >
            <AppText tone="muted" weight="medium">
              {t('onboarding.skip')}
            </AppText>
          </Pressable>
        )}
      </View>

      <View style={{ flex: 1, overflow: 'hidden' }} {...panResponder.panHandlers}>
        <Animated.View
          style={{
            flexDirection: 'row',
            width: width * slides.length,
            transform: [{ translateX: translate }],
            flex: 1,
          }}
        >
          {slides.map((slide, slideIndex) => (
            <View
              key={slide.id}
              style={{
                width,
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.xl,
                paddingHorizontal: theme.spacing.xxxl,
              }}
              accessibilityRole="summary"
              accessibilityLabel={t('onboarding.slideAnnouncement', {
                index: slideIndex + 1,
                total: slides.length,
                title: slide.title,
                body: slide.description,
              })}
            >
              <Illustration kind={slide.illustration} size={230} />
              <View style={{ gap: theme.spacing.md, alignItems: 'center' }}>
                <AppText variant="title" align="center">
                  {slide.title}
                </AppText>
                <AppText tone="muted" align="center" style={{ maxWidth: 320, lineHeight: 26 }}>
                  {slide.description}
                </AppText>
              </View>
            </View>
          ))}
        </Animated.View>
      </View>

      <View
        style={{
          paddingHorizontal: theme.spacing.xxl,
          paddingBottom: Math.max(insets.bottom, theme.spacing.lg) + theme.spacing.md,
          gap: theme.spacing.lg,
          alignItems: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }} accessibilityElementsHidden>
          {slides.map((slide, slideIndex) => (
            <View
              key={slide.id}
              style={{
                width: slideIndex === index ? 22 : 7,
                height: 7,
                borderRadius: theme.radii.pill,
                backgroundColor: theme.colors.primary,
                opacity: slideIndex === index ? 1 : 0.4,
              }}
            />
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, width: '100%', maxWidth: 420 }}>
          {index > 0 ? (
            <Button
              label={t('common.previous')}
              variant="ghost"
              onPress={() => goTo(index - 1)}
              accessibilityLabel={t('onboarding.a11y.previousSlide')}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            {isLast ? (
              <Button label={t('onboarding.start')} onPress={finish} fullWidth size="lg" testID="onboarding-start" />
            ) : (
              <Button
                label={t('common.next')}
                onPress={() => goTo(index + 1)}
                fullWidth
                size="lg"
                accessibilityLabel={t('onboarding.a11y.nextSlide')}
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

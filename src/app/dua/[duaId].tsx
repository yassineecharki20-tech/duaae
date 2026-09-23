import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Segmented } from '@/components/ui/Controls';
import { EmptyState } from '@/components/ui/StateViews';
import { FavoriteButton } from '@/components/duas/FavoriteButton';
import { SourceLine, formatSourceReference } from '@/components/duas/SourceLine';
import { ShareSheet } from '@/components/share/ShareSheet';

import { CATEGORY_BY_ID, DUAS_BY_CATEGORY, DUA_BY_ID } from '@/data/content';
import { services } from '@/services/registry';
import { useSettingsStore } from '@/store/settingsStore';
import { readingScaleOptions, type ReadingScale } from '@/design/tokens/typography';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';
import { useToast } from '@/components/ui/Toast';

/**
 * Dua reader.
 *
 * Reading size, favorite, copy and share are all real and persisted where
 * relevant. Prev/next walks the same category. Sources are listed in full —
 * including Quranic citations — because attribution is part of the product.
 */
export default function DuaDetailScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ duaId: string }>();
  const toast = useToast();
  const [fontSheet, setFontSheet] = useState(false);
  const [shareSheet, setShareSheet] = useState(false);

  const dua = DUA_BY_ID.get(params.duaId ?? '');
  const category = dua ? CATEGORY_BY_ID.get(dua.categoryId) : undefined;
  const readingScale = useSettingsStore((state) => state.preferences.readingScale);
  const setReadingScale = useSettingsStore((state) => state.setReadingScale);

  const neighbours = useMemo(() => {
    if (!dua) return { previous: null as string | null, next: null as string | null };
    const list = DUAS_BY_CATEGORY.get(dua.categoryId);
    if (!list) return { previous: null, next: null };
    const index = list.findIndex((item) => item.id === dua.id);
    return {
      previous: index > 0 ? list[index - 1].id : null,
      next: index >= 0 && index < list.length - 1 ? list[index + 1].id : null,
    };
  }, [dua]);

  useEffect(() => {
    if (dua) {
      void services
        .analytics()
        .track({ name: AnalyticsEvents.duaViewed, params: { duaId: dua.id, category: dua.categoryId } });
    }
  }, [dua]);

  const copy = useCallback(async () => {
    if (!dua) return;
    const result = await services.clipboard().copy(dua.text);
    if (result.ok) {
      toast.show('تم نسخ الدعاء', 'success');
      void services.analytics().track({ name: AnalyticsEvents.duaCopied, params: { duaId: dua.id } });
    } else {
      toast.show(result.error.userMessage, 'error');
    }
  }, [dua, toast]);

  if (!dua) {
    return (
      <Screen>
        <AppHeader title="الدعاء" />
        <EmptyState
          icon="help-circle-outline"
          title="لم يتم العثور على الدعاء"
          description="ربما تغيّر المعرّف أو حُذف النص."
          actionLabel="العودة إلى الأدعية"
          onAction={() => router.replace('/duas')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll testID={`dua-${dua.id}`}>
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader
          title={dua.title ?? category?.title ?? 'دعاء'}
          subtitle={category?.title}
          actions={
            <>
              <IconButton
                icon="text-outline"
                accessibilityLabel="حجم الخط"
                onPress={() => setFontSheet(true)}
              />
              <IconButton
                icon="copy-outline"
                accessibilityLabel="نسخ الدعاء"
                onPress={() => void copy()}
              />
              <IconButton
                icon="share-social-outline"
                accessibilityLabel="مشاركة الدعاء"
                onPress={() => setShareSheet(true)}
              />
            </>
          }
        />
      </View>

      <View style={{ paddingTop: theme.spacing.xl, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
        <Card padding={theme.spacing.xxl} testID="dua-card">
          <View style={{ gap: theme.spacing.lg }}>
            {dua.title ? (
              <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
                <AppText variant="scriptureTitle" align="center">
                  ﴿ {dua.title} ﴾
                </AppText>
                {dua.repeat > 1 ? <Chip label={`يُقال ${dua.repeat} مرات`} tone="gold" /> : null}
              </View>
            ) : null}

            <AppText variant="scripture" align="center" selectable accessibilityRole="text">
              {dua.text}
            </AppText>

            {dua.virtue ? (
              <View
                style={{
                  backgroundColor: theme.colors.surfaceMuted,
                  borderRadius: theme.radii.md,
                  padding: theme.spacing.md,
                }}
              >
                <AppText tone="muted" style={{ fontSize: 13, lineHeight: 22 }}>
                  {dua.virtue}
                </AppText>
              </View>
            ) : null}

            <View style={{ gap: theme.spacing.xs }}>
              <AppText weight="semiBold" tone="muted" style={{ fontSize: 12 }}>
                المصدر
              </AppText>
              {dua.sources.map((source, index) => (
                <AppText key={index} tone="subtle" style={{ fontSize: 12.5, lineHeight: 20 }}>
                  • {formatSourceReference(source)}
                </AppText>
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <SourceLine sources={[]} repeat={dua.repeat} />
              <FavoriteButton duaId={dua.id} />
            </View>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              variant="outline"
              size="md"
              disabled={!neighbours.previous}
              accessibilityLabel="الدعاء السابق"
              onPress={() => neighbours.previous && router.setParams({ duaId: neighbours.previous })} label="السابق" />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="outline"
              size="md"
              disabled={!neighbours.next}
              accessibilityLabel="الدعاء التالي"
              onPress={() => neighbours.next && router.setParams({ duaId: neighbours.next })} label="التالي" />
          </View>
        </View>
      </View>

      <BottomSheet
        visible={fontSheet}
        onDismiss={() => setFontSheet(false)}
        title="حجم خط المصحف"
        subtitle="يُحفظ اختيارك لكل الأدعية"
        scrollable={false}
      >
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.lg }}>
          <Segmented
            options={readingScaleOptions.map((option) => ({ value: option.value, label: option.label }))}
            value={readingScale}
            onChange={(value) => setReadingScale(value as ReadingScale)}
            accessibilityLabel="حجم خط قراءة الأدعية"
          />
          <AppText variant="scripture" align="center">
            {dua.text.split('\n')[0]}
          </AppText>
        </View>
      </BottomSheet>

      <ShareSheet dua={dua} visible={shareSheet} onDismiss={() => setShareSheet(false)} />
    </Screen>
  );
}

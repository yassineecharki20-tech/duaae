import { memo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import type { DuaCategory } from '@/core/types/domain';
import { useAppTheme } from '@/design/theme/ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';

export interface CategoryCardProps {
  category: DuaCategory;
  testID?: string;
}

/** Category entry point. The count is real, computed from the corpus. */
export const CategoryCard = memo(function CategoryCard({ category, testID }: CategoryCardProps) {
  const theme = useAppTheme();
  const isSession = category.kind === 'session';

  return (
    <Card
      onPress={() => router.push(`/category/${category.id}`)}
      accessibilityLabel={`${category.title}. ${category.itemCount ?? 0} عنصرًا`}
      padding={theme.spacing.lg}
      variant={isSession ? 'primary' : 'surface'}
      testID={testID}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: theme.radii.md,
            backgroundColor: isSession ? 'rgba(255,255,255,0.14)' : theme.colors.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={category.icon as keyof typeof Ionicons.glyphMap}
            size={22}
            color={isSession ? theme.colors.onPrimary : theme.colors.primary}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText
            weight="semiBold"
            style={{ color: isSession ? theme.colors.onPrimary : theme.colors.text, fontSize: 16 }}
          >
            {category.title}
          </AppText>
          <AppText
            style={{
              color: isSession ? 'rgba(255,255,255,0.82)' : theme.colors.textMuted,
              fontSize: 12.5,
            }}
            numberOfLines={1}
          >
            {category.subtitle}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: theme.spacing.xs }}>
          <AppText
            weight="medium"
            style={{
              color: isSession ? 'rgba(255,255,255,0.9)' : theme.colors.textSubtle,
              fontSize: 12,
            }}
          >
            {category.itemCount ?? 0} ذكرًا
          </AppText>
          <Ionicons
            name="chevron-back"
            size={16}
            color={isSession ? 'rgba(255,255,255,0.8)' : theme.colors.textSubtle}
          />
        </View>
      </View>
    </Card>
  );
});

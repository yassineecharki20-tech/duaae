import { memo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import type { Dua } from '@/core/types/domain';
import { useAppTheme } from '@/design/theme/ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { SourceLine } from './SourceLine';
import { FavoriteButton } from './FavoriteButton';

export interface DuaListItemProps {
  dua: Dua;
  /** Show the category chip (used in search results / favorites). */
  showCategory?: boolean;
  categoryTitle?: string;
  /** Line clamp for list density. */
  lines?: number;
  testID?: string;
}

/** Compact dua row used in lists, search results and the favorites screen. */
export const DuaListItem = memo(function DuaListItem({
  dua,
  showCategory = false,
  categoryTitle,
  lines = 3,
  testID,
}: DuaListItemProps) {
  const theme = useAppTheme();

  return (
    <Card
      onPress={() => router.push(`/dua/${dua.id}`)}
      accessibilityLabel={dua.title ? `${dua.title}. فتح الدعاء` : 'فتح الدعاء'}
      padding={theme.spacing.lg}
      testID={testID}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          {dua.title ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <AppText variant="scriptureTitle" numberOfLines={1} style={{ flexShrink: 1 }}>
                {dua.title}
              </AppText>
              {dua.repeat > 1 ? <Chip label={`×${dua.repeat}`} tone="gold" /> : null}
            </View>
          ) : null}
          <AppText variant="scripture" numberOfLines={lines}>
            {dua.text.split('\n')[0]}
          </AppText>
          {showCategory && categoryTitle ? (
            <Chip label={categoryTitle} icon="pricetag-outline" />
          ) : null}
          <SourceLine sources={dua.sources} repeat={dua.repeat} compact />
        </View>
        <FavoriteButton duaId={dua.id} />
      </View>
    </Card>
  );
});

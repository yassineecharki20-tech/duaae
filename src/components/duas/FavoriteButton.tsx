import { memo, useCallback } from 'react';

import { useFavoritesStore } from '@/store/favoritesStore';
import { services } from '@/services/registry';
import { useToast } from '@/components/ui/Toast';
import { IconButton } from '@/components/ui/IconButton';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';

export interface FavoriteButtonProps {
  duaId: string;
  size?: number;
  iconSize?: number;
  /** Title used in the toast, e.g. the dua's category. */
  label?: string;
  testID?: string;
}

/**
 * Real favorites: persisted locally through FavoritesService, announced with a
 * toast and a haptic, and mirrored everywhere via the store subscription.
 */
export const FavoriteButton = memo(function FavoriteButton({
  duaId,
  size = 44,
  iconSize = 22,
  label,
  testID,
}: FavoriteButtonProps) {
  const isFavorite = useFavoritesStore((state) =>
    state.entries.some((entry) => entry.duaId === duaId),
  );
  const toggle = useFavoritesStore((state) => state.toggle);
  const toast = useToast();

  const onPress = useCallback(async () => {
    const result = await toggle(duaId);
    void services.feedback().haptic(result.isFavorite ? 'success' : 'light');
    void services
      .analytics()
      .track({
        name: result.isFavorite ? AnalyticsEvents.duaFavorited : AnalyticsEvents.duaUnfavorited,
        params: { duaId },
      });
    toast.show(
      result.isFavorite ? 'أُضيف إلى المفضلة' : 'أُزيل من المفضلة',
      result.isFavorite ? 'success' : 'info',
    );
  }, [duaId, toggle, toast]);

  return (
    <IconButton
      icon={isFavorite ? 'heart' : 'heart-outline'}
      onPress={onPress}
      accessibilityLabel={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
      accessibilityHint="يُحفظ على جهازك"
      tone={isFavorite ? 'danger' : 'default'}
      size={size}
      iconSize={iconSize}
      selected={isFavorite}
      testID={testID}
    />
  );
});

import { useEffect } from 'react';
import { router } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { useDailyDua } from '@/features/home/useDailyDua';

/**
 * Deep link: /dua/today — resolves the deterministic daily dua for the local
 * calendar day and hands off to the reader, so the shared URL always lands on
 * the same text as the home card.
 */
export default function TodayDuaRoute() {
  const { dailyDua, loading } = useDailyDua();

  useEffect(() => {
    if (!loading && dailyDua) router.replace(`/dua/${dailyDua.id}`);
  }, [dailyDua, loading]);

  return (
    <Screen>
      <AppText tone="muted">{loading ? 'جارٍ تحضير دعاء اليوم…' : 'جارٍ فتح الدعاء…'}</AppText>
    </Screen>
  );
}

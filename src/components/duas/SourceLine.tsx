import { memo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { SourceReference } from '@/core/types/domain';
import { useAppTheme } from '@/design/theme/ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { useI18n } from '@/core/i18n/I18nProvider';
import { translate, translatePlural } from '@/core/i18n/state';

export function formatSourceReference(reference: SourceReference): string {
  if (reference.quran) {
    return translate('duas.source.quran', { surah: reference.quran.surah, ayah: reference.quran.ayah });
  }
  const parts = [reference.book];
  if (reference.number) parts.push(`(${reference.number})`);
  if (reference.grade) parts.push(reference.grade);
  return parts.join(' ');
}

/**
 * Religious attribution line. Rendered for every dua that has a source, never
 * invented: the data layer validates that each entry carries at least one.
 */
export const SourceLine = memo(function SourceLine({
  sources,
  repeat,
  compact = false,
}: {
  sources: SourceReference[];
  repeat?: number;
  compact?: boolean;
}) {
  const theme = useAppTheme();
  const { t } = useI18n();
  if (sources.length === 0 && (!repeat || repeat <= 1)) return null;

  const text = [
    sources.length > 0 ? sources.map(formatSourceReference).join(' · ') : null,
    repeat && repeat > 1 ? translatePlural('duas.repeatTimes', repeat) : null,
  ]
    .filter(Boolean)
    .join(' — ');

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }} accessibilityLabel={t('duas.source.label', { text })}>
      <Ionicons name="book-outline" size={compact ? 12 : 14} color={theme.colors.textSubtle} />
      <AppText
        tone="subtle"
        style={{ fontSize: compact ? 11 : 12 }}
        numberOfLines={compact ? 1 : 2}
      >
        {text}
      </AppText>
    </View>
  );
});

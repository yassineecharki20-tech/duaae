import { memo, useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

import type { Dua } from '@/core/types/domain';
import { AppError } from '@/core/errors/AppError';
import { services } from '@/services/registry';
import { useAppTheme } from '@/design/theme/ThemeProvider';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';
import { buildShareText } from '@/features/share/shareText';
import { CATEGORY_BY_ID } from '@/data/content';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ShareCardView } from './ShareCardView';
import { useI18n } from '@/core/i18n/I18nProvider';

export interface ShareSheetProps {
  dua: Dua | null;
  visible: boolean;
  onDismiss: () => void;
}

/**
 * The share flow.
 *
 * Four real outcomes, each reported honestly through the toast:
 * share as card, save the card, share as plain text, copy the text.
 * Failures surface the AppError message — nothing pretends to have shared.
 */
export const ShareSheet = memo(function ShareSheet({ dua, visible, onDismiss }: ShareSheetProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const toast = useToast();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState<'card' | 'save' | 'text' | 'copy' | null>(null);

  const categoryTitle = dua ? CATEGORY_BY_ID.get(dua.categoryId)?.title : undefined;

  const run = useCallback(
    async (kind: 'card' | 'save' | 'text' | 'copy') => {
      if (!dua) return;
      setBusy(kind);
      try {
        if (kind === 'card') {
          const result = await services.share().shareAsCard(dua, {
            scheme: theme.isDark ? 'dark' : 'light',
          });
          if (result.ok) toast.show(result.data.message, 'success');
          else toast.show(result.error.userMessage, 'error');
          void services.analytics().track({ name: AnalyticsEvents.duaShared, params: { duaId: dua.id, format: 'card' } });
        } else if (kind === 'save') {
          const result = await services.share().saveCard(dua, {
            scheme: theme.isDark ? 'dark' : 'light',
          });
          if (result.ok) toast.show(result.data.message, 'success');
          else toast.show(result.error.userMessage, 'error');
        } else if (kind === 'text') {
          const result = await services.share().shareAsText(dua);
          if (result.ok) toast.show(result.data.message, result.data.status === 'cancelled' ? 'info' : 'success');
          else toast.show(result.error.userMessage, 'error');
          void services.analytics().track({ name: AnalyticsEvents.duaShared, params: { duaId: dua.id, format: 'text' } });
        } else {
          const text = buildShareText(dua, { categoryTitle });
          const result = await services.clipboard().copy(text);
          if (result.ok) {
            toast.show(t('share.copied'), 'success');
            void services.analytics().track({ name: AnalyticsEvents.duaCopied, params: { duaId: dua.id } });
          } else {
            toast.show(result.error.userMessage, 'error');
          }
        }
      } catch (cause) {
        toast.show(AppError.from(cause).userMessage, 'error');
      } finally {
        setBusy(null);
      }
    },
    [dua, categoryTitle, theme.isDark, toast],
  );

  return (
    <BottomSheet
      visible={visible && dua !== null}
      onDismiss={onDismiss}
      title={t('reader.share')}
      subtitle={dua?.title ?? categoryTitle}
      maxHeightRatio={0.9}
    >
      {dua ? (
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.lg }}>
          <ShareCardView ref={cardRef} dua={dua} categoryTitle={categoryTitle} />

          <View style={{ gap: theme.spacing.sm }}>
            <Button
              label={t('share.asCard')}
              icon="image-outline"
              onPress={() => run('card')}
              loading={busy === 'card'}
              fullWidth
              accessibilityHint={t('share.asCardSubtitle')}
            />
            <Button
              label={t('share.saveCard')}
              icon="download-outline"
              variant="secondary"
              onPress={() => run('save')}
              loading={busy === 'save'}
              fullWidth
            />
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button
                label={t('share.asText')}
                icon="share-social-outline"
                variant="outline"
                onPress={() => run('text')}
                loading={busy === 'text'}
                fullWidth
              />
              <Button
                label={t('share.copyText')}
                icon="copy-outline"
                variant="ghost"
                onPress={() => run('copy')}
                loading={busy === 'copy'}
                fullWidth
              />
            </View>
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
});

import { Platform } from 'react-native';

import { useI18n } from '@/core/i18n/I18nProvider';
import { isRTL } from '@/core/i18n/rtl';

/**
 * Directional flag for layout decisions (icon mirroring, start/end paddings).
 *
 * Reactive: calling `useI18n()` subscribes the component to language changes,
 * so switching Arabic ↔ French/English re-renders it with the new direction.
 *
 * On native the value reports what the runtime has actually applied
 * (`I18nManager.isRTL`), not what the language implies — a forced direction
 * only takes effect on the next launch, and mirroring icons against a layout
 * that has not flipped yet would look broken. On web the DOM is flipped live,
 * so the language-derived direction is the correct one.
 */
export function useIsRTL(): boolean {
  const { isRTL: wantsRTL } = useI18n();
  return Platform.OS === 'web' ? wantsRTL : isRTL();
}

/**
 * Tasbeeh presets — the five phrases the product spec calls for, in order.
 * `note` gives the user the traditional virtue; sources are classical and the
 * counts are the well-known sunnah targets offered as defaults, not limits.
 */

import type { Dhikr } from '@/core/types/domain';

export const TASBEEH_PRESETS: readonly Dhikr[] = [
  { id: 'preset-subhanallah', label: 'سُبْحَانَ اللَّهِ', isPreset: true, note: 'من قالها مائة مرة حُطّت خطاياه وإن كانت مثل زبد البحر.' },
  { id: 'preset-alhamdulillah', label: 'الْحَمْدُ لِلَّهِ', isPreset: true, note: 'تملأ الميزان.' },
  { id: 'preset-allahuakbar', label: 'اللَّهُ أَكْبَرُ', isPreset: true, note: 'كلمتان خفيفتان على اللسان، ثقيلتان في الميزان.' },
  { id: 'preset-la-ilaha', label: 'لَا إِلَهَ إِلَّا اللَّهُ', isPreset: true, note: 'أفضل الذكر لا إله إلا الله.' },
  { id: 'preset-istighfar', label: 'أَسْتَغْفِرُ اللَّهَ', isPreset: true, note: 'من لزم الاستغفار جعل الله له من كل همٍّ فرجًا.' },
] as const;

export const DEFAULT_DHIKR_ID = TASBEEH_PRESETS[0].id;

/** Default and offered targets. */
export const TASBEEH_TARGETS: readonly number[] = [33, 99, 100, 500, 1000];
export const DEFAULT_TARGET = 33;

export function findDhikr(
  presets: readonly Dhikr[],
  custom: readonly Dhikr[],
  id: string,
): Dhikr | undefined {
  return presets.find((item) => item.id === id) ?? custom.find((item) => item.id === id);
}

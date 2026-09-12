/**
 * DUAA — Category catalogue.
 *
 * Order matches the product spec. `kind: 'session'` categories get repetition
 * tracking and a daily completion state; `collection` categories are browsed.
 */

import { category } from './authoring';
import type { DuaCategory } from '@/core/types/domain';

export const CATEGORIES: readonly DuaCategory[] = [
  category({
    id: 'morning',
    title: 'أذكار الصباح',
    subtitle: 'تُقال بعد الفجر إلى الشروق',
    icon: 'sunny-outline',
    order: 1,
    kind: 'session',
    sessionKey: 'morning',
  }),
  category({
    id: 'evening',
    title: 'أذكار المساء',
    subtitle: 'تُقال بعد العصر إلى المغرب',
    icon: 'moon-outline',
    order: 2,
    kind: 'session',
    sessionKey: 'evening',
  }),
  category({
    id: 'sleep',
    title: 'أذكار النوم',
    subtitle: 'ما يُقال عند النوم والاستيقاظ',
    icon: 'bed-outline',
    order: 3,
    kind: 'session',
    sessionKey: 'sleep',
  }),
  category({
    id: 'travel',
    title: 'أدعية السفر',
    subtitle: 'ركوب الدابة ودعاء السفر والرجوع',
    icon: 'airplane-outline',
    order: 4,
  }),
  category({
    id: 'rizq',
    title: 'أدعية الرزق',
    subtitle: 'سعة الرزق والبركة والكفاية',
    icon: 'leaf-outline',
    order: 5,
  }),
  category({
    id: 'parents',
    title: 'أدعية الوالدين',
    subtitle: 'البرّ والدعاء للوالدين',
    icon: 'people-outline',
    order: 6,
  }),
  category({
    id: 'success',
    title: 'أدعية النجاح',
    subtitle: 'التوفيق والشرح والتيسير',
    icon: 'school-outline',
    order: 7,
  }),
  category({
    id: 'healing',
    title: 'أدعية الشفاء',
    subtitle: 'الرقية وشفاء المريض',
    icon: 'medkit-outline',
    order: 8,
  }),
  category({
    id: 'forgiveness',
    title: 'أدعية المغفرة',
    subtitle: 'الاستغفار والتوبة',
    icon: 'water-outline',
    order: 9,
  }),
  category({
    id: 'relief',
    title: 'تفريج الهم',
    subtitle: 'دعاء الكرب وزوال الهمّ والحزن',
    icon: 'heart-outline',
    order: 10,
  }),
  category({
    id: 'prayer',
    title: 'أدعية الصلاة',
    subtitle: 'الصلاة على النبي وأدعية الصلاة',
    icon: 'sparkles-outline',
    order: 11,
  }),
  category({
    id: 'general',
    title: 'أدعية عامة',
    subtitle: 'جوامع الدعاء من القرآن والسنة',
    icon: 'book-outline',
    order: 12,
  }),
] as const;

export const CATEGORY_IDS = CATEGORIES.map((item) => item.id) as string[];

export const SESSION_CATEGORY_IDS = CATEGORIES.filter((item) => item.kind === 'session').map(
  (item) => item.id,
);

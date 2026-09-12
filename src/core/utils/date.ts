/**
 * DUAA — Date & time helpers.
 *
 * All "daily" behaviour is derived from the local calendar day so it is stable
 * across restarts and identical on every device for the same date.
 */

/** `YYYY-MM-DD` in local time — the canonical day key. */
export function dayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

/**
 * Deterministic 32-bit hash (FNV-1a). Used to pick the daily dua without any
 * server, so the same day always yields the same dua even offline.
 */
export function stableHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Pick one item per day, deterministically. */
export function pickDaily<T>(items: readonly T[], seed: string = dayKey()): T | undefined {
  if (items.length === 0) return undefined;
  return items[stableHash(seed) % items.length];
}

export type DayPart = 'night' | 'fajr' | 'morning' | 'noon' | 'afternoon' | 'evening';

/** Coarse time-of-day bucket used for greetings and session hints. */
export function getDayPart(date: Date = new Date()): DayPart {
  const hour = date.getHours();
  if (hour < 4) return 'night';
  if (hour < 7) return 'fajr';
  if (hour < 12) return 'morning';
  if (hour < 15) return 'noon';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function getGreeting(date: Date = new Date()): string {
  switch (getDayPart(date)) {
    case 'night':
    case 'fajr':
      return 'صباح الخير';
    case 'morning':
    case 'noon':
      return 'صباح الخير';
    case 'afternoon':
    case 'evening':
      return 'مساء الخير';
    default:
      return 'السلام عليكم';
  }
}

/** Is `hour` inside `[start, end]`, wrapping across midnight? */
export function isHourInWindow(hour: number, start: number, end: number): boolean {
  if (start === end) return hour === start;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

/** Parse an `HH:mm` string into minutes; returns null when malformed. */
export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatTime(value: string): string {
  const minutes = parseTimeToMinutes(value);
  if (minutes === null) return value;
  const total = ((minutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const mm = `${total % 60}`.padStart(2, '0');
  const period = h24 < 12 ? 'ص' : 'م';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${period}`;
}

/** Human relative label in Arabic: "اليوم", "أمس", "قبل ٣ أيام", ... */
export function formatRelativeDay(isoDate: string, now: Date = new Date()): string {
  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) return '';
  const diffDays = Math.round((dayStartOf(now).getTime() - dayStartOf(then).getTime()) / 86_400_000);
  if (diffDays === 0) return 'اليوم';
  if (diffDays === 1) return 'أمس';
  if (diffDays < 0) return 'قريبًا';
  if (diffDays < 7) return `قبل ${diffDays} أيام`;
  if (diffDays < 30) return `قبل ${Math.floor(diffDays / 7)} أسابيع`;
  return then.toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });
}

function dayStartOf(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** `HH:mm` for a Date. */
export function toTimeInput(date: Date = new Date()): string {
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}

export function addMinutesToTime(time: string, delta: number): string {
  const minutes = parseTimeToMinutes(time) ?? 0;
  const total = (((minutes + delta) % 1440) + 1440) % 1440;
  return `${`${Math.floor(total / 60)}`.padStart(2, '0')}:${`${total % 60}`.padStart(2, '0')}`;
}

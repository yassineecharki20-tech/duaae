import {
  addMinutesToTime,
  dayKey,
  formatTime,
  getDayPart,
  isHourInWindow,
  isSameDay,
  parseTimeToMinutes,
  pickDaily,
  stableHash,
  toTimeInput,
} from '@/core/utils/date';

describe('dayKey', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    expect(dayKey(new Date(2026, 8, 3, 9, 12))).toBe('2026-09-03');
    expect(dayKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('treats two moments of the same local day as equal', () => {
    expect(isSameDay(new Date(2026, 8, 12, 0, 1), new Date(2026, 8, 12, 23, 59))).toBe(true);
    expect(isSameDay(new Date(2026, 8, 12, 23, 59), new Date(2026, 8, 13, 0, 1))).toBe(false);
  });
});

describe('stableHash', () => {
  it('is deterministic and unsigned', () => {
    const a = stableHash('2026-09-12');
    expect(a).toBe(stableHash('2026-09-12'));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(a)).toBe(true);
  });

  it('gives different seeds different hashes', () => {
    expect(stableHash('2026-09-12')).not.toBe(stableHash('2026-09-13'));
  });
});

describe('pickDaily', () => {
  const pool = ['a', 'b', 'c', 'd', 'e'];

  it('returns the same item for the same seed', () => {
    expect(pickDaily(pool, '2026-09-12')).toBe(pickDaily(pool, '2026-09-12'));
  });

  it('stays inside the pool for many consecutive days', () => {
    for (let day = 1; day <= 60; day += 1) {
      const seed = `2026-09-${String(day).padStart(2, '0')}`;
      const picked = pickDaily(pool, seed);
      expect(pool).toContain(picked);
    }
  });

  it('rotates across a long run of days instead of sticking to one item', () => {
    const seen = new Set<string>();
    for (let day = 0; day < 200; day += 1) {
      seen.add(pickDaily(pool, `seed-${day}`) as string);
    }
    expect(seen.size).toBe(pool.length);
  });

  it('returns undefined for an empty pool', () => {
    expect(pickDaily([], 'seed')).toBeUndefined();
  });
});

describe('getDayPart', () => {
  it('buckets the day the way the greeting copy expects', () => {
    expect(getDayPart(new Date(2026, 8, 12, 2))).toBe('night');
    expect(getDayPart(new Date(2026, 8, 12, 5))).toBe('fajr');
    expect(getDayPart(new Date(2026, 8, 12, 9))).toBe('morning');
    expect(getDayPart(new Date(2026, 8, 12, 13))).toBe('noon');
    expect(getDayPart(new Date(2026, 8, 12, 16))).toBe('afternoon');
    expect(getDayPart(new Date(2026, 8, 12, 20))).toBe('evening');
  });
});

describe('isHourInWindow', () => {
  it('handles a normal window', () => {
    expect(isHourInWindow(6, 4, 12)).toBe(true);
    expect(isHourInWindow(13, 4, 12)).toBe(false);
  });

  it('handles a window that wraps past midnight (sleep azkar)', () => {
    expect(isHourInWindow(22, 21, 4)).toBe(true);
    expect(isHourInWindow(2, 21, 4)).toBe(true);
    expect(isHourInWindow(12, 21, 4)).toBe(false);
  });

  it('treats the start hour as inclusive', () => {
    expect(isHourInWindow(4, 4, 12)).toBe(true);
  });
});

describe('parseTimeToMinutes', () => {
  it('parses HH:mm in 24h local time', () => {
    expect(parseTimeToMinutes('07:30')).toBe(450);
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });

  it('rejects malformed or out-of-range input', () => {
    expect(parseTimeToMinutes('')).toBeNull();
    expect(parseTimeToMinutes('7')).toBeNull();
    expect(parseTimeToMinutes('24:00')).toBeNull();
    expect(parseTimeToMinutes('12:60')).toBeNull();
    expect(parseTimeToMinutes('ab:cd')).toBeNull();
  });
});

describe('formatTime', () => {
  it('renders a 12h label with an Arabic period marker', () => {
    expect(formatTime('07:30')).toBe('7:30 ص');
    expect(formatTime('17:05')).toBe('5:05 م');
    expect(formatTime('00:15')).toBe('12:15 ص');
    expect(formatTime('12:00')).toBe('12:00 م');
  });

  it('falls back to the raw value when unparseable', () => {
    expect(formatTime('not-a-time')).toBe('not-a-time');
  });
});

describe('addMinutesToTime', () => {
  it('wraps around midnight', () => {
    expect(addMinutesToTime('23:30', 60)).toBe('00:30');
    expect(addMinutesToTime('00:15', -30)).toBe('23:45');
  });

  it('treats an unparsable time as midnight rather than throwing', () => {
    expect(addMinutesToTime('nope', 10)).toBe('00:10');
  });
});

describe('toTimeInput', () => {
  it('produces a value parseTimeToMinutes accepts', () => {
    const value = toTimeInput(new Date(2026, 8, 12, 9, 5));
    expect(value).toBe('09:05');
    expect(parseTimeToMinutes(value)).toBe(545);
  });
});

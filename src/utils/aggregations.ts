import type { Timestamp } from 'firebase/firestore';
import { formatShortDate, getStartOfDay } from './dates';

export interface DailyTotal {
  dateKey: string;
  label: string;
  total: number;
}

export function groupByDayTotal<T extends { recordedAt: Timestamp }>(
  entries: T[],
  getValue: (entry: T) => number,
): DailyTotal[] {
  const totals = new Map<string, DailyTotal>();

  for (const entry of entries) {
    const day = getStartOfDay(entry.recordedAt.toDate());
    const dateKey = day.toISOString();
    const existing = totals.get(dateKey);
    if (existing) {
      existing.total += getValue(entry);
    } else {
      totals.set(dateKey, { dateKey, label: formatShortDate(day), total: getValue(entry) });
    }
  }

  return Array.from(totals.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

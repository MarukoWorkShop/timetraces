import type { Tag, CheckInRecord } from '../types';
import { isTagActiveToday } from './tagUtils';
import { parseDateString, toDateString } from './dateUtils';

export function getConsecutiveCheckInDays(
  tag: Tag,
  records: CheckInRecord[],
  asOfDateStr?: string
): number {
  const asOf = asOfDateStr ?? toDateString(new Date());
  const byDate = new Set(records.map((r) => r.date));
  let count = 0;
  let d = parseDateString(asOf);
  while (true) {
    const dateStr = toDateString(d);
    const active = isTagActiveToday(tag, dateStr);
    if (active && !byDate.has(dateStr)) break;
    if (active) count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

export function getThisWeekRange(referenceDateStr?: string): [string, string] {
  const ref = referenceDateStr ?? toDateString(new Date());
  const d = parseDateString(ref);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const start = toDateString(d);
  d.setDate(d.getDate() + 6);
  const end = toDateString(d);
  return [start, end];
}

export function getWeeklySuccessRate(
  tag: Tag,
  records: CheckInRecord[],
  referenceDateStr?: string
): { success: number; total: number; rate: number } {
  const [startStr, endStr] = getThisWeekRange(referenceDateStr);
  const byDate = new Set(records.filter((r) => r.tagId === tag.id).map((r) => r.date));
  let total = 0;
  let success = 0;
  let d = parseDateString(startStr);
  const endTime = parseDateString(endStr).getTime();
  while (d.getTime() <= endTime) {
    const dateStr = toDateString(d);
    if (isTagActiveToday(tag, dateStr)) {
      total++;
      if (byDate.has(dateStr)) success++;
    }
    d.setDate(d.getDate() + 1);
  }
  const rate = total === 0 ? 1 : success / total;
  return { success, total, rate };
}

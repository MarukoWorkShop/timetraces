/**
 * 日期工具：ISO 日期字符串 YYYY-MM-DD 与星期、周数计算。
 * “当日”以本地 0:00 为界，即日历日（24 小时内）。
 */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 获取日期的星期几，0=周日, 1=周一, ..., 6=周六 */
export function getWeekday(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay();
}

/** 解析 YYYY-MM-DD 为 Date（中午 12 点，避免时区导致日期漂移） */
export function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

/** 某日期所在年的第几周（周一为一周起始，1-based） */
export function getWeekNumberInYear(dateStr: string): number {
  const d = parseDateString(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  const jan1 = new Date(monday.getFullYear(), 0, 1);
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.floor((monday.getTime() - jan1.getTime()) / msPerDay);
  return Math.floor(days / 7) + 1;
}

/**
 * 计算从 startDate 到 dateStr 经过的完整周数（向下取整）。
 */
export function getWeeksSinceStart(startDateStr: string, dateStr: string): number {
  const start = parseDateString(startDateStr).getTime();
  const end = parseDateString(dateStr).getTime();
  const diffMs = end - start;
  if (diffMs < 0) return -1;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return Math.floor(diffDays / 7);
}

/** 格式化为 HH:mm，用于打卡时间段展示与存储 */
export function formatTimeHM(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** HH:mm 转为当日分钟数，用于排序与区间比较 */
export function timeToMinutes(timeStr: string): number {
  const [h = 0, m = 0] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/** 在 HH:mm 上加上分钟数，同一天内，超过 24:00 则截断为 23:59 */
export function addMinutesToTime(timeStr: string, minutes: number): string {
  const total = timeToMinutes(timeStr) + minutes;
  const capped = Math.min(Math.max(0, total), 24 * 60 - 1);
  const h = Math.floor(capped / 60);
  const m = capped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 两段 HH:mm 之间的分钟数（end - start），若 end < start 返回 0 */
export function getDurationMinutes(startStr: string, endStr: string): number {
  const diff = timeToMinutes(endStr) - timeToMinutes(startStr);
  return Math.max(0, diff);
}

/** 两段时间 [s1,e1] 与 [s2,e2]（HH:mm）是否有交集 */
export function timeRangesOverlap(
  s1: string,
  e1: string,
  s2: string,
  e2: string
): boolean {
  const a1 = timeToMinutes(s1);
  const b1 = timeToMinutes(e1);
  const a2 = timeToMinutes(s2);
  const b2 = timeToMinutes(e2);
  return a1 < b2 && a2 < b1;
}

/** 从今天到 endDateStr（YYYY-MM-DD）的天数，已过期为负数 */
export function daysUntil(endDateStr: string, fromDate?: Date): number {
  const to = parseDateString(endDateStr).getTime();
  const from = (fromDate || new Date()).setHours(0, 0, 0, 0);
  return Math.floor((to - from) / (24 * 60 * 60 * 1000));
}

/** 两个日期字符串之间的天数（end - start），用于紧急度计算 */
export function daysBetween(startDateStr: string, endDateStr: string): number {
  const start = parseDateString(startDateStr).getTime();
  const end = parseDateString(endDateStr).getTime();
  return Math.floor((end - start) / (24 * 60 * 60 * 1000));
}

/** 某标签从指定日期起连续打卡天数（按日历日连续） */
export function getStreakForTag(
  tagId: string,
  records: { tagId: string; date: string }[],
  refDate: string
): number {
  const dateSet = new Set(
    records.filter((r) => r.tagId === tagId).map((r) => r.date)
  );
  if (!dateSet.has(refDate)) return 0;
  let streak = 0;
  let check = refDate;
  while (dateSet.has(check)) {
    streak++;
    const d = parseDateString(check);
    d.setDate(d.getDate() - 1);
    check = toDateString(d);
  }
  return streak;
}

/** 某标签历史最长连续打卡天数 */
export function getBestStreakForTag(
  tagId: string,
  records: { tagId: string; date: string }[]
): number {
  const dates = [...new Set(records.filter((r) => r.tagId === tagId).map((r) => r.date))].sort();
  if (dates.length === 0) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = parseDateString(dates[i - 1]);
    prev.setDate(prev.getDate() + 1);
    if (toDateString(prev) === dates[i]) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
}

/** 日期字符串加 N 天，返回 YYYY-MM-DD */
export function addDays(dateStr: string, days: number): string {
  const d = parseDateString(dateStr);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/** 格式化为「X月X日」用于展示 */
export function formatMonthDay(dateStr: string): string {
  const d = parseDateString(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 格式化为「M.dd」手账大号日期，如 1.31 */
export function formatShortDate(dateStr: string): string {
  const d = parseDateString(dateStr);
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 格式化为「YYYY.MM.DD」印章用，如 2026.01.31 */
export function formatStamp(dateStr: string): string {
  const d = parseDateString(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

const WEEKDAY_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 星期短标签，如 周六 */
export function getWeekdayShort(dateStr: string): string {
  return WEEKDAY_SHORT[getWeekday(dateStr)];
}

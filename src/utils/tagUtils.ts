import type { Tag } from '../types';
import { getWeekday, getWeeksSinceStart, toDateString } from './dateUtils';

/** 日记标签名称关键词 → 45R 可选颜色（用于标签卡片/圆环） */
const TAG_NAME_TO_COLOR: Record<string, 'tag-life' | 'tag-light'> = {
  '情绪记录': 'tag-life',
  '情绪': 'tag-life',
  '日常记录': 'tag-light',
  '日常': 'tag-light',
};

/** 根据标签名称获取展示用颜色，无映射时返回 null（使用 owner 默认色） */
export function getTagColorByName(tagName: string): 'tag-life' | 'tag-light' | null {
  if (!tagName?.trim()) return null;
  const key = Object.keys(TAG_NAME_TO_COLOR).sort((a, b) => b.length - a.length).find((k) => tagName.includes(k) || tagName === k);
  return key ? TAG_NAME_TO_COLOR[key] : null;
}

export function isTagActiveToday(tag: Tag, dateStr?: string): boolean {
  const target = dateStr ?? toDateString(new Date());
  const weekday = getWeekday(target);
  const { frequency } = tag;
  if (frequency.kind === 'weekly') return frequency.activeWeekdays.includes(weekday);
  if (frequency.kind === 'everyNWeeks') {
    const weeks = getWeeksSinceStart(frequency.startDate, target);
    if (weeks < 0) return false;
    if (weeks % frequency.interval !== 0) return false;
    const weekdays = frequency.activeWeekdays ?? [0, 1, 2, 3, 4, 5, 6];
    return weekdays.includes(weekday);
  }
  return false;
}

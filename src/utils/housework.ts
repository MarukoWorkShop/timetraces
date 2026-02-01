import type { HouseworkTask } from '@/types';
import { daysBetween, addDays } from './dateUtils';
import { formatMonthDay } from './dateUtils';

/** 计算下一次提醒日期：从未完成用 startDate + frequencyDays，已完成用 lastDoneDate + frequencyDays */
export function calculateNextReminderDate(task: HouseworkTask, _today: string): string {
  if (task.frequencyDays === 0) {
    return task.startDate ?? task.createdAt;
  }
  const refDate = task.lastDoneDate ?? (task.startDate ?? task.createdAt);
  return addDays(refDate, task.frequencyDays);
}

/**
 * 紧急度分数：基于「当前周期内已过天数 / frequencyDays」
 * 周期起点 = nextReminderDate - frequencyDays，today 越接近 nextReminderDate 分数越接近 1，超过则 >1
 * 距离 nextReminderDate 越近，字体颜色越深
 */
export function getUrgencyScore(task: HouseworkTask, today: string): number {
  if (task.frequencyDays === 0) {
    return task.lastDoneDate ? 0 : 1;
  }
  const nextReminderDate = calculateNextReminderDate(task, today);
  const cycleStart = addDays(nextReminderDate, -task.frequencyDays);
  const daysIntoCycle = Math.max(0, daysBetween(cycleStart, today));
  return daysIntoCycle / task.frequencyDays;
}

/** 根据紧急度分数返回 Tailwind 背景与文字类名（45R tag-task 墨绿） */
export function getUrgencyClasses(score: number): { bg: string; text: string } {
  if (score < 0.5) return { bg: 'bg-status-pending', text: 'text-ink' };
  if (score < 0.9) return { bg: 'bg-orange-50', text: 'text-ink' };
  return { bg: 'bg-tag-task', text: 'text-white' };
}

export interface TaskDisplayInfo {
  /** 下一次提醒日期 YYYY-MM-DD */
  nextReminderDate: string;
  /** 是否已过期（today > nextReminderDate） */
  isExpired: boolean;
  /** 今日是否已完成 */
  isCompletedToday: boolean;
  /** 展示文案：下一次提醒：XX月XX日 或 已过期，要不要重新计时？ */
  label: string;
  /** 过期时需展示「重新计时」按钮 */
  action?: 'RESTART_TIMER';
  /** 文字颜色类名 */
  colorClass: string;
  /** 紧急度分数（未过期时用于背景色） */
  urgencyScore: number;
}

export function getTaskDisplayInfo(task: HouseworkTask, today: string): TaskDisplayInfo {
  const nextReminderDate = calculateNextReminderDate(task, today);
  const isCompletedToday = task.lastDoneDate === today;
  const isExpired = task.frequencyDays > 0 && today > nextReminderDate;
  const urgencyScore = getUrgencyScore(task, today);

  if (isExpired) {
    return {
      nextReminderDate,
      isExpired: true,
      isCompletedToday,
      label: '已过期，要不要重新计时？',
      action: 'RESTART_TIMER',
      colorClass: 'text-orange-600',
      urgencyScore,
    };
  }

  return {
    nextReminderDate,
    isExpired: false,
    isCompletedToday,
    label: `下一次提醒：${formatMonthDay(nextReminderDate)}`,
    colorClass: isCompletedToday ? 'text-status-done' : 'text-ink',
    urgencyScore,
  };
}

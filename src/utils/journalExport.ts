import type { CheckInRecord, JournalExportRecord } from '@/types';
import { getStreakForTag } from './dateUtils';

function scoreToText(score: number): string {
  if (score <= 20) return '状态不太好';
  if (score <= 40) return '马马虎虎';
  if (score <= 59) return '还行吧';
  if (score <= 75) return '及格啦';
  if (score <= 90) return '很棒';
  return '完美';
}

/** 将打卡记录转换为导出格式（含 tagName、streak、todayCount、scoreText） */
export function buildJournalExportRecords(
  dateRecords: CheckInRecord[],
  allRecords: CheckInRecord[],
  tagSettingsMap: Record<string, { name?: string }>,
  date: string
): JournalExportRecord[] {
  return dateRecords.map((r) => {
    const tagName = tagSettingsMap[r.tagId]?.name ?? '未命名';
    const score = r.score ?? 0;
    const streak = getStreakForTag(r.tagId, allRecords, date);
    const todayCount = dateRecords.filter((x) => x.tagId === r.tagId).length;
    return {
      ...r,
      tagName,
      score,
      streak,
      todayCount,
      scoreText: scoreToText(score),
    };
  });
}

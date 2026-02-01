import { forwardRef } from 'react';
import type { JournalExportRecord, HouseworkTask } from '@/types';
import { formatShortDate, getWeekdayShort } from '@/utils/dateUtils';
import { IconScoreRing } from '@/components/JournalIcons';

/** A6 比例：105:148，约 320×452 展示用；支持动态增高以容纳 300 字日记 */
export const A6_CARD_WIDTH = 320;
export const A6_CARD_MIN_HEIGHT = 452;

export interface JournalContentData {
  records: JournalExportRecord[];
  completedHousework?: HouseworkTask[];
  journalText: string;
  tagSettingsMap: Record<string, { name?: string }>;
}

export interface JournalContentProps {
  date: string;
  data: JournalContentData;
}

/** 核心日记展示组件：用于导出图片与打印，完整引用今日打卡与今日日记 */
export const JournalContent = forwardRef<HTMLDivElement, JournalContentProps>(
  function JournalContent({ date, data }, ref) {
    const { records, completedHousework = [], journalText } = data;
    const isEmpty = records.length === 0 && completedHousework.length === 0 && !journalText.trim();

    return (
      <div
        ref={ref}
        className="journal-content-card font-body relative bg-ecru rounded-md overflow-visible flex flex-col border border-ring-bg"
        style={{
          width: A6_CARD_WIDTH,
          minHeight: A6_CARD_MIN_HEIGHT,
        }}
      >
        {/* 纸张纹理感：淡网格（导出/打印时保留） */}
        <div
          className="absolute inset-0 pointer-events-none rounded-md"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        />
        <div className="relative flex flex-col h-full px-6 pt-6 pb-4">
          {/* 日期 + 星期 */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-num-primary text-xl font-normal font-display">
              {formatShortDate(date)}
            </span>
            <span className="text-[#7A7A7A] text-xs font-body">
              {getWeekdayShort(date)}
            </span>
          </div>

          {/* 今日打卡 */}
          <div className="mb-3 flex-shrink-0">
            <div className="mb-2">
              <span className="text-ink text-xs font-medium font-body">
                今日打卡 ({records.length})
              </span>
            </div>
            <div className="flex flex-col gap-1.5 overflow-visible">
              {records.length > 0 ? (
                records.map((r) => (
                  <div
                    key={r.id}
                    className="px-3 py-2.5 rounded-xl border border-ring-bg bg-ecru flex flex-col gap-1.5 overflow-visible"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex-shrink-0">
                        <IconScoreRing score={r.score} size={24} />
                      </div>
                      <div className="flex-1 min-w-0 overflow-visible">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-ink text-xs font-medium font-body">{r.tagName}</span>
                          <span className="text-[#7A7A7A] text-[11px] font-body">{r.score}分</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {r.streak > 0 && (
                            <span className="text-tag-life text-[9px] font-body">已连续 {r.streak} 天</span>
                          )}
                          {r.todayCount > 1 && (
                            <span className="text-[#7A7A7A] text-[10px] font-body">共 {r.todayCount} 次</span>
                          )}
                        </div>
                        {r.notes && (
                          <p className="text-ink text-[10px] leading-relaxed mt-0.5 break-words font-body">
                            「{r.notes}」
                          </p>
                        )}
                        <p className="text-[#7A7A7A] text-[10px] leading-relaxed mt-0.5 font-body">
                          {r.score}分 - {r.scoreText}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-[#7A7A7A] text-[10px] py-1 font-body">暂无</span>
              )}
            </div>
          </div>

          {/* 今日完成的家事（导出/打印用） */}
          {completedHousework.length > 0 && (
            <div className="mb-3 flex-shrink-0">
              <div className="mb-1.5">
                <span className="text-ink text-xs font-medium font-body">
                  今日完成的家事 ({completedHousework.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {completedHousework.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md border border-ring-bg bg-status-done/10 text-status-done text-[10px] font-body"
                  >
                    ✓ {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 今日感悟：正文字体宋体 12px 行距 1.5，一页内 */}
          <div className="flex-1 min-h-[100px] flex flex-col flex-grow">
            <div className="mb-1.5 flex-shrink-0">
              <span className="text-ink text-xs font-medium font-body">今日感悟</span>
            </div>
            {isEmpty ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-4">
                <p className="text-[#7A7A7A] text-xs leading-5 font-body">今日暂无记录</p>
              </div>
            ) : (
              <div
                className="flex-1 min-h-[60px] text-ink whitespace-pre-wrap overflow-visible break-words"
                style={{
                  fontFamily: 'SimSun, "Songti SC", serif',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                }}
              >
                {journalText.trim() || '今日的点点滴滴'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useJournalPrompt } from '@/hooks/useJournalPrompts';
import { getWeekdayShort } from '@/utils/dateUtils';
import { IconClose, IconDownload } from '@/components/JournalIcons';
import { InterviewBanner } from '@/components/InterviewBanner';
import { JournalExportOverlay } from '@/components/JournalExportOverlay';
import type { CheckInRecord } from '@/types';

import { STORAGE_KEY_RECORDS, STORAGE_KEY_TAG_SETTINGS, STORAGE_KEY_JOURNAL } from '@/constants/storage';
import { buildJournalExportRecords } from '@/utils/journalExport';

export interface JournalDrawerProps {
  selectedDate: string;
  onClose: () => void;
}

export function JournalDrawer({ selectedDate, onClose }: JournalDrawerProps) {
  const [checkInRecords] = useLocalStorage<CheckInRecord[]>(STORAGE_KEY_RECORDS, []);
  const [tagSettingsMap] = useLocalStorage<Record<string, { name?: string }>>(STORAGE_KEY_TAG_SETTINGS, {});
  const [journalEntries, setJournalEntries] = useLocalStorage<Record<string, string>>(STORAGE_KEY_JOURNAL, {});
  const [showExportOverlay, setShowExportOverlay] = useState(false);

  if (!selectedDate) return null;

  const dateRecords = checkInRecords.filter((r) => r.date === selectedDate);
  const journalContent = journalEntries[selectedDate] ?? '';
  const setJournalContent = (value: string) => {
    setJournalEntries((prev) => ({ ...prev, [selectedDate]: value }));
  };

  const [y, m, d] = selectedDate.split('-');
  const dateLabel = `${y}年${m}月${d}日 ${getWeekdayShort(selectedDate)}`;
  const { prompt: journalPlaceholder, getRandomPrompt } = useJournalPrompt(selectedDate);

  const journalExportData = useMemo(
    () => ({
      records: buildJournalExportRecords(dateRecords, checkInRecords, tagSettingsMap, selectedDate),
      journalText: journalContent,
      tagSettingsMap,
    }),
    [dateRecords, checkInRecords, tagSettingsMap, selectedDate, journalContent]
  );

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed left-0 right-0 bottom-0 z-[91] max-h-[85vh] rounded-t-2xl bg-ecru border border-ring-bg border-b-0 flex flex-col animate-slide-in-from-bottom"
        role="dialog"
        aria-modal="true"
        aria-labelledby="journal-drawer-title"
      >
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-ring-bg bg-ecru rounded-t-2xl">
          <h2 id="journal-drawer-title" className="text-num-primary text-base font-medium font-display tracking-widest">
            {dateLabel}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowExportOverlay(true)}
              className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-ink hover:bg-[#EDEBE7] text-xs font-medium"
            >
              <IconDownload size={14} />
              导出
            </button>
            <button
              type="button"
              onClick={onClose}
              className="size-9 flex items-center justify-center rounded-lg text-ink hover:bg-[#EDEBE7]"
              aria-label="关闭"
            >
              <IconClose size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 max-w-[430px] mx-auto w-full">
          <section className="mb-4">
            <h3 className="text-ink text-sm font-medium font-body mb-2">
              当日打卡 ({dateRecords.length})
            </h3>
            {dateRecords.length > 0 ? (
              <div className="flex flex-col gap-2">
                {dateRecords.map((r) => (
                  <div
                    key={r.id}
                    className="px-4 py-3 bg-ecru rounded-xl border border-ring-bg text-ink text-sm font-body"
                  >
                    {tagSettingsMap[r.tagId]?.name ?? '未命名'} · {r.score ?? 0}分
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#7A7A7A] text-xs py-2 font-body">当日暂无打卡</p>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-ink text-sm font-medium font-body">写点什么</h3>
              <button
                type="button"
                onClick={() => getRandomPrompt()}
                className="p-1 rounded text-stone-wash/60 hover:text-ink hover:bg-stone-wash/10"
                aria-label="换一个问题"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <textarea
              value={journalContent}
              onChange={(e) => setJournalContent(e.target.value)}
              placeholder={journalPlaceholder}
              className="w-full h-28 px-3 py-2.5 bg-ecru rounded-xl border border-ring-bg text-ink text-sm leading-5 placeholder:text-stone-wash/40 font-body resize-none outline-none focus:ring-2 focus:ring-user-mom/30 focus:border-user-mom/50"
              maxLength={300}
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[#7A7A7A] text-[10px] font-body">{journalContent.length}/300</span>
            </div>
            <InterviewBanner
              onSelectQuestion={(q) => {
                setJournalEntries((prev) => {
                  const current = prev[selectedDate] ?? '';
                  const next = current.trim() ? `${current}\n${q}` : q;
                  return { ...prev, [selectedDate]: next };
                });
              }}
            />
          </section>
        </div>
      </div>

      {/* 导出弹层：复用 JournalContent */}
      {showExportOverlay && (
        <JournalExportOverlay
          date={selectedDate}
          data={journalExportData}
          onClose={() => setShowExportOverlay(false)}
        />
      )}
    </>
  );
}

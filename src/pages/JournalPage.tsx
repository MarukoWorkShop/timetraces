import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Plus } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useJournalPrompt } from '@/hooks/useJournalPrompts';
import type { CheckInRecord, TagSettings, HouseworkTask } from '@/types';
import { toDateString, getStreakForTag } from '@/utils/dateUtils';
import { buildJournalExportRecords } from '@/utils/journalExport';
import { IconClose, IconShare, IconScoreRing } from '@/components/JournalIcons';
import { InterviewBanner } from '@/components/InterviewBanner';
import { JournalExportOverlay } from '@/components/JournalExportOverlay';

import { STORAGE_KEY_RECORDS, STORAGE_KEY_TAG_SETTINGS, STORAGE_KEY_JOURNAL, STORAGE_KEY_HOUSEWORK } from '@/constants/storage';

type TagSettingsMap = Record<string, TagSettings>;

const WEEKDAY_ZH = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

function getTodayLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAY_ZH[d.getDay()]}`;
}

export function JournalPage() {
  const navigate = useNavigate();
  /** 当日 0:00 为界的日历日（本地时区 YYYY-MM-DD），用于筛选今日打卡、今日家事、当日日记 */
  const today = toDateString(new Date());
  const journalInputRef = useRef<HTMLTextAreaElement>(null);

  const [checkInRecords] = useLocalStorage<CheckInRecord[]>(STORAGE_KEY_RECORDS, []);
  const [tagSettingsMap] = useLocalStorage<TagSettingsMap>(STORAGE_KEY_TAG_SETTINGS, {});
  const [journalEntries, setJournalEntries] = useLocalStorage<Record<string, string>>(
    STORAGE_KEY_JOURNAL,
    {}
  );
  const [houseworkList] = useLocalStorage<HouseworkTask[]>(STORAGE_KEY_HOUSEWORK, []);

  /** 今日打卡：仅显示 date === today 的标签打卡记录（当天 24 小时内归属当天的记录） */
  const todayRecords = useMemo(
    () => checkInRecords.filter((r) => r.date === today),
    [checkInRecords, today]
  );

  /** 今日完成的家事：仅显示 lastDoneDate === today 的任务 */
  const todayCompletedHousework = useMemo(
    () => houseworkList.filter((t) => t.lastDoneDate === today),
    [houseworkList, today]
  );

  /** 当日日记：按日期键 today 读写，仅展示/编辑当天内容 */
  const journalContent = journalEntries[today] ?? '';
  const setJournalContent = (value: string) => {
    setJournalEntries((prev) => ({ ...prev, [today]: value }));
  };

  const [showShareOverlay, setShowShareOverlay] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const { prompt: journalPlaceholder, getRandomPrompt } = useJournalPrompt(today);

  const handleShare = () => setShowShareOverlay(true);
  const [noteMenuOpen, setNoteMenuOpen] = useState(false);
  const [showNoteView, setShowNoteView] = useState(false);
  const noteMenuRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    setSavedHint(true);
    setTimeout(() => setSavedHint(false), 1500);
    if (journalContent.trim()) setShowNoteView(true);
  };

  const handleReEdit = () => {
    setNoteMenuOpen(false);
    setShowNoteView(false);
    requestAnimationFrame(() => journalInputRef.current?.focus());
  };

  const handleDeleteNote = () => {
    setJournalContent('');
    setNoteMenuOpen(false);
    setShowNoteView(false);
  };

  useEffect(() => {
    if (!journalContent.trim()) setShowNoteView(false);
  }, [journalContent]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (noteMenuRef.current && !noteMenuRef.current.contains(e.target as Node)) {
        setNoteMenuOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  /** 点击采访问题：追加到输入框并聚焦 */
  const handleSelectQuestion = (question: string) => {
    const next = journalContent.trim() ? `${journalContent}\n${question}` : question;
    setJournalContent(next);
    requestAnimationFrame(() => journalInputRef.current?.focus());
  };

  const journalExportData = useMemo(
    () => ({
      records: buildJournalExportRecords(todayRecords, checkInRecords, tagSettingsMap, today),
      completedHousework: todayCompletedHousework,
      journalText: journalContent,
      tagSettingsMap,
    }),
    [todayRecords, checkInRecords, tagSettingsMap, today, todayCompletedHousework, journalContent]
  );

  return (
    <div className="min-h-screen max-w-[430px] mx-auto bg-ecru overflow-hidden flex flex-col">
      {/* ========== 编辑模式：The DailyJournal UI ========== */}
      <header className="flex-shrink-0 h-16 px-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="size-6 flex items-center justify-center text-ink hover:text-user-mom font-body"
          aria-label="返回"
        >
          <IconClose size={24} className="text-ink" />
        </button>
        <span className="text-user-mom text-lg font-medium font-display tracking-widest leading-7">
          {getTodayLabel()}
        </span>
        <button
          type="button"
          onClick={handleShare}
          className="h-7 px-3 bg-user-mom rounded-[10px] flex items-center gap-1.5 text-white"
        >
          <IconShare size={14} className="text-white" />
          <span className="text-xs font-medium">分享</span>
        </button>
      </header>

      <main className="flex-1 px-6 flex flex-col gap-4 overflow-auto pb-8">
        {/* 今日打卡 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-ink text-xs font-medium leading-4 font-display font-body">
            今日打卡 ({todayRecords.length})
          </h2>
          <div className="flex flex-col gap-1.5">
            {todayRecords.length > 0 ? (
              todayRecords.map((r) => {
                const tagName = tagSettingsMap[r.tagId]?.name ?? '未命名';
                const score = r.score ?? 0;
                const streak = getStreakForTag(r.tagId, checkInRecords, today);
                const todayCount = todayRecords.filter((x) => x.tagId === r.tagId).length;
                const scoreText = score <= 20 ? '状态不太好' : score <= 40 ? '马马虎虎' : score <= 59 ? '还行吧' : score <= 75 ? '及格啦' : score <= 90 ? '很棒' : '完美';
                return (
                  <div
                    key={r.id}
                    className="px-3 py-2.5 bg-ecru rounded-xl border border-ring-bg flex flex-col gap-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0">
                        <IconScoreRing score={score} size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-ink text-xs font-medium font-body">{tagName}</span>
                          <span className="text-stone-wash text-[11px] font-body">{score}分</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {streak > 0 && (
                            <span className="text-tag-life text-[10px] font-body">
                              已连续 {streak} 天
                            </span>
                          )}
                          {todayCount > 1 && (
                            <span className="bg-ring-bg rounded-md px-1.5 py-0.5 text-stone-wash text-[11px] font-body">
                              共 {todayCount} 次
                            </span>
                          )}
                        </div>
                        <p className="text-stone-wash text-[11px] leading-4 tracking-tight mt-0.5 font-body">
                          {score}分 - {scoreText}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="box-content px-3 py-4 bg-ecru rounded-xl border border-ring-bg text-center text-stone-wash text-xs font-body">
                今日暂无打卡
              </div>
            )}
          </div>
        </section>

        {/* 今日完成的家事 */}
        {todayCompletedHousework.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-ink text-xs font-medium leading-4 font-display font-body">
              今日完成的家事 ({todayCompletedHousework.length})
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {todayCompletedHousework.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-ring-bg bg-status-done/10 text-status-done text-[11px] font-body"
                >
                  <span className="text-emerald-500" aria-hidden>✓</span>
                  {t.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* 写点什么 */}
        <section className="flex flex-col gap-4 pt-4 pb-4 border-b border-ring-bg/50">
          <div className="flex items-center justify-between border-b border-ring-bg/30 pb-3">
            <h3 className="text-ink/80 text-sm font-medium leading-6 tracking-wide font-display font-body">写点什么</h3>
            <button
              type="button"
              onClick={() => getRandomPrompt()}
              className="p-1 rounded text-ink/40 hover:text-ink/60 transition-colors"
              aria-label="换一个问题"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {journalContent.trim() && showNoteView ? (
            <div
              ref={noteMenuRef}
              className="relative p-4 rounded-xl bg-[#F7F6F2] min-h-[80px] border-b border-ring-bg/20"
              style={{ boxShadow: '0 1px 3px rgba(27,38,59,0.06)' }}
            >
              <p
                className="text-[13px] leading-relaxed tracking-wide pr-8 font-body whitespace-pre-wrap break-words"
                style={{ color: 'rgba(27, 38, 59, 0.8)' }}
              >
                {journalContent}
              </p>
              <div className="absolute right-2 bottom-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setNoteMenuOpen((o) => !o); }}
                  className="p-1 rounded text-ink/40 hover:text-ink/60 transition-colors"
                  aria-label="更多"
                >
                  <Plus size={14} />
                </button>
                {noteMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-1 py-1 min-w-[80px] bg-white rounded-lg shadow-md border border-ring-bg/30 z-10">
                    <button
                      type="button"
                      onClick={handleReEdit}
                      className="w-full px-3 py-1.5 text-left text-[11px] text-ink font-body hover:bg-ecru"
                    >
                      再编辑
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteNote}
                      className="w-full px-3 py-1.5 text-left text-[11px] text-madder font-body hover:bg-ecru"
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
          <textarea
            ref={journalInputRef}
            value={journalContent}
            onChange={(e) => setJournalContent(e.target.value)}
            placeholder={journalPlaceholder}
            className="w-full h-32 px-0 py-3 bg-transparent resize-none outline-none font-body text-[13px] leading-relaxed tracking-wide placeholder:font-pingfang text-ink/80 placeholder:text-ink placeholder:opacity-20"
            style={{ caretColor: 'rgba(27, 38, 59, 0.6)' }}
            maxLength={300}
          />
          )}
          <div className="flex items-center justify-between border-t border-ring-bg/30 pt-3">
            <span className="text-ink/40 text-[10px] font-body">{journalContent.length}/300</span>
            <button
              type="button"
              onClick={handleSubmit}
              className="h-6 px-2.5 rounded-lg bg-action-primary text-white text-[11px] font-medium hover:bg-action-primary/90 font-body"
            >
              {savedHint ? '已保存' : '提交'}
            </button>
          </div>
        </section>

        {/* 采访引导：放在写点什么下方，小字灰色 */}
        <InterviewBanner onSelectQuestion={handleSelectQuestion} />
      </main>

      {/* ========== 分享弹层：导出图片 + 打印 A6/A5 ========== */}
      {showShareOverlay && (
        <JournalExportOverlay
          date={today}
          data={journalExportData}
          onClose={() => setShowShareOverlay(false)}
        />
      )}
    </div>
  );
}

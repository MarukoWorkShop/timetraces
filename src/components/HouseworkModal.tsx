import { useState } from 'react';
import type { HouseworkTask, HouseworkFrequencyKind } from '@/types';
import { toDateString, addDays, formatMonthDay } from '@/utils/dateUtils';

const COMMON_CHORES = ['扫地', '洗衣服', '更换床单', '保洁上门', '清洗洗碗机', '倒垃圾', '电子锁充电', '整理衣柜','给鱼缸换水'];

const FREQUENCY_OPTIONS: { value: HouseworkFrequencyKind; label: string; days: number }[] = [
  { value: 'daily', label: '每天', days: 1 },
  { value: 'weekly', label: '每周', days: 7 },
  { value: 'biweekly', label: '两周一次', days: 14 },
  { value: 'monthly', label: '每月', days: 30 },
  { value: 'once', label: '一次性', days: 0 },
];

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `housework-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface HouseworkModalProps {
  onClose: () => void;
  onCreated: (task: HouseworkTask) => void;
}

export function HouseworkModal({ onClose, onCreated }: HouseworkModalProps) {
  const today = toDateString(new Date());
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<HouseworkFrequencyKind>('weekly');
  const [startDate, setStartDate] = useState(today);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const frequencyDays = FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.days ?? 7;
  const canCreate = name.trim().length > 0;

  /** 预计下次提醒日（从起始日起 frequencyDays 天后） */
  const nextReminderPreview = frequencyDays <= 0 ? null : addDays(startDate, frequencyDays);

  const handleCreate = () => {
    if (!canCreate) return;
    const task: HouseworkTask = {
      id: generateId(),
      name: name.trim(),
      lastDoneDate: null,
      frequencyDays,
      createdAt: today,
      startDate,
    };
    onCreated(task);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center bg-black/50 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="housework-modal-title"
    >
      <div
        className="w-full max-w-[320px] max-h-[90vh] flex flex-col bg-ecru rounded-2xl border border-ring-bg animate-slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶端：标题 + 创建 + 关闭 */}
        <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-ring-bg">
          <h2 id="housework-modal-title" className="text-ink text-base font-medium truncate font-display font-body">
            新建家事任务
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate}
              className="h-9 px-4 rounded-[10px] text-white text-sm font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed bg-action-primary hover:bg-action-primary/90 font-body"
            >
              创建
            </button>
            <button
              type="button"
              onClick={onClose}
              className="size-9 rounded-[10px] flex items-center justify-center text-ink hover:bg-ring-bg font-body"
              aria-label="关闭"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* 可滚动内容区，压缩至一屏内 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {/* 任务名称 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-stone-500 text-[11px] font-medium">任务名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：换床单"
              className="w-full h-10 px-3 rounded-lg border border-ring-bg text-sm text-ink placeholder:text-stone-wash font-body outline-none focus:ring-2 focus:ring-action-primary/30 focus:border-action-primary/50"
            />
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CHORES.map((chore) => (
                <button
                  key={chore}
                  type="button"
                  onClick={() => setName((prev) => (prev ? `${prev}、${chore}` : chore))}
                  className="px-2.5 py-1 rounded-full bg-ring-bg text-ink text-[11px] font-medium hover:bg-[#EDEBE7] font-body"
                >
                  {chore}
                </button>
              ))}
            </div>
          </div>

          {/* 起始日 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-stone-500 text-[11px] font-medium">起始日</label>
            <div className="flex gap-1.5">
              {(['yesterday', 'today', 'tomorrow'] as const).map((key) => {
                const d = key === 'yesterday' ? addDays(today, -1) : key === 'today' ? today : addDays(today, 1);
                const label = key === 'yesterday' ? '昨天' : key === 'today' ? '今天' : '明天';
                const selected = startDate === d;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStartDate(d)}
                    className={`flex-1 h-9 rounded-lg text-[11px] font-medium transition-all ${
                      selected ? 'bg-action-primary text-white' : 'bg-ring-bg text-ink hover:bg-[#EDEBE7]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowDatePicker((v) => !v)}
              className="w-full h-9 rounded-lg border border-ring-bg text-ink text-[11px] font-medium flex items-center justify-center gap-1 hover:bg-ring-bg font-body"
            >
              选择日期 {showDatePicker ? '▲' : '▼'}
            </button>
            {showDatePicker && (
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-ring-bg text-sm text-ink font-body"
              />
            )}
          </div>

          {/* 任务频率：两列紧凑 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-stone-500 text-[11px] font-medium">任务频率</label>
              {nextReminderPreview !== null && (
                <span className="text-amber-600/90 text-[10px]">下次提醒 {formatMonthDay(nextReminderPreview)}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {FREQUENCY_OPTIONS.map((opt) => {
                const selected = frequency === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFrequency(opt.value)}
                    className={`h-9 rounded-lg border text-[11px] font-medium transition-all ${
                      selected ? 'bg-action-primary text-white border-action-primary' : 'bg-white text-stone-wash border-ring-bg hover:bg-ring-bg'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 提示：一行 */}
          <p className="text-stone-wash text-[10px] leading-tight font-body">
            按频率计算紧急度，越接近下次完成时间颜色越深
          </p>
        </div>
      </div>
    </div>
  );
}

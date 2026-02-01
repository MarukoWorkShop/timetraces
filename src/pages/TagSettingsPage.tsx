import { useState, useMemo, useCallback } from 'react';
import { addMinutesToTime, getDurationMinutes, toDateString } from '@/utils/dateUtils';
import type { TagSettings, TagFrequencyType, TagPlanType, TrackingOptions } from '@/types';

const DURATION_PRESETS = [30, 60, 90] as const;
type DurationPreset = (typeof DURATION_PRESETS)[number] | 'custom';

const TRACKING_OPTIONS: { key: keyof TrackingOptions; label: string }[] = [
  { key: 'courseTopic', label: '课程主题' },
  { key: 'km', label: '公里数' },
  { key: 'calories', label: '卡路里' },
  { key: 'oneSentenceNote', label: '一句话评价' },
  { key: 'dailyPhoto', label: '当日照片' },
];

const OWNERS = ['Julia', 'Maruko'] as const;
type Owner = (typeof OWNERS)[number];

const FREQUENCY_OPTIONS: { value: TagFrequencyType; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'biweekly', label: '双周' },
  { value: 'custom', label: '自定义' },
  { value: 'once', label: '单次' },
];

/** 频率选中后的对话感提示文案 */
const FREQUENCY_HINT: Record<TagFrequencyType, string> = {
  daily: '这些日子每天我都会提醒你',
  weekly: '每周的这些日子我会提醒你',
  biweekly: '每隔一周的这些日子我会提醒你',
  custom: '按你自定义的节奏提醒你',
  once: '就这一次，我会提醒你',
};

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAY_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;

const PLAN_TYPE_OPTIONS: { value: TagPlanType; label: string }[] = [
  { value: 'countPack', label: '次卡包' },
  { value: 'periodCard', label: '期间卡' },
  { value: 'dailyHabit', label: '日常习惯' },
];

export type OwnerDisplayNames = Record<'Julia' | 'Maruko', string>;

export interface TagSettingsPageProps {
  /** 当前标签配置（可为新建时的空配置） */
  tag: Partial<TagSettings> & { id: string };
  /** 保存配置 */
  onSave: (config: TagSettings) => void;
  /** 取消 / 返回 */
  onCancel: () => void;
  /** 删除此标签（确认后调用） */
  onDelete?: () => void;
  /** 查看出勤统计打印页 */
  onViewAttendancePrint?: () => void;
  /** 用户显示名（与设置页联动，用于归属选择器展示） */
  ownerDisplayNames?: OwnerDisplayNames;
}

const defaultTrackingOptions: TrackingOptions = {
  courseTopic: false,
  km: false,
  calories: false,
  oneSentenceNote: true,
  dailyPhoto: false,
};

const DEFAULT_OWNER_DISPLAY_NAMES: OwnerDisplayNames = { Julia: '用户1', Maruko: '用户2' };

export function TagSettingsPage({
  tag,
  onSave,
  onCancel,
  onDelete,
  onViewAttendancePrint,
  ownerDisplayNames = DEFAULT_OWNER_DISPLAY_NAMES,
}: TagSettingsPageProps) {
  const [owner, setOwner] = useState<Owner>((tag.owner as Owner) || 'Julia');
  const [name, setName] = useState(tag.name ?? '');
  const [memo, setMemo] = useState(tag.memo ?? '');
  const [defaultStartTime, setDefaultStartTime] = useState(tag.defaultStartTime ?? '09:00');
  const [defaultEndTime, setDefaultEndTime] = useState(tag.defaultEndTime ?? '10:00');
  const [durationPreset, setDurationPreset] = useState<DurationPreset>(() => {
    const d = getDurationMinutes(tag.defaultStartTime ?? '09:00', tag.defaultEndTime ?? '10:00');
    return DURATION_PRESETS.includes(d as (typeof DURATION_PRESETS)[number]) ? (d as DurationPreset) : 'custom';
  });
  const [customDurationMinutes, setCustomDurationMinutes] = useState(() => {
    const d = getDurationMinutes(tag.defaultStartTime ?? '09:00', tag.defaultEndTime ?? '10:00');
    return DURATION_PRESETS.includes(d as (typeof DURATION_PRESETS)[number]) ? 60 : Math.max(1, d);
  });
  const [frequency, setFrequency] = useState<TagFrequencyType>(tag.frequency ?? 'weekly');
  const [repeatDays, setRepeatDays] = useState<number[]>(tag.repeatDays ?? [0, 1]);
  const [planType, setPlanType] = useState<TagPlanType>(tag.planType ?? 'dailyHabit');
  const [totalLessons, setTotalLessons] = useState<number | ''>(tag.totalLessons ?? '');
  const todayStr = useMemo(() => toDateString(new Date()), []);
  const defaultEndDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toDateString(d);
  }, []);
  const [startDate, setStartDate] = useState(tag.startDate ?? todayStr);
  const [endDate, setEndDate] = useState(tag.endDate ?? defaultEndDateStr);
  const [trackingOptions, setTrackingOptions] = useState<TrackingOptions>(
    { ...defaultTrackingOptions, ...tag.trackingOptions }
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentDurationMinutes = useMemo(() => {
    if (durationPreset === 'custom') return customDurationMinutes;
    return durationPreset;
  }, [durationPreset, customDurationMinutes]);

  const applyDurationToEnd = useCallback((start: string, durationMin: number) => {
    setDefaultEndTime(addMinutesToTime(start, durationMin));
  }, []);

  const handleDefaultStartTimeChange = (nextStart: string) => {
    setDefaultStartTime(nextStart);
    applyDurationToEnd(nextStart, currentDurationMinutes);
  };

  const handleDurationPreset = (preset: DurationPreset, minutes?: number) => {
    if (preset === 'custom' && minutes != null) {
      setCustomDurationMinutes(minutes);
      setDurationPreset('custom');
      applyDurationToEnd(defaultStartTime, minutes);
    } else if (preset !== 'custom') {
      setDurationPreset(preset);
      applyDurationToEnd(defaultStartTime, preset);
    }
  };

  const handleDefaultEndTimeChange = (nextEnd: string) => {
    setDefaultEndTime(nextEnd);
    const duration = getDurationMinutes(defaultStartTime, nextEnd);
    const match = DURATION_PRESETS.find((p) => p === duration);
    if (match != null) setDurationPreset(match);
    else {
      setDurationPreset('custom');
      setCustomDurationMinutes(duration);
    }
  };

  const toggleRepeatDay = (day: number) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  /** 仅当频率为「每周」或「双周」时显示重复星期勾选框；daily 不显示但保存时自动 [0..6] */
  const shouldShowWeekdays = frequency === 'weekly' || frequency === 'biweekly';

  const handleSave = () => {
    const repeatDaysToSave =
      frequency === 'daily'
        ? [0, 1, 2, 3, 4, 5, 6]
        : shouldShowWeekdays
          ? [...repeatDays]
          : undefined;

    const config: TagSettings = {
      id: tag.id,
      name: name.trim() || '未命名',
      owner,
      defaultStartTime: defaultStartTime || undefined,
      defaultEndTime: defaultEndTime || undefined,
      memo: memo.trim() || undefined,
      frequency,
      repeatDays: repeatDaysToSave,
      planType,
      totalLessons:
        planType === 'countPack' && totalLessons !== ''
          ? (typeof totalLessons === 'number' ? totalLessons : parseInt(String(totalLessons), 10) || undefined)
          : undefined,
      startDate: planType === 'periodCard' ? startDate || undefined : undefined,
      endDate: planType === 'periodCard' ? endDate || undefined : undefined,
      trackingOptions: { ...trackingOptions },
    };
    onSave(config);
  };

  const toggleTracking = (key: keyof TrackingOptions) => {
    setTrackingOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete?.();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="min-h-screen bg-ring-bg flex flex-col">
      <div className="w-full max-w-[430px] mx-auto min-h-screen bg-ecru flex flex-col border-l border-ring-bg">
        {/* 顶栏：取消 | 编辑标签 | 保存 */}
        <div className="flex-shrink-0 px-5 h-12 bg-ecru border-b border-ring-bg flex justify-between items-center rounded-t-2xl">
        <button
          type="button"
          onClick={onCancel}
          className="text-ink text-base font-medium leading-6 font-body"
        >
          取消
        </button>
        <span className="text-ink text-base font-medium leading-6 font-display font-body">编辑标签</span>
        <button
          type="button"
          onClick={handleSave}
          className="text-user-mom text-base font-medium leading-6 font-body"
        >
          保存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8 flex flex-col gap-3">
        {/* 所有者：分段选择（显示设置页中的用户名称） */}
        <div className="bg-ecru rounded-2xl border border-ring-bg overflow-hidden">
          <div className="px-3 pt-3 pb-2">
            <span className="text-stone-500 text-xs leading-5">所有者</span>
          </div>
          <div className="p-1.5 flex rounded-2xl bg-ring-bg gap-0.5">
            {OWNERS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOwner(o)}
                className={`flex-1 h-9 rounded-[10px] text-xs font-medium leading-4 ${
                  owner === o
                    ? 'bg-user-mom text-white'
                    : 'text-stone-wash hover:text-ink'
                }`}
              >
                {ownerDisplayNames[o] ?? DEFAULT_OWNER_DISPLAY_NAMES[o]}
              </button>
            ))}
          </div>
          <div className="h-px bg-neutral-200 my-2" />
          <div className="px-3 pb-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="标签名称（如瑜伽课）"
              className="w-full text-sm text-ink placeholder:text-stone-wash bg-transparent border-none outline-none font-body"
            />
          </div>
        </div>

        {/* 默认时间：开始时间 + 持续时间（30/60/90/自定义）→ 截止时间自动计算，与打卡页一致 */}
        <div className="bg-white rounded-2xl border border-neutral-200 px-3 pt-3 pb-3 flex flex-col gap-2">
          <span className="text-stone-500 text-xs leading-5">默认时间（打卡页默认显示）</span>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 text-[10px] w-14 flex-shrink-0">开始</span>
            <input
              type="time"
              value={defaultStartTime}
              onChange={(e) => handleDefaultStartTimeChange(e.target.value)}
              className="flex-1 h-8 px-2 rounded-xl border border-ring-bg bg-ecru text-xs text-ink font-body"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-neutral-500 text-[10px] w-14 flex-shrink-0">持续</span>
            {DURATION_PRESETS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => handleDurationPreset(min)}
                className={`h-7 px-2.5 rounded-lg border text-[10px] font-medium ${
                  durationPreset === min ? 'border-user-mom bg-user-mom text-white' : 'border-ring-bg bg-ecru text-ink'
                }`}
              >
                {min}分钟
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleDurationPreset('custom', customDurationMinutes)}
              className={`h-7 px-2.5 rounded-lg border text-[10px] font-medium ${
                durationPreset === 'custom' ? 'border-user-mom bg-user-mom text-white' : 'border-ring-bg bg-ecru text-ink'
              }`}
            >
              自定义
            </button>
            {durationPreset === 'custom' && (
              <span className="inline-flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={24 * 60 - 1}
                  value={customDurationMinutes}
                  onChange={(e) => {
                    const v = Math.min(24 * 60 - 1, Math.max(1, Number(e.target.value) || 1));
                    setCustomDurationMinutes(v);
                    applyDurationToEnd(defaultStartTime, v);
                  }}
                  className="w-12 h-7 px-1 rounded-lg border border-ring-bg bg-ecru text-xs text-center font-body"
                />
                <span className="text-neutral-400 text-[10px]">分钟</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 text-[10px] w-14 flex-shrink-0">截止</span>
            <input
              type="time"
              value={defaultEndTime}
              onChange={(e) => handleDefaultEndTimeChange(e.target.value)}
              className="flex-1 h-8 px-2 rounded-xl border border-ring-bg bg-ecru text-xs text-ink font-body"
            />
          </div>
        </div>

        {/* 频率：每天 / 每周 / 双周 / 自定义 / 单次 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-stone-500 text-xs leading-4">频率</span>
          <div className="p-1.5 bg-ecru rounded-2xl border border-ring-bg grid grid-cols-5 gap-1">
            {FREQUENCY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFrequency(value)}
                className={`h-9 rounded-[10px] text-xs font-medium leading-4 ${
                  frequency === value
                    ? 'bg-user-mom text-white'
                    : 'text-stone-wash hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-neutral-400 leading-4">
            {FREQUENCY_HINT[frequency]}
          </p>
        </div>

        {/* 周期勾选（周一至周日），仅当频率为每周或双周时显示 */}
        {shouldShowWeekdays && (
          <div className="flex flex-col gap-1.5">
            <span className="text-stone-500 text-xs leading-4">重复星期</span>
            <div className="px-2.5 pt-2.5 pb-2.5 bg-ecru rounded-2xl border border-ring-bg inline-flex justify-start items-start gap-1.5">
              {WEEKDAY_VALUES.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleRepeatDay(day)}
                  className={`flex-1 min-w-0 h-9 rounded-[10px] text-xs font-medium leading-4 outline outline-1 outline-offset-[-1px] ${
                    repeatDays.includes(day)
                      ? 'bg-user-mom text-white outline-user-mom'
                      : 'bg-white text-status-done outline-ring-bg'
                  }`}
                >
                  {WEEKDAY_LABELS[day]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 课程计划：次卡包 / 期间卡 / 日常习惯 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-stone-500 text-xs leading-4">课程计划</span>
          <div className="bg-white rounded-2xl border border-neutral-200 p-3 flex flex-col gap-3">
            {PLAN_TYPE_OPTIONS.map(({ value, label }) => (
              <div key={value} className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="planType"
                    checked={planType === value}
                    onChange={() => setPlanType(value)}
                    className="w-4 h-4 rounded-full border-neutral-300 text-neutral-600 focus:ring-neutral-500"
                  />
                  <span className="text-zinc-800 text-xs font-medium leading-5">{label}</span>
                </label>
                {value === 'countPack' && planType === 'countPack' && (
                  <div className="ml-6 px-2.5 pt-2.5 pb-2 bg-ring-bg rounded-[10px] flex flex-col gap-2">
                    <div className="inline-flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={totalLessons === '' ? '' : totalLessons}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTotalLessons(v === '' ? '' : (parseInt(v, 10) || ''));
                        }}
                        placeholder="11"
                        className="w-16 h-7 px-2 py-1 bg-white rounded-2xl border border-neutral-200 text-xs text-zinc-800 placeholder:text-zinc-800/50"
                      />
                      <span className="text-stone-500 text-xs leading-5">总课时</span>
                    </div>
                    <p className="text-neutral-400 text-xs leading-4 flex items-center gap-1.5">
                      <span>💡</span>
                      我会在课程剩余3次时提醒你
                    </p>
                  </div>
                )}
                {value === 'periodCard' && planType === 'periodCard' && (
                  <div className="ml-6 px-2.5 pt-2 pb-2 bg-ring-bg rounded-[10px] flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-0.5">
                        <span className="text-stone-500 text-[10px]">开始日期</span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          max={endDate}
                          className="h-7 px-2 rounded-lg border border-neutral-200 bg-white text-xs text-zinc-800 font-body"
                        />
                      </label>
                      <label className="flex flex-col gap-0.5">
                        <span className="text-stone-500 text-[10px]">结束日期</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate}
                          className="h-7 px-2 rounded-lg border border-neutral-200 bg-white text-xs text-zinc-800 font-body"
                        />
                      </label>
                    </div>
                    <p className="text-neutral-400 text-[10px] leading-4 flex items-center gap-1.5">
                      <span>💡</span>
                      结束30天时提醒你
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 追踪选项：勾选后在打卡页显示对应表单项（起止时间、评分为核心必选） */}
        <div className="flex flex-col gap-1.5">
          <span className="text-stone-500 text-xs leading-4">追踪选项</span>
          <div className="bg-white rounded-2xl border border-neutral-200 p-3 flex flex-col gap-2">
            <p className="text-neutral-400 text-[10px] leading-4 mb-1">
              起止时间、评分为核心必选，以下为可选项
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {TRACKING_OPTIONS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!trackingOptions[key]}
                    onChange={() => toggleTracking(key)}
                    className="w-4 h-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-500"
                  />
                  <span className="text-zinc-800 text-xs font-medium leading-5">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 出勤统计（可打印 / 导出） */}
        {onViewAttendancePrint && (
          <button
            type="button"
            onClick={onViewAttendancePrint}
            className="w-full py-3 px-4 mt-2 bg-ecru rounded-2xl border border-ring-bg text-center text-ink text-sm font-medium hover:bg-[#EDEBE7]"
          >
            出勤统计（可打印 / 导出）
          </button>
        )}

        {/* 备忘录（显示在首页，限 20 字），紧贴删除按钮上方 */}
        <div className="bg-white rounded-2xl border border-neutral-200 px-3 py-3">
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value.slice(0, 20))}
            placeholder="要不要我提醒你带什么东西）"
            maxLength={20}
            className="w-full text-xs text-zinc-800 placeholder:text-stone-300 bg-transparent border-none outline-none rounded-2xl"
          />
        </div>

        {/* 删除此标签 */}
        {onDelete && (
          <div className="pt-4 pb-2">
            <button
              type="button"
              onClick={handleDelete}
              className="w-full py-2 text-red-600 text-xs font-medium"
            >
              删除此标签
            </button>
          </div>
        )}
      </div>

        {/* 删除二次确认弹层 */}
        {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20"
          onClick={() => setShowDeleteConfirm(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm bg-ecru rounded-2xl border border-ring-bg p-4 animate-slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-zinc-800 text-sm leading-relaxed mb-4">
              确定要删除此标签吗？删除后该标签下的打卡记录仍会保留。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-neutral-200 text-zinc-700 text-sm font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium"
              >
                删除
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

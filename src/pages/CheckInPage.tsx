import { useState, useMemo, useCallback } from 'react';
import { formatTimeHM, toDateString, addMinutesToTime, getDurationMinutes } from '../utils/dateUtils';
import type { TrackingOptions } from '@/types';

const DURATION_PRESETS = [30, 60, 90] as const;
type DurationPreset = (typeof DURATION_PRESETS)[number] | 'custom';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/** 根据滑动条百分比返回日系治愈系状态语（实时展示用） */
export function getScoreFeedback(percent: number): string {
  if (percent <= 20) return '状态不太好，抱抱自己';
  if (percent <= 40) return '马马虎虎，加油吧';
  if (percent <= 59) return '还行吧，离及格就差一点点';
  if (percent <= 75) return '及格啦，继续保持哦';
  if (percent <= 90) return '很棒！很有能量';
  return '完美！闪闪发光';
}

/** 无配置时的默认打卡时间段：当前时间往前 1 小时 */
function getFallbackTimeRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getTime() - 60 * 60 * 1000);
  return { start: formatTimeHM(start), end: formatTimeHM(now) };
}

/** 根据当前日期自动生成本周（周一～周日）日期序列 */
function getThisWeekDays(): { weekday: string; day: number; isToday: boolean; isOtherMonth: boolean }[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const thisMonth = today.getMonth();
  const result: { weekday: string; day: number; isToday: boolean; isOtherMonth: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday = d.toDateString() === today.toDateString();
    const isOtherMonth = d.getMonth() !== thisMonth;
    result.push({
      weekday: WEEKDAY_LABELS[i],
      day: d.getDate(),
      isToday,
      isOtherMonth,
    });
  }
  return result;
}

export interface CheckInTask {
  title: string;
  timeRange?: string;
}

export interface CheckInPageProps {
  /** 当前打卡任务（标题、时间） */
  task: CheckInTask;
  /** 当前标签 id，用于「再编辑」跳转 /tag-settings/:tagId */
  tagId?: string;
  /** 关闭抽屉回调 */
  onClose: () => void;
  /** 打卡成功回调：评分、评价、起止时间、追踪选项内容、打卡日期均为可选，不填日期则视为当天 */
  onSave: (
    score?: number,
    notes?: string,
    startTime?: string,
    endTime?: string,
    courseTopic?: string,
    km?: string,
    calories?: string,
    date?: string
  ) => void;
  /** 点击编辑图标时跳转到标签设置页 */
  onEditTag?: (tagId: string) => void;
  /** 点击统计按钮时跳转到出勤统计打印页（仅阅读打卡标签显示） */
  onViewAttendanceStats?: () => void;
  /** 当前标签的追踪选项，未传则全部显示 */
  trackingOptions?: TrackingOptions;
  /** 标签配置的默认开始时间 HH:mm，打卡页起止时间初始值 */
  defaultStartTime?: string;
  /** 标签配置的默认结束时间 HH:mm */
  defaultEndTime?: string;
  /** 本周完成情况：按 一~日 顺序，true 表示该日已打卡 */
  weekCompleted?: boolean[];
  bestStreak?: number;
  weekRatePercent?: number;
  totalCount?: number;
}

const defaultTrackingOptions: TrackingOptions = {
  courseTopic: false,
  km: false,
  calories: false,
  oneSentenceNote: true,
  dailyPhoto: true,
};

export function CheckInPage({
  task,
  tagId,
  onClose,
  onSave,
  onEditTag,
  onViewAttendanceStats,
  trackingOptions: trackingOptionsProp,
  defaultStartTime: defaultStartTimeProp,
  defaultEndTime: defaultEndTimeProp,
  weekCompleted = [],
  bestStreak = 1,
  weekRatePercent = 14,
  totalCount = 0,
}: CheckInPageProps) {
  const displayCount = Math.min(totalCount, 999);
  const digitCount = displayCount < 10 ? 1 : displayCount < 100 ? 2 : displayCount < 1000 ? 3 : 4;
  const circleSizeClass =
    digitCount <= 2 ? 'w-24 h-24' : digitCount === 3 ? 'w-28 h-28' : 'w-32 h-32';
  const textSizeClass =
    digitCount <= 2 ? 'text-3xl' : digitCount === 3 ? 'text-2xl' : 'text-xl';
  const colorOpacity = 0.5 + 0.5 * (displayCount / 999);

  const trackingOptions = useMemo(
    () => ({ ...defaultTrackingOptions, ...trackingOptionsProp }),
    [trackingOptionsProp]
  );

  const fallback = useMemo(getFallbackTimeRange, []);
  const initialStart = defaultStartTimeProp ?? fallback.start;
  const initialEnd = defaultEndTimeProp ?? fallback.end;

  const todayStr = useMemo(() => toDateString(new Date()), []);

  const [score, setScore] = useState(50);
  const [notes, setNotes] = useState('');
  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [durationPreset, setDurationPreset] = useState<DurationPreset>(() => {
    const d = getDurationMinutes(initialStart, initialEnd);
    return DURATION_PRESETS.includes(d as (typeof DURATION_PRESETS)[number]) ? (d as DurationPreset) : 'custom';
  });
  const [customDurationMinutes, setCustomDurationMinutes] = useState(() => {
    const d = getDurationMinutes(initialStart, initialEnd);
    return DURATION_PRESETS.includes(d as (typeof DURATION_PRESETS)[number]) ? 60 : Math.max(1, d);
  });
  const [courseTopic, setCourseTopic] = useState('');
  const [km, setKm] = useState('');
  const [calories, setCalories] = useState('');

  const currentDurationMinutes = useMemo(() => {
    if (durationPreset === 'custom') return customDurationMinutes;
    return durationPreset;
  }, [durationPreset, customDurationMinutes]);

  const applyDurationToEnd = useCallback(
    (start: string, durationMin: number) => {
      setEndTime(addMinutesToTime(start, durationMin));
    },
    []
  );

  const handleStartTimeChange = (nextStart: string) => {
    setStartTime(nextStart);
    applyDurationToEnd(nextStart, currentDurationMinutes);
  };

  const handleDurationPreset = (preset: DurationPreset, minutes?: number) => {
    if (preset === 'custom' && minutes != null) {
      setCustomDurationMinutes(minutes);
      setDurationPreset('custom');
      applyDurationToEnd(startTime, minutes);
    } else if (preset !== 'custom') {
      setDurationPreset(preset);
      applyDurationToEnd(startTime, preset);
    }
  };

  const handleEndTimeChange = (nextEnd: string) => {
    setEndTime(nextEnd);
    const duration = getDurationMinutes(startTime, nextEnd);
    const match = DURATION_PRESETS.find((p) => p === duration);
    if (match != null) {
      setDurationPreset(match);
    } else {
      setDurationPreset('custom');
      setCustomDurationMinutes(duration);
    }
  };

  const weekDays = getThisWeekDays();
  const scoreFeedback = getScoreFeedback(score);

  const showOneSentenceNote = trackingOptions.oneSentenceNote !== false;
  const showDailyPhoto = trackingOptions.dailyPhoto !== false;
  const showCourseTopic = trackingOptions.courseTopic === true;
  const showKm = trackingOptions.km === true;
  const showCalories = trackingOptions.calories === true;

  const handleComplete = () => {
    onSave(
      score,
      notes.trim() || undefined,
      startTime,
      endTime,
      showCourseTopic ? courseTopic.trim() || undefined : undefined,
      showKm ? km.trim() || undefined : undefined,
      showCalories ? calories.trim() || undefined : undefined,
      checkInDate
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-drawer-title"
    >
      {/* 半透明背景遮罩，点击关闭 */}
      <button
        type="button"
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="关闭"
      />
      {/* 打卡主体：自底部滑出 */}
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col bg-ecru rounded-t-2xl border border-ring-bg border-b-0 animate-slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 flex flex-col w-full mx-auto px-4 pt-6 pb-8">
          <div className="bg-ecru rounded-2xl border border-ring-bg flex flex-col overflow-hidden">
            {/* 顶部：统计 | 大数字 | 编辑 */}
            <div className="flex justify-center items-center gap-4 py-6">
              <button
                type="button"
                onClick={() => onViewAttendanceStats?.()}
                className="w-16 h-16 rounded-full border-2 border-user-mom text-user-mom flex items-center justify-center text-xs font-medium hover:bg-user-mom/10 font-body"
              >
                统计
              </button>
              <div
                className={`${circleSizeClass} rounded-full border-2 border-user-mom flex items-center justify-center transition-[width,height] duration-200`}
                style={{
                  backgroundColor: `rgba(27, 38, 59, ${colorOpacity})`,
                  borderColor: `rgba(27, 38, 59, ${colorOpacity})`,
                }}
              >
                <span className={`text-white font-bold font-display leading-8 ${textSizeClass}`}>
                  {displayCount}
                </span>
              </div>
              <button
                type="button"
                onClick={() => tagId && onEditTag?.(tagId)}
                className="w-16 h-16 bg-user-mom rounded-full border-2 border-user-mom flex items-center justify-center"
                aria-label="编辑标签"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.6448 5.67667C18.0854 5.23619 18.3329 4.63872 18.333 4.01571C18.3331 3.3927 18.0857 2.79518 17.6452 2.35459C17.2047 1.91399 16.6073 1.66643 15.9842 1.66635C15.3612 1.66627 14.7637 1.91369 14.3231 2.35417L3.20145 13.4783C3.00797 13.6713 2.86488 13.9088 2.78478 14.17L1.68395 17.7967C1.66241 17.8687 1.66079 17.9453 1.67924 18.0182C1.6977 18.0911 1.73555 18.1577 1.78878 18.2108C1.84201 18.264 1.90863 18.3017 1.98158 18.3201C2.05453 18.3384 2.13108 18.3367 2.20312 18.315L5.83062 17.215C6.09159 17.1356 6.32909 16.9934 6.52228 16.8008L17.6448 5.67667Z" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div id="checkin-drawer-title" className="flex flex-col items-center gap-1 px-4">
              <h1 className="text-user-mom text-lg font-medium font-display tracking-widest leading-7">{task.title}</h1>
              {task.timeRange && (
                <p className="text-neutral-400 text-xs leading-5">{task.timeRange}</p>
              )}
            </div>

          {/* 本周完成情况：Map 循环，当前日期主色高亮 */}
          <div className="px-4 pt-4 pb-1">
            <div className="bg-ecru rounded-2xl border border-ring-bg flex flex-col gap-4 p-4">
              <p className="text-center text-stone-500 text-xs font-medium leading-5">本周完成情况</p>
              <div className="flex justify-between items-start gap-1">
                {weekDays.map((cell, index) => (
                  <div key={index} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <span className="text-neutral-400 text-[10px] leading-4">{cell.weekday}</span>
                    <div
                      className={`
                        w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-medium
                        ${cell.isToday
                          ? 'bg-user-mom text-white border-2 border-user-mom'
                          : cell.isOtherMonth
                            ? 'bg-white border border-user-mom opacity-30 text-user-mom'
                            : 'bg-white border border-user-mom text-user-mom'
                        }
                      `}
                    >
                      {cell.day}
                    </div>
                    {weekCompleted[index] && !cell.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white -mt-1 border-0.5 border-status-done" aria-hidden />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 最佳连续 | 本周成功率 | 累计次数 */}
          <div className="flex justify-between items-center px-4 py-4 gap-2">
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-num-primary text-xl font-medium font-display leading-8">{bestStreak}</span>
              <span className="text-neutral-400 text-[9px] leading-3 tracking-tight">最佳连续</span>
            </div>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-neutral-200 to-transparent" />
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-num-primary text-xl font-medium font-display leading-8">{weekRatePercent}%</span>
              <span className="text-neutral-400 text-[9px] leading-3 tracking-tight">本周成功率</span>
            </div>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-neutral-200 to-transparent" />
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-num-primary text-xl font-medium font-display leading-8">{totalCount}</span>
              <span className="text-neutral-400 text-[9px] leading-3 tracking-tight">累计次数</span>
            </div>
          </div>

          {/* 动态表单区：根据 trackingOptions 条件渲染，flex flex-col gap-4 自适应 */}
          <div className="px-4 pb-4 flex flex-col gap-4">
            {/* 核心项：今天状态如何？评分 + 打卡时间段（始终显示） */}
            <div className="bg-ecru rounded-2xl border border-ring-bg flex flex-col gap-4 p-6">
              <p className="text-center text-stone-500 text-sm font-medium leading-5">今天状态如何？</p>
              <div className="flex flex-col gap-3">
                <p className="text-center text-stone-500 text-xs font-light tracking-wide min-h-[2rem] leading-relaxed">
                  {scoreFeedback}
                </p>
                <div className="relative w-full h-2">
                  <div className="absolute inset-0 h-2 bg-neutral-200 rounded-full" />
                  <div
                    className="absolute left-0 top-0 h-2 bg-gradient-to-r from-neutral-500 to-neutral-600 rounded-full transition-[width] duration-150"
                    style={{ width: `${score}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer accent-neutral-600"
                    aria-label="状态评分 0-100"
                  />
                </div>
                <div className="flex justify-between px-1">
                  <span className="text-neutral-400 text-[10px] font-medium">0分</span>
                  <span className="text-neutral-400 text-[10px] font-medium">50分</span>
                  <span className="text-neutral-400 text-[10px] font-medium">100分</span>
                </div>
                {/* 打卡日期：默认今天，可补选过去日期，不支持未来 */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="text-neutral-400 text-[10px] font-medium">打卡日期</span>
                  <input
                    type="date"
                    value={checkInDate}
                    max={toDateString(new Date())}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="h-9 px-2 rounded-lg border border-ring-bg bg-white text-ink text-xs font-medium focus:outline-none focus:ring-1 focus:ring-user-mom/30 font-body"
                  />
                </div>
                {/* 开始时间 */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-neutral-400 text-[10px] font-medium">开始时间</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="h-9 px-2 rounded-lg border border-ring-bg bg-white text-ink text-xs font-medium focus:outline-none focus:ring-1 focus:ring-user-mom/30 font-body"
                  />
                </div>
                {/* 持续时间：30/60/90/自定义，选后截止时间自动计算 */}
                <div className="flex flex-col gap-2">
                  <span className="text-neutral-400 text-[10px] font-medium text-center">持续时间</span>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {DURATION_PRESETS.map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => handleDurationPreset(min)}
                        className={`h-9 px-3 rounded-lg border text-xs font-medium font-body transition-colors ${
                          durationPreset === min
                            ? 'border-user-mom bg-user-mom text-white'
                            : 'border-ring-bg bg-white text-ink hover:bg-user-mom/10'
                        }`}
                      >
                        {min}分钟
                      </button>
                    ))}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDurationPreset('custom', customDurationMinutes)}
                        className={`h-9 px-3 rounded-lg border text-xs font-medium font-body transition-colors ${
                          durationPreset === 'custom'
                            ? 'border-user-mom bg-user-mom text-white'
                            : 'border-ring-bg bg-white text-ink hover:bg-user-mom/10'
                        }`}
                      >
                        自定义
                      </button>
                      {durationPreset === 'custom' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={24 * 60 - 1}
                            value={customDurationMinutes}
                            onChange={(e) => {
                              const v = Math.min(24 * 60 - 1, Math.max(1, Number(e.target.value) || 1));
                              setCustomDurationMinutes(v);
                              applyDurationToEnd(startTime, v);
                            }}
                            className="w-14 h-9 px-2 rounded-lg border border-ring-bg bg-white text-ink text-xs font-medium text-center font-body focus:outline-none focus:ring-1 focus:ring-user-mom/30"
                          />
                          <span className="text-neutral-400 text-[10px]">分钟</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* 截止时间：可手动填写，填写后持续时间自动生成 */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-neutral-400 text-[10px] font-medium">截止时间</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    className="h-9 px-2 rounded-lg border border-ring-bg bg-white text-ink text-xs font-medium focus:outline-none focus:ring-1 focus:ring-user-mom/30 font-body"
                  />
                </div>
              </div>
            </div>

            {/* 可选：课程主题 / 公里数 / 卡路里（评价框上方紧凑型） */}
            {(showCourseTopic || showKm || showCalories) && (
              <div className="bg-ecru rounded-2xl border border-ring-bg p-3 flex flex-col gap-3">
                {showCourseTopic && (
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500 text-[10px] font-medium w-14 flex-shrink-0">课程主题</span>
                    <input
                      type="text"
                      value={courseTopic}
                      onChange={(e) => setCourseTopic(e.target.value)}
                      placeholder="选填"
                      className="flex-1 h-8 px-2 rounded-lg border border-ring-bg text-ink text-xs placeholder:text-stone-wash font-body outline-none"
                    />
                  </div>
                )}
                {showKm && (
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500 text-[10px] font-medium w-14 flex-shrink-0">公里数</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={km}
                      onChange={(e) => setKm(e.target.value)}
                      placeholder="选填"
                      className="flex-1 h-8 px-2 rounded-lg border border-ring-bg text-ink text-xs placeholder:text-stone-wash font-body outline-none"
                    />
                  </div>
                )}
                {showCalories && (
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500 text-[10px] font-medium w-14 flex-shrink-0">卡路里</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      placeholder="选填"
                      className="flex-1 h-8 px-2 rounded-lg border border-ring-bg text-ink text-xs placeholder:text-stone-wash font-body outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 可选：一句话评价 */}
            {showOneSentenceNote && (
              <div className="bg-ecru rounded-2xl border border-ring-bg p-4">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="补充一句话说明..."
                    className="w-full h-11 pl-4 pr-12 py-3 bg-white rounded-2xl border border-ring-bg text-ink text-xs placeholder:text-stone-wash font-body outline-none"
                  />
                  <button
                    type="button"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-neutral-100 rounded-[10px] flex items-center justify-center"
                    aria-label="锁定"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 1.33331C7.46957 1.33331 6.96086 1.54403 6.58579 1.9191C6.21071 2.29417 6 2.80288 6 3.33331V7.99998C6 8.53041 6.21071 9.03912 6.58579 9.41419C6.96086 9.78927 7.46957 9.99998 8 9.99998C8.53043 9.99998 9.03914 9.78927 9.41421 9.41419C9.78929 9.03912 10 8.53041 10 7.99998V3.33331C10 2.80288 9.78929 2.29417 9.41421 1.9191C9.03914 1.54403 8.53043 1.33331 8 1.33331Z" stroke="#999999" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12.6668 6.66669V8.00002C12.6668 9.2377 12.1752 10.4247 11.3 11.2999C10.4248 12.175 9.23784 12.6667 8.00016 12.6667C6.76249 12.6667 5.5755 12.175 4.70033 11.2999C3.82516 10.4247 3.3335 9.2377 3.3335 8.00002V6.66669" stroke="#999999" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 12.6667V14.6667" stroke="#999999" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* 可选：当日照片（配置关闭时整块不渲染） */}
            {showDailyPhoto && (
              <div className="bg-ecru rounded-2xl border border-ring-bg flex flex-col gap-4 p-6">
                <p className="text-center text-stone-500 text-sm font-medium leading-5">当日照片</p>
                <button
                  type="button"
                  className="w-full h-32 bg-white rounded-2xl border-2 border-ring-bg border-dashed flex flex-col justify-center items-center gap-2 text-stone-wash hover:border-user-mom/50 hover:bg-user-mom/5 font-body"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2" />
                    <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs font-medium">点击上传照片</span>
                </button>
              </div>
            )}
          </div>

          {/* 完成打卡 | 取消打卡（评分、评价、时间、照片均为可选） */}
          <div className="px-4 pb-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleComplete}
              className="w-full h-14 rounded-2xl text-white text-base font-medium leading-6 tracking-tight border border-user-mom bg-user-mom"
            >
              完成打卡
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 text-xs font-medium leading-4"
            >
              取消打卡
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

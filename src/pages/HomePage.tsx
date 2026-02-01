import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Pencil, Plus, Check, X, Calendar, CalendarRange } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { CheckInRecord, TagSettings, HouseworkTask } from '../types';
import {
  toDateString,
  timeToMinutes,
  timeRangesOverlap,
  daysUntil,
  getBestStreakForTag,
  parseDateString,
} from '../utils/dateUtils';
import { getThisWeekRange } from '../utils/checkInStats';
import { getUrgencyScore, getTaskDisplayInfo } from '../utils/housework';
import { getTagColorByName } from '../utils/tagUtils';
import { CheckInPage } from './CheckInPage';
import { HouseworkModal } from '../components/HouseworkModal';
import { TagDrawer } from '../components/TagDrawer';

import {
  STORAGE_KEY_RECORDS,
  STORAGE_KEY_TAG_SETTINGS,
  STORAGE_KEY_HOUSEWORK,
  STORAGE_KEY_OWNER_NAMES,
  STORAGE_KEY_OWNER_COLORS,
  STORAGE_KEY_CONFIG,
} from '@/constants/storage';
import { DEFAULT_OWNER_COLORS, getHexForColor, getContrastTextColor, type OwnerKey, type ThemeColorKey } from '@/constants/themeColors';
type TagSettingsMap = Record<string, TagSettings>;
type OwnerNames = Record<'Julia' | 'Maruko', string>;
const DEFAULT_OWNER_NAMES: OwnerNames = { Julia: '用户1', Maruko: '用户2' };

const WEEKDAY_ZH = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

const ACTIVE_TAGS_LIMIT = 4;
const PENDING_HOUSEWORK_LIMIT = 4;

const JOURNAL_BUTTON_TEXTS = [
  '忙了一天，看看到底干了些啥……',
  '今天都忙了些啥？记一笔',
  '写写今天的点滴',
  '今日份记录',
];

function getConfig(): { ownerNames?: OwnerNames } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw) as { ownerNames?: OwnerNames };
      return { ownerNames: parsed?.ownerNames };
    }
  } catch {
    // ignore
  }
  return {};
}

function getTodayDateText(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAY_ZH[d.getDay()]}`;
}

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `checkin-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateTagId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tag-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isInPlanToday(settings: TagSettings, weekday: number): boolean {
  const { frequency, repeatDays } = settings;
  if (frequency === 'daily') return true;
  if (frequency === 'weekly' || frequency === 'biweekly') {
    const days = repeatDays ?? [];
    return days.length === 0 || days.includes(weekday);
  }
  return false;
}

function isPeriodExpired(settings: TagSettings, today: string): boolean {
  if (settings.planType !== 'periodCard' || !settings.endDate) return false;
  return settings.endDate < today;
}

function getRemainingLessons(
  tagId: string,
  totalLessons: number,
  records: CheckInRecord[]
): number {
  const count = records.filter((r) => r.tagId === tagId).length;
  return Math.max(0, totalLessons - count);
}

function getPeriodDaysLeft(settings: TagSettings, today: string): number | null {
  if (settings.planType !== 'periodCard' || !settings.endDate) return null;
  const days = daysUntil(settings.endDate, new Date(today + 'T12:00:00'));
  if (days < 0) return null;
  if (days > 15) return null;
  return days;
}

/** 是否设置了时间段（未设置则视为「随时」） */
function hasTime(settings: TagSettings): boolean {
  return !!(settings.defaultStartTime && settings.defaultStartTime.trim());
}

/** 用于排序的分钟数：未设时间返回 24*60 使「随时」排到末尾 */
function getStartMinutes(settings: TagSettings): number {
  if (!hasTime(settings)) return 24 * 60;
  return timeToMinutes(settings.defaultStartTime ?? '00:00');
}

export interface TimelineRow {
  timeLabel: string;
  leftTags: TagSettings[];
  rightTags: TagSettings[];
  leftStart: string;
  leftEnd: string;
  rightStart: string;
  rightEnd: string;
}

function buildTimelineRows(
  juliaTasks: TagSettings[],
  marukoTasks: TagSettings[]
): TimelineRow[] {
  const ANYTIME = 24 * 60;
  const timeSet = new Set<number>();
  juliaTasks.forEach((t) => timeSet.add(getStartMinutes(t)));
  marukoTasks.forEach((t) => timeSet.add(getStartMinutes(t)));
  const sorted = Array.from(timeSet).sort((a, b) => a - b);
  const toTimeStr = (min: number) =>
    min >= ANYTIME ? '随时' : `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

  return sorted.map((min) => {
    const leftTags = juliaTasks
      .filter((t) => getStartMinutes(t) === min)
      .sort((a, b) => a.id.localeCompare(b.id));
    const rightTags = marukoTasks
      .filter((t) => getStartMinutes(t) === min)
      .sort((a, b) => a.id.localeCompare(b.id));
    const leftFirst = leftTags[0];
    const rightFirst = rightTags[0];
    const leftStart = leftFirst?.defaultStartTime ?? '00:00';
    const leftEnd = leftFirst?.defaultEndTime ?? leftFirst?.defaultStartTime ?? '00:00';
    const rightStart = rightFirst?.defaultStartTime ?? '00:00';
    const rightEnd = rightFirst?.defaultEndTime ?? rightFirst?.defaultStartTime ?? '00:00';
    return {
      timeLabel: toTimeStr(min),
      leftTags,
      rightTags,
      leftStart,
      leftEnd,
      rightStart,
      rightEnd,
    };
  });
}

function isRowConflict(row: TimelineRow): boolean {
  if (row.leftTags.length === 0 || row.rightTags.length === 0) return false;
  for (const left of row.leftTags) {
    const ls = left.defaultStartTime ?? '00:00';
    const le = left.defaultEndTime ?? left.defaultStartTime ?? '00:00';
    for (const right of row.rightTags) {
      const rs = right.defaultStartTime ?? '00:00';
      const re = right.defaultEndTime ?? right.defaultStartTime ?? '00:00';
      if (timeRangesOverlap(ls, le, rs, re)) return true;
    }
  }
  return false;
}

/** 单张标签卡片：标题 + 时间 + 可选角标/铅笔；支持拖拽归档与长按菜单；颜色与设置页/热力图同步 */
function TimeTagCard({
  settings,
  isConflict,
  remainingLessons,
  periodDaysLeft,
  isCheckedToday,
  todayCount,
  lastNoteSummary,
  onOpenCheckIn,
  onEditTag,
  onOpenRecords,
  onArchive,
  onDragStart,
  onDragEnd,
  isDragging,
  ownerHex,
  ownerTextColor,
}: {
  settings: TagSettings;
  isConflict: boolean;
  remainingLessons: number | null;
  periodDaysLeft: number | null;
  isCheckedToday: boolean;
  todayCount: number;
  lastNoteSummary: string;
  onOpenCheckIn: () => void;
  onEditTag: (e: React.MouseEvent) => void;
  onOpenRecords?: () => void;
  onArchive?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  /** 当前归属用户主题色（与设置页/热力图同步），仅 owner 为 Julia/Maruko 时有效 */
  ownerHex?: string;
  /** 在 ownerHex 背景上的对比文字色，保证可读 */
  ownerTextColor?: string;
}) {
  const [showArchiveMenu, setShowArchiveMenu] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLongPressStart = () => {
    longPressTimerRef.current = window.setTimeout(() => setShowArchiveMenu(true), 500);
  };
  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const timeRange = hasTime(settings)
    ? settings.defaultStartTime && settings.defaultEndTime
      ? `${settings.defaultStartTime}-${settings.defaultEndTime}`
      : settings.defaultStartTime
        ? `${settings.defaultStartTime}`
        : undefined
    : '随时';
  const showCountPack = settings.planType === 'countPack' && remainingLessons !== null && remainingLessons <= 3;
  const showPeriodDays = periodDaysLeft !== null;

  const tagColor = getTagColorByName(settings.name ?? '');
  const isLightBg = tagColor === 'tag-life';
  const useOwnerColor = !tagColor && ownerHex != null && ownerTextColor != null;

  const checkedCardClasses = isConflict
    ? 'bg-orange-50/40 border-orange-200'
    : isCheckedToday
      ? tagColor === 'tag-life'
        ? 'bg-tag-life border-tag-life'
        : tagColor === 'tag-light'
          ? 'bg-tag-light border-tag-light'
          : useOwnerColor
            ? ''
            : settings.owner === 'Maruko'
              ? 'bg-user-kid border-user-kid'
              : 'bg-user-mom border-user-mom'
      : tagColor === 'tag-life'
        ? 'bg-white border-tag-life'
      : tagColor === 'tag-light'
        ? 'bg-white border-tag-light'
        : useOwnerColor
            ? 'bg-white border'
            : 'bg-white border-user-mom';

  const cardStyle = useOwnerColor && isCheckedToday
    ? { backgroundColor: ownerHex, borderColor: ownerHex }
    : useOwnerColor && !isCheckedToday
      ? { borderColor: ownerHex }
      : undefined;

  const checkedTextClass = useOwnerColor
    ? ''
    : isCheckedToday && isLightBg
      ? 'text-ink'
      : isCheckedToday
        ? 'text-white'
        : tagColor === 'tag-light'
          ? 'text-tag-light'
          : 'text-user-mom';
  const checkedSubTextClass = useOwnerColor
    ? ''
    : isCheckedToday && isLightBg
      ? 'text-ink/80'
      : isCheckedToday
        ? 'text-white/80'
        : tagColor === 'tag-light'
          ? 'text-tag-light/70'
          : 'text-user-mom/70';

  const textStyle = useOwnerColor && isCheckedToday
    ? { color: ownerTextColor }
    : useOwnerColor && !isCheckedToday
      ? { color: ownerHex }
      : undefined;
  const subTextStyle = useOwnerColor && isCheckedToday
    ? { color: ownerTextColor + 'CC' }
    : useOwnerColor && !isCheckedToday
      ? { color: ownerHex + 'B3' }
      : undefined;

  return (
    <div className="relative w-full">
      {/* 角标：期间卡/次卡提醒 */}
      {showPeriodDays && (
        <div className="absolute left-2 -top-2 z-10 px-2 py-0.5 bg-tag-task rounded-lg border border-tag-task">
          <span className="text-white text-[8px] font-normal leading-tight">
            剩 {periodDaysLeft} 天
          </span>
        </div>
      )}
      {showCountPack && !showPeriodDays && (
        <div className="absolute left-2 -top-2 z-10 px-2 py-0.5 bg-madder rounded-lg border border-madder">
          <span className="text-ecru text-[8px] font-normal leading-tight">
            剩 {remainingLessons} 次
          </span>
        </div>
      )}
      {/* 卡片主体 */}
      <button
        type="button"
        draggable={!!onDragStart}
        onDragStart={(e) => {
          if (onDragStart) {
            e.dataTransfer.setData('text/plain', settings.id);
            e.dataTransfer.effectAllowed = 'move';
            onDragStart();
          }
        }}
        onDragEnd={() => onDragEnd?.()}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressEnd}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onClick={onOpenCheckIn}
        className={`w-full min-h-[56px] py-3 rounded-2xl border flex flex-col justify-center items-center gap-1 px-3 text-left relative ${checkedCardClasses} ${isDragging ? 'opacity-50' : ''} ${showArchiveMenu ? 'animate-pulse' : ''}`}
        style={cardStyle}
      >
        <div className="w-full flex items-center justify-between gap-1 min-w-0">
          <div className="min-w-0 flex-1 flex flex-col items-center justify-center gap-0.5">
            <span
                className={`text-sm font-medium leading-4 tracking-tight truncate block w-full text-center font-body ${checkedTextClass}`}
                style={textStyle}
            >
              {settings.name || '未命名'}
            </span>
            {timeRange && (
              <span
                className={`text-xs font-medium leading-4 tracking-tight block w-full text-center font-body ${checkedSubTextClass}`}
                style={subTextStyle}
              >
                {timeRange}
              </span>
            )}
            {lastNoteSummary && (
              <span
                className={`text-xs truncate block w-full text-center font-body ${
                  useOwnerColor ? '' : isCheckedToday ? (isLightBg ? 'text-ink/90' : 'text-white/90') : 'text-stone-wash'
                }`}
                style={useOwnerColor && isCheckedToday ? { color: ownerTextColor + 'E6' } : useOwnerColor ? { color: ownerHex + '99' } : undefined}
              >
                {lastNoteSummary}
              </span>
            )}
          </div>
          {showArchiveMenu && onArchive && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/30" onClick={(e) => { e.stopPropagation(); setShowArchiveMenu(false); }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onArchive(); setShowArchiveMenu(false); }}
                className="px-3 py-1.5 rounded-lg bg-madder text-ecru text-sm font-medium"
              >
                移到回收站
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {settings.memo && (
              <span className="text-xs text-stone-wash" title={settings.memo} aria-hidden>
                备忘
              </span>
            )}
            {isConflict && (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-madder"
                title="时间重叠"
                aria-hidden
              />
            )}
            <button
              type="button"
              onClick={onEditTag}
              className="p-1 rounded hover:bg-black/10 flex items-center justify-center"
              aria-label="编辑标签"
            >
              <Pencil
                size={12}
                className={isCheckedToday ? (isLightBg ? 'text-ink/80' : 'text-white/80') : 'text-stone-wash'}
              />
            </button>
            {todayCount > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenRecords?.();
                }}
                onKeyDown={(e) => e.key === 'Enter' && onOpenRecords?.()}
                className="min-w-[20px] h-[20px] rounded-full bg-madder/20 text-madder text-xs font-medium flex items-center justify-center font-display"
              >
                {todayCount}
              </span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

/** 家事看板：未完成列表 + 新增入口，内部处理排序与显示限制 */
function HouseworkSection({
  houseworkList,
  today,
  setHouseworkList,
  onNavigateTodo,
  onOpenAddModal,
}: {
  houseworkList: HouseworkTask[];
  today: string;
  setHouseworkList: React.Dispatch<React.SetStateAction<HouseworkTask[]>>;
  onNavigateTodo: () => void;
  onOpenAddModal: () => void;
}) {
  const pendingHousework = useMemo(
    () =>
      [...houseworkList]
        .sort((a, b) => getUrgencyScore(b, today) - getUrgencyScore(a, today))
        .filter((t) => t.lastDoneDate !== today),
    [houseworkList, today]
  );
  const displayList = pendingHousework.slice(0, PENDING_HOUSEWORK_LIMIT);
  const remaining = pendingHousework.length - displayList.length;

  return (
    <div className="bg-ecru rounded-2xl border border-tag-task flex flex-col overflow-hidden flex-shrink-0 border-0.5">
      <button
        type="button"
        onClick={onNavigateTodo}
        className="h-11 px-4 flex justify-between items-center w-full text-left"
      >
        <span className="text-tag-task text-sm font-medium leading-5 tracking-tight font-body">
          家事看板
          <span className="text-status-done text-xs font-medium ml-1">
            ({houseworkList.length})
          </span>
        </span>
        <span className="text-status-done text-xs font-medium leading-4">▶</span>
      </button>
      <div className="px-4 pb-3 flex flex-col gap-2">
        {displayList.length > 0 ? (
          <>
            <ul className="flex flex-col gap-2">
              {displayList.map((task) => {
                const displayInfo = getTaskDisplayInfo(task, today);
                const isExpired = displayInfo.isExpired;
                const urgencyScore = Math.min(1, displayInfo.urgencyScore);
                const opacity = isExpired ? 1 : 0.2 + 0.8 * urgencyScore;
                const isDark = opacity >= 0.5;
                const textClass = isDark ? 'text-white' : 'text-ink';
                const labelClass = isDark ? 'text-white/80' : 'text-stone-wash';
                const iconClass = isDark ? 'text-white/70 hover:text-white' : 'text-stone-wash hover:text-ink';
                return (
                  <li
                    key={task.id}
                    className="rounded-xl px-3 py-2.5 flex items-center gap-2.5 min-h-0 font-body text-[12px] leading-relaxed"
                    style={{ backgroundColor: `rgba(176, 139, 87, ${opacity})` }}
                  >
                    <span className={`flex-1 min-w-0 truncate font-medium ${textClass}`}>
                      {task.name}
                    </span>
                    <span className={`text-[11px] flex-shrink-0 ${labelClass}`}>
                      {displayInfo.label}
                    </span>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {displayInfo.action === 'RESTART_TIMER' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHouseworkList((prev) =>
                              prev.map((t) =>
                                t.id === task.id ? { ...t, startDate: today } : t
                              )
                            );
                          }}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/30 hover:bg-white/40 text-ink"
                        >
                          重新计时
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHouseworkList((prev) =>
                              prev.map((t) =>
                                t.id === task.id ? { ...t, lastDoneDate: today } : t
                              )
                            );
                          }}
                          className={`p-1 rounded-md ${iconClass}`}
                          aria-label="完成"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHouseworkList((prev) => prev.filter((t) => t.id !== task.id));
                        }}
                        className={`p-1 rounded-md ${iconClass}`}
                        aria-label="删除"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {remaining > 0 && (
              <button
                type="button"
                onClick={onNavigateTodo}
                className="text-stone-wash text-xs font-body hover:text-ink py-1"
              >
                还有 {remaining} 项待办…
              </button>
            )}
          </>
        ) : (
          <div className="min-h-[80px] flex items-center justify-center text-stone-wash text-xs font-body leading-relaxed">
            暂无家事，点击下方新增
          </div>
        )}
        <div className="pt-2 border-t border-ring-bg">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="w-full h-8 bg-action-primary rounded-[10px] flex justify-center items-center gap-1.5 text-ecru text-sm font-medium tracking-tight font-body border-0.5 border-action-primary"
          >
            <Plus size={14} />
            新增家事
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const today = toDateString(new Date());
  const weekday = new Date().getDay();
  const dateText = getTodayDateText();

  const [checkInRecords, setCheckInRecords] = useLocalStorage<CheckInRecord[]>(
    STORAGE_KEY_RECORDS,
    []
  );
  const [tagSettingsMap, setTagSettingsMap] = useLocalStorage<TagSettingsMap>(
    STORAGE_KEY_TAG_SETTINGS,
    {}
  );

  const [modalTagId, setModalTagId] = useState<string | null>(null);
  const [openRecordsTagId, setOpenRecordsTagId] = useState<string | null>(null);
  const [tagDrawerOwner, setTagDrawerOwner] = useState<'Julia' | 'Maruko' | null>(null);
  const [showHouseworkModal, setShowHouseworkModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [draggingTagId, setDraggingTagId] = useState<string | null>(null);

  const config = useMemo(getConfig, []);
  const journalButtonText = useMemo(
    () => JOURNAL_BUTTON_TEXTS[Math.floor(Math.random() * JOURNAL_BUTTON_TEXTS.length)],
    []
  );

  const [houseworkList, setHouseworkList] = useLocalStorage<HouseworkTask[]>(
    STORAGE_KEY_HOUSEWORK,
    []
  );
  const [ownerNames] = useLocalStorage<OwnerNames>(
    STORAGE_KEY_OWNER_NAMES,
    DEFAULT_OWNER_NAMES
  );
  const [ownerColors] = useLocalStorage<Partial<Record<OwnerKey, ThemeColorKey>>>(
    STORAGE_KEY_OWNER_COLORS,
    {}
  );

  const todayRecords = useMemo(
    () => checkInRecords.filter((r) => r.date === today),
    [checkInRecords, today]
  );

  const allTags = useMemo(
    () => Object.values(tagSettingsMap).filter((s) => s.name && !s.archived),
    [tagSettingsMap]
  );

  const archivedTags = useMemo(
    () => Object.values(tagSettingsMap).filter((s) => s.name && s.archived),
    [tagSettingsMap]
  );

  const timelineTags = useMemo(() => {
    return allTags.filter((s) => {
      if (isPeriodExpired(s, today)) return false;
      return isInPlanToday(s, weekday) || todayRecords.some((r) => r.tagId === s.id);
    });
  }, [allTags, weekday, today, todayRecords]);

  const juliaTasks = useMemo(
    () =>
      timelineTags
        .filter((s) => s.owner === 'Julia')
        .sort((a, b) => {
          const ma = getStartMinutes(a);
          const mb = getStartMinutes(b);
          if (ma !== mb) return ma - mb;
          return a.id.localeCompare(b.id);
        }),
    [timelineTags]
  );
  const marukoTasks = useMemo(
    () =>
      timelineTags
        .filter((s) => s.owner === 'Maruko')
        .sort((a, b) => {
          const ma = getStartMinutes(a);
          const mb = getStartMinutes(b);
          if (ma !== mb) return ma - mb;
          return a.id.localeCompare(b.id);
        }),
    [timelineTags]
  );

  /** 首页仅展示前 4 个活跃标签/用户 */
  const juliaDisplayTasks = useMemo(() => juliaTasks.slice(0, ACTIVE_TAGS_LIMIT), [juliaTasks]);
  const marukoDisplayTasks = useMemo(() => marukoTasks.slice(0, ACTIVE_TAGS_LIMIT), [marukoTasks]);
  const juliaOverflow = Math.max(0, juliaTasks.length - ACTIVE_TAGS_LIMIT);
  const marukoOverflow = Math.max(0, marukoTasks.length - ACTIVE_TAGS_LIMIT);

  const timelineRows = useMemo(
    () => buildTimelineRows(juliaDisplayTasks, marukoDisplayTasks),
    [juliaDisplayTasks, marukoDisplayTasks]
  );

  /** 某用户下全部标签（含归档），用于抽屉展示 */
  const allTagsByOwner = useMemo(() => {
    const list = Object.values(tagSettingsMap).filter((s) => s.name);
    const sortTags = (a: TagSettings, b: TagSettings) => {
      const ma = getStartMinutes(a);
      const mb = getStartMinutes(b);
      if (ma !== mb) return ma - mb;
      return a.id.localeCompare(b.id);
    };
    return {
      Julia: list.filter((s) => s.owner === 'Julia').sort(sortTags),
      Maruko: list.filter((s) => s.owner === 'Maruko').sort(sortTags),
    };
  }, [tagSettingsMap]);


  const getTodayCountForTag = (tagId: string) =>
    todayRecords.filter((r) => r.tagId === tagId).length;
  const getLastRecordForTag = (tagId: string): CheckInRecord | undefined => {
    const list = todayRecords.filter((r) => r.tagId === tagId);
    return list[list.length - 1];
  };
  const getTodayRecordsForTag = (tagId: string) =>
    todayRecords.filter((r) => r.tagId === tagId);
  const truncate = (text: string | undefined, len: number) =>
    !text ? '' : text.length <= len ? text : text.slice(0, len) + '...';

  const handleArchiveTag = (tagId: string) => {
    setTagSettingsMap((prev) => {
      const next = { ...prev };
      if (next[tagId]) next[tagId] = { ...next[tagId], archived: true };
      return next;
    });
    setDraggingTagId(null);
  };

  const handleRestoreTag = (tagId: string) => {
    setTagSettingsMap((prev) => {
      const next = { ...prev };
      if (next[tagId]) next[tagId] = { ...next[tagId], archived: false };
      return next;
    });
  };

  const handleDragOverArchive = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropArchive = (e: React.DragEvent) => {
    e.preventDefault();
    const tagId = e.dataTransfer.getData('text/plain');
    if (tagId) handleArchiveTag(tagId);
  };

  const handleSaveCheckIn = (record: CheckInRecord) => {
    setCheckInRecords((prev) => [...prev, record]);
  };

  const handleCheckInSave = (
    score?: number,
    notes?: string,
    startTime?: string,
    endTime?: string,
    courseTopic?: string,
    km?: string,
    calories?: string,
    checkInDate?: string
  ) => {
    if (!modalTagId) return;
    const dateToSave = checkInDate && checkInDate <= today ? checkInDate : today;
    handleSaveCheckIn({
      id: generateId(),
      tagId: modalTagId,
      date: dateToSave,
      score,
      notes: notes?.trim() || undefined,
      startTime,
      endTime,
      courseTopic: courseTopic?.trim() || undefined,
      km: km?.trim() || undefined,
      calories: calories?.trim() || undefined,
    });
    setModalTagId(null);
  };

  const modalTag = modalTagId ? tagSettingsMap[modalTagId] : undefined;
  const openRecordsTag = openRecordsTagId ? tagSettingsMap[openRecordsTagId] : undefined;
  const openRecordsList = openRecordsTagId ? getTodayRecordsForTag(openRecordsTagId) : [];

  /** 打卡页所需统计：仅当 modalTag 存在时计算 */
  const modalTagStats = useMemo(() => {
    if (!modalTag) return undefined;
    const tagRecords = checkInRecords.filter((r) => r.tagId === modalTag.id);
    const totalCount = tagRecords.length;
    const bestStreak = getBestStreakForTag(modalTag.id, checkInRecords);
    const [weekStartStr] = getThisWeekRange(today);
    const tagDates = new Set(tagRecords.map((r) => r.date));
    let weekPlanned = 0;
    let weekSuccess = 0;
    const weekCompleted: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const d = parseDateString(weekStartStr);
      d.setDate(d.getDate() + i);
      const dateStr = toDateString(d);
      const wd = d.getDay();
      const completed = tagDates.has(dateStr);
      weekCompleted.push(completed);
      if (isInPlanToday(modalTag, wd)) {
        weekPlanned++;
        if (completed) weekSuccess++;
      }
    }
    const weekRatePercent = weekPlanned === 0 ? 100 : Math.round((weekSuccess / weekPlanned) * 100);
    return { totalCount, bestStreak, weekRatePercent, weekCompleted };
  }, [modalTag, checkInRecords, today]);

  return (
    <div className="max-w-[430px] mx-auto w-full min-h-screen bg-ecru flex flex-col pl-4 pr-4 py-7 gap-2.5">
      {/* 顶部：设置 + 全年情况 */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <div className="flex justify-end items-center h-4">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="h-4 px-1.5 rounded-lg flex items-center gap-1 text-stone-wash hover:text-ink font-body"
            aria-label="设置"
          >
            <Settings size={12} className="text-stone-wash" />
            <span className="text-[9px] font-medium tracking-tight">设置</span>
          </button>
        </div>
        <div className="self-stretch h-px bg-ring-bg border-0" />
      </div>

      {/* 中央：时间轴 + 家事看板 + TODAY */}
      <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
        {/* 时间轴卡片 */}
        <div className="bg-ecru rounded-2xl border border-ring-bg flex flex-col overflow-hidden flex-shrink-0 border-0.5">
          <div className="pt-4 pb-2 flex justify-center">
            <span className="text-num-primary text-xs font-normal font-display tracking-widest leading-4" style={{ fontFamily: '"PingFang SC"' }}>
              Hi，今天是 {dateText}
            </span>
          </div>
          <div className="flex-1 min-h-0 pl-3 pb-3 pr-1 flex flex-col gap-2 overflow-hidden">
            {/* 双栏时间轴：左列顶端显示用户1名，右列顶端显示用户2名 */}
            <div className="grid grid-cols-[1fr_1px_1fr] gap-3 items-start overflow-auto min-h-[200px]">
              <div className="flex flex-col gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setTagDrawerOwner('Julia')}
                  className="h-6 flex items-center justify-center text-num-primary text-xs font-medium tracking-tight font-display font-body hover:text-action-primary w-full"
                >
                  {config.ownerNames?.Julia ?? ownerNames.Julia ?? DEFAULT_OWNER_NAMES.Julia}
                </button>
                {timelineRows.map((row, i) => (
                  <div key={`L-${i}`} className="min-h-[60px] flex flex-col gap-2">
                    {row.leftTags.map((tag) => (
                      <TimeTagCard
                        key={tag.id}
                        settings={tag}
                        isConflict={isRowConflict(row)}
                        remainingLessons={
                          tag.planType === 'countPack' && tag.totalLessons != null
                            ? getRemainingLessons(tag.id, tag.totalLessons, checkInRecords)
                            : null
                        }
                        periodDaysLeft={getPeriodDaysLeft(tag, today)}
                        isCheckedToday={getTodayCountForTag(tag.id) > 0}
                        todayCount={getTodayCountForTag(tag.id)}
                        lastNoteSummary={truncate(getLastRecordForTag(tag.id)?.notes, 12)}
                        onOpenCheckIn={() => setModalTagId(tag.id)}
                        onEditTag={(e) => {
                          e.stopPropagation();
                          navigate(`/tag-settings/${tag.id}`);
                        }}
                        onOpenRecords={
                          getTodayCountForTag(tag.id) > 0
                            ? () => setOpenRecordsTagId(tag.id)
                            : undefined
                        }
                        onArchive={() => handleArchiveTag(tag.id)}
                        onDragStart={() => setDraggingTagId(tag.id)}
                        onDragEnd={() => setDraggingTagId(null)}
                        isDragging={draggingTagId === tag.id}
                        ownerHex={tag.owner ? getHexForColor((ownerColors[tag.owner] ?? DEFAULT_OWNER_COLORS[tag.owner]) as ThemeColorKey) : undefined}
                        ownerTextColor={tag.owner ? getContrastTextColor(getHexForColor((ownerColors[tag.owner] ?? DEFAULT_OWNER_COLORS[tag.owner]) as ThemeColorKey)) : undefined}
                      />
                    ))}
                  </div>
                ))}
                {timelineRows.length === 0 && juliaDisplayTasks.length === 0 && (
                  <p className="text-stone-wash text-xs py-2 font-body">暂无安排</p>
                )}
                {juliaOverflow > 0 && (
                  <button
                    type="button"
                    onClick={() => setTagDrawerOwner('Julia')}
                    className="w-8 h-8 rounded-full bg-stone-wash/10 text-num-primary text-xs font-display font-medium flex items-center justify-center flex-shrink-0 mx-auto hover:bg-stone-wash/20"
                  >
                    +{juliaOverflow}
                  </button>
                )}
              </div>
              <div className="relative flex flex-col items-center">
                <div className="h-6" aria-hidden />
                <div className="absolute inset-y-0 left-1/2 -translate-x-px w-px bg-ring-bg" />
                {timelineRows.map((row, i) => (
                  <div key={`A-${i}`} className="min-h-[56px] w-full flex justify-center py-1">
                    {isRowConflict(row) && (
                      <div
                        className="w-0.5 min-h-full flex-1 bg-orange-200 rounded-full"
                        aria-hidden
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setTagDrawerOwner('Maruko')}
                  className="h-6 flex items-center justify-center text-num-primary text-xs font-medium tracking-tight font-display font-body hover:text-action-primary w-full"
                >
                  {config.ownerNames?.Maruko ?? ownerNames.Maruko ?? DEFAULT_OWNER_NAMES.Maruko}
                </button>
                {timelineRows.map((row, i) => (
                  <div key={`R-${i}`} className="min-h-[60px] flex flex-col gap-2">
                    {row.rightTags.map((tag) => (
                      <TimeTagCard
                        key={tag.id}
                        settings={tag}
                        isConflict={isRowConflict(row)}
                        remainingLessons={
                          tag.planType === 'countPack' && tag.totalLessons != null
                            ? getRemainingLessons(tag.id, tag.totalLessons, checkInRecords)
                            : null
                        }
                        periodDaysLeft={getPeriodDaysLeft(tag, today)}
                        isCheckedToday={getTodayCountForTag(tag.id) > 0}
                        todayCount={getTodayCountForTag(tag.id)}
                        lastNoteSummary={truncate(getLastRecordForTag(tag.id)?.notes, 12)}
                        onOpenCheckIn={() => setModalTagId(tag.id)}
                        onEditTag={(e) => {
                          e.stopPropagation();
                          navigate(`/tag-settings/${tag.id}`);
                        }}
                        onOpenRecords={
                          getTodayCountForTag(tag.id) > 0
                            ? () => setOpenRecordsTagId(tag.id)
                            : undefined
                        }
                        onArchive={() => handleArchiveTag(tag.id)}
                        onDragStart={() => setDraggingTagId(tag.id)}
                        onDragEnd={() => setDraggingTagId(null)}
                        isDragging={draggingTagId === tag.id}
                        ownerHex={tag.owner ? getHexForColor((ownerColors[tag.owner] ?? DEFAULT_OWNER_COLORS[tag.owner]) as ThemeColorKey) : undefined}
                        ownerTextColor={tag.owner ? getContrastTextColor(getHexForColor((ownerColors[tag.owner] ?? DEFAULT_OWNER_COLORS[tag.owner]) as ThemeColorKey)) : undefined}
                      />
                    ))}
                  </div>
                ))}
                {timelineRows.length === 0 && marukoDisplayTasks.length === 0 && (
                  <p className="text-stone-wash text-xs py-2 font-body">暂无安排</p>
                )}
                {marukoOverflow > 0 && (
                  <button
                    type="button"
                    onClick={() => setTagDrawerOwner('Maruko')}
                    className="w-8 h-8 rounded-full bg-stone-wash/10 text-num-primary text-xs font-display font-medium flex items-center justify-center flex-shrink-0 mx-auto hover:bg-stone-wash/20"
                  >
                    +{marukoOverflow}
                  </button>
                )}
              </div>
            </div>

            <div className="h-14 pt-2 border-t border-ring-bg flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate(`/tag-settings/${generateTagId()}`)}
                className="w-11 h-11 rounded-[10px] bg-action-primary text-ecru flex items-center justify-center hover:bg-action-primary/90 font-body border-0.5 border-action-primary"
                aria-label="新增标签"
              >
                <Plus size={18} />
              </button>
              <div
                className={`w-11 h-11 rounded-[10px] border-0.5 flex items-center justify-center cursor-pointer transition-colors ${
                  draggingTagId ? 'bg-madder/20 border-madder' : 'border-status-done text-status-done'
                }`}
                onDragOver={handleDragOverArchive}
                onDrop={handleDropArchive}
                onClick={() => setShowArchiveModal(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setShowArchiveModal(true)}
                aria-label={`标签终止站 (${archivedTags.length})`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M13.9999 2H1.99992C1.63173 2 1.33325 2.29848 1.33325 2.66667V4.66667C1.33325 5.03486 1.63173 5.33333 1.99992 5.33333H13.9999C14.3681 5.33333 14.6666 5.03486 14.6666 4.66667V2.66667C14.6666 2.29848 14.3681 2 13.9999 2Z"
                    stroke="currentColor"
                    strokeWidth="1.33333"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2.66675 5.33331V12.6666C2.66675 13.0203 2.80722 13.3594 3.05727 13.6095C3.30732 13.8595 3.64646 14 4.00008 14H12.0001C12.3537 14 12.6928 13.8595 12.9429 13.6095C13.1929 13.3594 13.3334 13.0203 13.3334 12.6666V5.33331"
                    stroke="currentColor"
                    strokeWidth="1.33333"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 家事看板 */}
        <HouseworkSection
          houseworkList={houseworkList}
          today={today}
          setHouseworkList={setHouseworkList}
          onNavigateTodo={() => navigate('/todo')}
          onOpenAddModal={() => setShowHouseworkModal(true)}
        />

      </div>

      {/* 底部操作栏：今日日记 + 周视角 + 年轮 */}
      <nav className="flex-shrink-0 h-16 flex items-center justify-center gap-3 px-4 border-t border-ring-bg bg-ecru">
        <button
          type="button"
          onClick={() => navigate('/weekly')}
          className="p-2 rounded-lg text-stone-wash hover:text-ink hover:bg-stone-wash/10"
          aria-label="周视角"
        >
          <Calendar size={20} />
        </button>
        <button
          type="button"
          onClick={() => navigate('/journal')}
          className="h-10 px-5 rounded-full bg-action-primary text-ecru text-sm font-medium font-display tracking-wide flex items-center justify-center hover:bg-action-primary/90 shrink min-w-0"
        >
          <span className="truncate">{journalButtonText}</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/heatmap')}
          className="p-2 rounded-lg text-stone-wash hover:text-ink hover:bg-stone-wash/10"
          aria-label="年轮"
        >
          <CalendarRange size={20} />
        </button>
      </nav>

      {/* 新建家事弹窗 */}
      {showHouseworkModal && (
        <HouseworkModal
          onClose={() => setShowHouseworkModal(false)}
          onCreated={(task) => {
            setHouseworkList((prev) => [...prev, task]);
            setShowHouseworkModal(false);
          }}
        />
      )}

      {/* 打卡抽屉 */}
      {modalTag && (
        <CheckInPage
          task={{
            title: modalTag.name,
            timeRange:
              modalTag.defaultStartTime && modalTag.defaultEndTime
                ? `${modalTag.defaultStartTime}-${modalTag.defaultEndTime}`
                : undefined,
          }}
          tagId={modalTag.id}
          onClose={() => setModalTagId(null)}
          onSave={handleCheckInSave}
          onEditTag={(id) => {
            setModalTagId(null);
            navigate(`/tag-settings/${id}`);
          }}
          onViewAttendanceStats={() => {
            setModalTagId(null);
            navigate(`/attendance-print/${encodeURIComponent(modalTag.id)}`);
          }}
          trackingOptions={modalTag.trackingOptions}
          defaultStartTime={modalTag.defaultStartTime}
          defaultEndTime={modalTag.defaultEndTime}
          totalCount={modalTagStats?.totalCount ?? 0}
          bestStreak={modalTagStats?.bestStreak ?? 0}
          weekRatePercent={modalTagStats?.weekRatePercent ?? 0}
          weekCompleted={modalTagStats?.weekCompleted}
        />
      )}

      {/* 标签抽屉：某用户全部标签 */}
      {tagDrawerOwner && (
        <TagDrawer
          owner={tagDrawerOwner}
          ownerName={config.ownerNames?.[tagDrawerOwner] ?? ownerNames[tagDrawerOwner] ?? DEFAULT_OWNER_NAMES[tagDrawerOwner]}
          tags={allTagsByOwner[tagDrawerOwner]}
          onClose={() => setTagDrawerOwner(null)}
          onCheckIn={(tagId) => {
            setTagDrawerOwner(null);
            setModalTagId(tagId);
          }}
          onEditTag={(tagId) => {
            setTagDrawerOwner(null);
            navigate(`/tag-settings/${tagId}`);
          }}
        />
      )}

      {/* 标签回收站弹窗 */}
      {showArchiveModal && (
        <div
          className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-black/20"
          onClick={() => setShowArchiveModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-ecru border border-ring-bg p-4 border-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-ink text-sm font-medium font-display">
                标签终止站 ({archivedTags.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="p-1 rounded text-stone-wash hover:text-ink font-body"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            {archivedTags.length === 0 ? (
              <p className="text-stone-wash text-sm py-4 text-center font-body">暂无已归档标签</p>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-auto">
                {archivedTags.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 py-3 px-3 rounded-2xl bg-ecru border border-ring-bg text-left border-0.5"
                  >
                    <span className="text-ink text-sm font-medium truncate font-body">{s.name || '未命名'}</span>
                    <button
                      type="button"
                      onClick={() => handleRestoreTag(s.id)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-action-primary text-ecru text-xs font-medium font-body"
                    >
                      恢复
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 今日记录弹窗 */}
      {openRecordsTagId && openRecordsTag && (
        <div
          className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-black/20"
          onClick={() => setOpenRecordsTagId(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-ecru border border-ring-bg p-4 border-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-ink text-sm font-medium font-display">
                {openRecordsTag.name} · 今日记录
              </h3>
              <button
                type="button"
                onClick={() => setOpenRecordsTagId(null)}
                className="p-1 rounded text-stone-wash hover:text-ink font-body"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            <ul className="space-y-2 max-h-60 overflow-auto">
              {openRecordsList.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start gap-2 py-2 px-3 rounded-2xl bg-ecru border border-ring-bg text-left border-0.5"
                >
                  <span className="text-madder text-sm font-display flex-shrink-0">
                    {r.score ?? '-'}分
                  </span>
                  <div className="min-w-0 flex-1">
                    {(r.startTime || r.endTime) && (
                      <span className="text-[10px] text-stone-wash block font-body">
                        {[r.startTime, r.endTime].filter(Boolean).join(' － ')}
                      </span>
                    )}
                    {r.notes ? (
                      <p className="text-xs text-ink font-body">「{r.notes}」</p>
                    ) : (
                      <p className="text-xs text-stone-wash font-body">无备注</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { STORAGE_KEY_RECORDS, STORAGE_KEY_TAG_SETTINGS, STORAGE_KEY_OWNER_NAMES, STORAGE_KEY_OWNER_COLORS } from '@/constants/storage';
import { getStoredJson } from '@/utils/storage';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { DEFAULT_OWNER_COLORS, getHexForColor, type OwnerKey } from '@/constants/themeColors';
import { JournalDrawer } from './JournalDrawer';

type OwnerNames = Record<'Julia' | 'Maruko', string>;
const DEFAULT_OWNER_NAMES: OwnerNames = { Julia: '用户1', Maruko: '用户2' };

/** 热力图无记录时环的背景色（与画布一致） */
const RING_BACKGROUND = '#E8E6E1';
const PER_TAG_PERCENT = 20; // 每完成一项标签 +20%，5 个及以上 = 100%

const START_YEAR = 2026;
const END_YEAR = 2028;

type ActivityDataMap = Record<string, { mamaValue: number; babyValue: number }>;

interface CheckInRecord {
  id: string;
  tagId: string;
  date: string;
}

interface TagSettings {
  id: string;
  owner?: 'Julia' | 'Maruko';
}

/**
 * 从 localStorage 读取打卡记录与标签归属，按用户1/用户2计算每日圆环
 * 用户1(Julia)=外圈，用户2(Maruko)=内圈
 * 每完成一项该用户名下的标签 +20%，5 个及以上 = 100%
 */
function getRealActivityData(): ActivityDataMap {
  const result: ActivityDataMap = {};
  const records = getStoredJson<CheckInRecord[]>(STORAGE_KEY_RECORDS, []);
  const tagSettings = getStoredJson<Record<string, TagSettings>>(STORAGE_KEY_TAG_SETTINGS, {});
  if (!Array.isArray(records)) return result;

  const byDate = new Map<string, { julia: number; maruko: number }>();
  for (const r of records) {
    const tag = tagSettings[r.tagId];
    const owner = tag?.owner ?? 'Julia';
    const date = r.date;
    if (!byDate.has(date)) byDate.set(date, { julia: 0, maruko: 0 });
    const counts = byDate.get(date)!;
    if (owner === 'Julia') counts.julia++;
    else counts.maruko++;
  }

  for (const [dateKey, counts] of byDate) {
    const mamaValue = Math.min(100, counts.julia * PER_TAG_PERCENT);
    const babyValue = Math.min(100, counts.maruko * PER_TAG_PERCENT);
    if (mamaValue > 0 || babyValue > 0) {
      result[dateKey] = { mamaValue, babyValue };
    }
  }
  return result;
}

function getDataKey(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

interface ActivityRingProps {
  day: number;
  mamaValue?: number;
  babyValue?: number;
  onSelectDate?: (dateKey: string) => void;
  dateKey: string;
  /** 外圈颜色（用户1），与设置页同步 */
  mamaColor: string;
  /** 内圈颜色（用户2），与设置页同步 */
  babyColor: string;
}

function ActivityRing({ day, mamaValue = 0, babyValue = 0, onSelectDate, dateKey, mamaColor, babyColor }: ActivityRingProps) {
  const cx = 18;
  const cy = 18;
  const rMama = 14;
  const rBaby = 9;
  const stroke = 3.5;

  const circMama = 2 * Math.PI * rMama;
  const circBaby = 2 * Math.PI * rBaby;

  const offsetMama = circMama * (1 - (mamaValue ?? 0) / 100);
  const offsetBaby = circBaby * (1 - (babyValue ?? 0) / 100);

  /* 进度环颜色：只有 value > 0 时显示主题色，否则与背景一致表示无记录 */
  const strokeMama = (mamaValue ?? 0) > 0 ? mamaColor : RING_BACKGROUND;
  const strokeBaby = (babyValue ?? 0) > 0 ? babyColor : RING_BACKGROUND;

  return (
    <button
      type="button"
      onClick={() => onSelectDate?.(dateKey)}
      className="group aspect-square flex flex-col items-center justify-center gap-0.5 p-1 rounded-lg hover:bg-status-pending transition-colors outline-none focus:ring-2 focus:ring-user-mom/30 focus:ring-offset-1 border-0.5 border-transparent"
      aria-label={`${dateKey} 妈妈${mamaValue}% 宝宝${babyValue}%`}
    >
      <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0">
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {/* 背景环：固定颜色 */}
          <circle cx={cx} cy={cy} r={rMama} fill="none" stroke={RING_BACKGROUND} strokeWidth={stroke} />
          {/* 妈妈外圈进度：有值则亮起 */}
          <circle
            cx={cx}
            cy={cy}
            r={rMama}
            fill="none"
            stroke={strokeMama}
            strokeWidth={stroke}
            strokeDasharray={circMama}
            strokeDashoffset={offsetMama}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={rBaby} fill="none" stroke={RING_BACKGROUND} strokeWidth={stroke} />
          {/* 宝宝内圈进度：有值则亮起 */}
          <circle
            cx={cx}
            cy={cy}
            r={rBaby}
            fill="none"
            stroke={strokeBaby}
            strokeWidth={stroke}
            strokeDasharray={circBaby}
            strokeDashoffset={offsetBaby}
            strokeLinecap="round"
          />
        </g>
      </svg>
      <span className="text-num-primary group-hover:text-ecru text-sm font-medium font-pingfang leading-none transition-colors">{day}</span>
    </button>
  );
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

interface MonthCell {
  key: string;
  blank?: boolean;
  day?: number;
  mamaValue?: number;
  babyValue?: number;
  dateKey?: string;
}

interface MonthData {
  year: number;
  month: number;
  label: string;
  cells: MonthCell[];
}

function buildYearMonths(year: number, activityData: ActivityDataMap): MonthData[] {
  const months: MonthData[] = [];
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const cells: MonthCell[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push({ key: `blank-${year}-${month}-${i}`, blank: true });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = getDataKey(year, month, day);
      const data = activityData[dateKey];
      /* 无日记则严格为 0，触发灰色不亮逻辑 */
      const mamaValue = typeof data?.mamaValue === 'number' ? data.mamaValue : 0;
      const babyValue = typeof data?.babyValue === 'number' ? data.babyValue : 0;
      cells.push({
        key: dateKey,
        day,
        mamaValue,
        babyValue,
        dateKey,
      });
    }

    months.push({
      year,
      month,
      label: `${month}月`,
      cells,
    });
  }
  return months;
}

export function TimeTracesHeatmap() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [activityData, setActivityData] = useState<ActivityDataMap>(() => getRealActivityData());
  const [ownerNames] = useLocalStorage<OwnerNames>(STORAGE_KEY_OWNER_NAMES, DEFAULT_OWNER_NAMES);
  const [ownerColors] = useLocalStorage<Partial<Record<OwnerKey, string>>>(STORAGE_KEY_OWNER_COLORS, {});

  const mamaHex = getHexForColor((ownerColors?.Julia ?? DEFAULT_OWNER_COLORS.Julia) as Parameters<typeof getHexForColor>[0]);
  const babyHex = getHexForColor((ownerColors?.Maruko ?? DEFAULT_OWNER_COLORS.Maruko) as Parameters<typeof getHexForColor>[0]);

  const refreshActivityData = useCallback(() => {
    setActivityData(getRealActivityData());
  }, []);

  useEffect(() => {
    refreshActivityData();
  }, [refreshActivityData]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_RECORDS || e.key === STORAGE_KEY_TAG_SETTINGS || e.key === STORAGE_KEY_OWNER_COLORS) {
        if (e.key !== STORAGE_KEY_OWNER_COLORS) refreshActivityData();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshActivityData]);

  const handleSelectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    setIsJournalOpen(true);
  };

  const handleCloseJournal = () => {
    setIsJournalOpen(false);
    setSelectedDate(null);
    refreshActivityData();
  };

  const yearSections: { year: number; months: MonthData[] }[] = [];
  for (let y = START_YEAR; y <= END_YEAR; y++) {
    yearSections.push({ year: y, months: buildYearMonths(y, activityData) });
  }

  return (
    <div className="h-screen flex flex-col bg-ecru overflow-hidden">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-ring-bg bg-ecru">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="size-9 flex items-center justify-center rounded-lg text-ink hover:bg-[#EDEBE7]"
          aria-label="返回"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-num-primary text-base font-medium font-display tracking-widest font-body">
          {START_YEAR}-{END_YEAR} 活动热力图
        </h1>
      </header>

      <div className="flex-shrink-0 flex items-center justify-center gap-4 px-4 py-2 bg-ecru border-b border-ring-bg text-xs text-stone-wash font-body">
        <span className="flex items-center gap-1.5 text-ink" style={{ fontFamily: '"Apple Color Emoji"' }}>
          <span className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: mamaHex }} aria-hidden />
          外圈：{ownerNames.Julia || DEFAULT_OWNER_NAMES.Julia}
        </span>
        <span className="flex items-center gap-1.5 text-ink" style={{ fontFamily: '"Apple Color Emoji"' }}>
          <span className="size-2 rounded-full border-2 bg-transparent flex-shrink-0" style={{ borderColor: babyHex }} aria-hidden />
          内圈：{ownerNames.Maruko || DEFAULT_OWNER_NAMES.Maruko}
        </span>
      </div>

      <div className="flex-shrink-0 w-[334px] mx-auto grid grid-cols-7 gap-1 px-2 py-2 bg-ecru border-b border-ring-bg">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="flex justify-center text-num-primary text-[10px] font-medium font-body">
            {label}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col items-center font-pingfang">
        {yearSections.map(({ year, months }) => (
          <div key={year} className="w-full max-w-[334px] mb-8 font-pingfang">
            <h2 className="text-num-primary text-lg font-semibold font-pingfang tracking-widest mb-4 px-2">{year}年</h2>
            {months.map(({ year: y, month, label, cells }) => (
              <section
                key={`${y}-${month}`}
                className="w-[334px] min-h-[480px] mb-6 p-4 bg-ecru rounded-2xl border border-ring-bg font-pingfang"
              >
                <h3 className="text-madder text-lg font-medium font-pingfang tracking-widest mb-3 px-1">{label}</h3>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((cell) =>
                    cell.blank ? (
                      <div key={cell.key} className="aspect-square" aria-hidden />
                    ) : (
                      <ActivityRing
                        key={cell.key}
                        day={cell.day!}
                        mamaValue={cell.mamaValue}
                        babyValue={cell.babyValue}
                        dateKey={cell.dateKey!}
                        onSelectDate={handleSelectDate}
                        mamaColor={mamaHex}
                        babyColor={babyHex}
                      />
                    )
                  )}
                </div>
              </section>
            ))}
          </div>
        ))}
      </div>

      {isJournalOpen && selectedDate && (
        <JournalDrawer selectedDate={selectedDate} onClose={handleCloseJournal} />
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  STORAGE_KEY_RECORDS,
  STORAGE_KEY_TAG_SETTINGS,
  STORAGE_KEY_JOURNAL,
  STORAGE_KEY_CONFIG,
  STORAGE_KEY_OWNER_COLORS,
} from '@/constants/storage';
import { DEFAULT_OWNER_COLORS, getHexForColor, THEME_COLOR_OPTIONS, type OwnerKey, type ThemeColorKey } from '@/constants/themeColors';
import { getThisWeekRange } from '@/utils/checkInStats';
import { parseDateString, toDateString, getWeekNumberInYear } from '@/utils/dateUtils';
import type { CheckInRecord, TagSettings } from '@/types';

const DAY_ABBR = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DEFAULT_OWNER_NAMES: Record<'Julia' | 'Maruko', string> = { Julia: '用户1', Maruko: '用户2' };

type TimeTracesConfig = {
  title?: string;
  ownerNames?: Record<'Julia' | 'Maruko', string>;
};

function getConfig(): TimeTracesConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw) as TimeTracesConfig;
      return { title: parsed?.title, ownerNames: parsed?.ownerNames };
    }
  } catch {
    // ignore
  }
  const rawNames = localStorage.getItem('time-traces-owner-names');
  let ownerNames: Record<'Julia' | 'Maruko', string> | undefined;
  if (rawNames) {
    try {
      ownerNames = JSON.parse(rawNames) as Record<'Julia' | 'Maruko', string>;
    } catch {
      // ignore
    }
  }
  return { title: '周记', ownerNames };
}

function getColorLabel(key: string): string {
  const opt = THEME_COLOR_OPTIONS.find((o) => o.key === key);
  return opt?.label ?? '深蓝色';
}

export function WeeklyViewPage() {
  const navigate = useNavigate();
  const [weekAnchor, setWeekAnchor] = useState(() => toDateString(new Date()));

  const [checkInRecords] = useLocalStorage<CheckInRecord[]>(STORAGE_KEY_RECORDS, []);
  const [tagSettingsMap] = useLocalStorage<Record<string, TagSettings>>(STORAGE_KEY_TAG_SETTINGS, {});
  const [journalEntries] = useLocalStorage<Record<string, string>>(STORAGE_KEY_JOURNAL, {});
  const [ownerColors] = useLocalStorage<Partial<Record<OwnerKey, ThemeColorKey>>>(STORAGE_KEY_OWNER_COLORS, {});

  const config = useMemo(getConfig, []);

  const legendItems = useMemo(() => {
    const JuliaName = config.ownerNames?.Julia ?? DEFAULT_OWNER_NAMES.Julia;
    const MarukoName = config.ownerNames?.Maruko ?? DEFAULT_OWNER_NAMES.Maruko;
    const juliaKey = (ownerColors?.Julia ?? DEFAULT_OWNER_COLORS.Julia) as ThemeColorKey;
    const marukoKey = (ownerColors?.Maruko ?? DEFAULT_OWNER_COLORS.Maruko) as ThemeColorKey;
    return [
      { name: JuliaName, hex: getHexForColor(juliaKey), label: getColorLabel(juliaKey) },
      { name: MarukoName, hex: getHexForColor(marukoKey), label: getColorLabel(marukoKey) },
    ];
  }, [config.ownerNames, ownerColors]);

  const ownerHexMap = useMemo(
    () => ({
      Julia: getHexForColor((ownerColors?.Julia ?? DEFAULT_OWNER_COLORS.Julia) as ThemeColorKey),
      Maruko: getHexForColor((ownerColors?.Maruko ?? DEFAULT_OWNER_COLORS.Maruko) as ThemeColorKey),
    }),
    [ownerColors]
  );

  const [weekStart] = useMemo(() => getThisWeekRange(weekAnchor), [weekAnchor]);
  const weekYear = useMemo(() => parseDateString(weekStart).getFullYear(), [weekStart]);
  const weekNum = useMemo(() => getWeekNumberInYear(weekStart), [weekStart]);

  const weekDays = useMemo(() => {
    const days: { dateStr: string; day: number; abbr: string; isWeekend: boolean }[] = [];
    const d = parseDateString(weekStart);
    for (let i = 0; i < 7; i++) {
      const current = new Date(d);
      current.setDate(d.getDate() + i);
      const dateStr = toDateString(current);
      const dow = current.getDay();
      days.push({
        dateStr,
        day: current.getDate(),
        abbr: DAY_ABBR[dow],
        isWeekend: dow === 0 || dow === 6,
      });
    }
    return days;
  }, [weekStart]);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, CheckInRecord[]>();
    for (const r of checkInRecords) {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date)!.push(r);
    }
    return map;
  }, [checkInRecords]);

  const handlePrevWeek = () => {
    const d = parseDateString(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekAnchor(toDateString(d));
  };

  const handleNextWeek = () => {
    const d = parseDateString(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekAnchor(toDateString(d));
  };

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="weekly-view-root min-h-screen bg-ecru flex flex-col">
      <style>{`
        .weekly-view-root {
          font-family: "PingFang SC", -apple-system, sans-serif;
        }
        .weekly-view-root h1, .weekly-view-root .font-display {
          font-family: SimSun;
        }
        @media screen {
          .weekly-view-root .weekly-container {
            width: 148mm;
            max-width: 100%;
            margin: 0 auto;
            padding: 12px;
          }
        }
        @media print {
          .weekly-view-root {
            background: #fff;
          }
          .weekly-view-root .weekly-container {
            width: 148mm !important;
            margin: 0 auto;
            padding: 8px;
          }
          .weekly-view-root .no-print,
          .weekly-view-root button { display: none !important; }
          .weekly-view-root .date-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .weekly-view-root .weekly-body { font-size: 11px; }
          .weekly-view-root .weekly-date-title { font-size: 12px; }
          .weekly-view-root .free-writing-area {
            min-height: 180px;
          }
        }
      `}</style>

      <div className="weekly-container flex flex-col gap-3">
        {/* 顶栏：标题 | 周导航 | 导出 / 关闭 */}
        <header className="flex-shrink-0 flex items-center justify-between gap-2 no-print">
          <h1 className="text-ink text-base font-semibold font-pingfang tracking-wide">
            {config.title ?? '周记'}
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg border border-ring-bg bg-white text-ink hover:bg-ecru"
              aria-label="上一周"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-ink text-xs font-medium tabular-nums min-w-[4.5rem] text-center">
              {weekYear} W{weekNum}
            </span>
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg border border-ring-bg bg-white text-ink hover:bg-ecru"
              aria-label="下一周"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-ink text-white text-xs font-medium"
            >
              <Download size={14} />
              导出
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg border border-ring-bg bg-white text-ink hover:bg-ecru"
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* 索引条：INDEX | 年 | 1-12 月 | WEEK N */}
        <div className="flex-shrink-0 flex items-center gap-2 py-1.5 px-2 bg-[#f5f4f2] rounded-lg weekly-body no-print">
          <span className="text-stone-500 text-[10px] font-medium">INDEX</span>
          <span className="text-stone-400">|</span>
          <span className="text-ink text-[10px] font-medium tabular-nums">{weekYear}</span>
          <span className="text-stone-400">|</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <span key={m} className="text-stone-500 text-[10px] w-4 text-center tabular-nums">
                {m}
              </span>
            ))}
          </div>
          <span className="text-stone-400">|</span>
          <span className="text-ink text-[10px] font-semibold bg-user-mom/15 text-user-mom px-2 py-0.5 rounded">
            WEEK {weekNum}
          </span>
        </div>

        {/* Legend：用户1、用户2 名称与颜色圆点 */}
        <div className="flex-shrink-0 flex items-center gap-4 py-2 px-2 weekly-body text-[11px] no-print">
          <span className="text-stone-500 text-[10px] font-medium">Legend</span>
          {legendItems.map((item) => (
            <span key={item.name} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.hex }}
                aria-hidden
              />
              <span className="text-ink font-body">
                {item.name} <span className="text-stone-wash">({item.label})</span>
              </span>
            </span>
          ))}
        </div>

        {/* 日期块：每天一块，避免分页切断；周四后分页，周日下岁月留白 */}
        <div className="flex-1 flex flex-col gap-4 weekly-body">
          {weekDays.map(({ dateStr, day, abbr, isWeekend }, index) => {
            const records = recordsByDate.get(dateStr) ?? [];
            const journal = journalEntries[dateStr] ?? '';

            return (
              <div key={dateStr} className="flex flex-col gap-2">
                {index === 4 && (
                  <div className="print:break-after-page" aria-hidden />
                )}
                <div
                  className="date-block rounded-xl border border-ring-bg bg-white p-3 flex flex-col gap-2"
                >
                  <div className="flex gap-4 min-h-0">
                    {/* 左：日期 + 星期（工作日 action-primary，周末 茜色 #8C2727） */}
                    <div className="flex-shrink-0 flex flex-col items-start gap-0.5 w-14">
                      <span
                        className={`text-3xl font-semibold tabular-nums leading-none font-display ${
                          isWeekend ? 'text-[#8C2727]' : 'text-action-primary'
                        }`}
                      >
                        {day}
                      </span>
                      <span
                        className={`text-[10px] font-medium ${isWeekend ? 'text-[#8C2727]' : 'text-stone-500'}`}
                      >
                        {abbr}
                      </span>
                    </div>

                    {/* 中：活动列表（按 owner 显示颜色圆点） */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <ul className="flex flex-col gap-0.5 list-none pl-0">
                        {records.map((r) => {
                          const tag = tagSettingsMap[r.tagId];
                          const owner = (tag?.owner ?? 'Julia') as OwnerKey;
                          const dotHex = ownerHexMap[owner];
                          const name = tag?.name ?? '未命名';
                          return (
                            <li
                              key={r.id}
                              className="flex items-center gap-1.5 text-ink text-[11px]"
                            >
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: dotHex }}
                                aria-hidden
                              />
                              {name}
                            </li>
                          );
                        })}
                        {records.length === 0 && (
                          <li className="text-stone-400 text-[10px]">暂无打卡</li>
                        )}
                      </ul>
                    </div>

                    {/* 右：日记区（150px 约 300 字，米白/影纳户浅调，空时保留背景边框） */}
                    <div
                      className="flex-shrink-0 w-[42%] min-w-[100px] rounded-lg border border-[#7A7A7A]/15 p-2 min-h-[150px]"
                      style={{ backgroundColor: '#F7F6F2' }}
                    >
                      <p className="text-stone-600 text-[11px] leading-relaxed whitespace-pre-wrap break-words min-h-[140px]">
                        {journal || '当日记录...'}
                      </p>
                    </div>
                  </div>
                </div>
                {index === 6 && (
                  <div
                    className="free-writing-area mt-4 flex flex-col gap-2 p-4 min-h-[180px] rounded-xl border border-dashed border-[#7A7A7A]/30"
                    style={{
                      backgroundImage: 'radial-gradient(#7A7A7A 1px, transparent 1px)',
                      backgroundSize: '8px 8px',
                      backgroundColor: 'rgba(74, 93, 102, 0.03)',
                    }}
                  >
                    <span className="text-stone-500 text-xs font-display tracking-wide" style={{ fontFamily: 'SimSun' }}>
                      Weekly Reflection 
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


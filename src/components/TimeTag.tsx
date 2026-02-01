import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getTagColorByName } from '@/utils/tagUtils';

export interface TimeTagItem {
  id: string;
  name: string;
  timeRange?: string;
  owner: string;
  /** 归属主题色，用于弹窗滑块与按钮等，Julia=user-mom Maruko=user-kid */
  userColor: string;
  badge?: string;
  checked?: boolean;
  /** 当日该标签打卡次数 */
  todayCount?: number;
  /** 最后一次打卡的评价摘要（限 15 字） */
  lastNoteSummary?: string;
  /** 备忘录（编辑标签时填写，首页卡片显示 📌 点击/长按可看） */
  memo?: string;
}

interface TimeTagProps {
  item: TimeTagItem;
  onClick?: (item: TimeTagItem) => void;
  /** 点击“查看全部”数字按钮时打开该标签今日记录列表 */
  onOpenRecordsList?: () => void;
}

export function TimeTag({ item, onClick, onOpenRecordsList }: TimeTagProps) {
  const { name, timeRange, owner, badge, checked, todayCount = 0, lastNoteSummary, memo } = item;
  const [showMemoBubble, setShowMemoBubble] = useState(false);
  const [bubblePosition, setBubblePosition] = useState<{ top: number; left: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!showMemoBubble || !pinButtonRef.current) return;
    const rect = pinButtonRef.current.getBoundingClientRect();
    setBubblePosition({ top: rect.bottom + 4, left: rect.left });
  }, [showMemoBubble]);
  const showBadge = badge;
  const tagColor = getTagColorByName(name);
  const outlineClass = tagColor === 'tag-life' ? 'ring-1 ring-tag-life' : tagColor === 'tag-light' ? 'ring-1 ring-tag-light' : owner === 'Maruko' ? 'ring-1 ring-user-kid' : 'ring-1 ring-user-mom';
  const textClass = tagColor === 'tag-life' ? 'text-tag-life' : tagColor === 'tag-light' ? 'text-tag-light' : owner === 'Maruko' ? 'text-user-kid' : 'text-user-mom';

  const handleClick = () => {
    if (showMemoBubble) {
      closeMemoBubble();
      return;
    }
    onClick?.(item);
  };

  const handleOpenList = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenRecordsList?.();
  };

  const handleMemoPinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMemoBubble((v) => !v);
  };

  const closeMemoBubble = () => setShowMemoBubble(false);

  const startLongPress = () => {
    if (!memo) return;
    longPressTimerRef.current = window.setTimeout(() => setShowMemoBubble(true), 500);
  };
  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div
      className="flex items-start gap-2 w-full cursor-pointer relative"
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      onMouseDown={startLongPress}
      onMouseLeave={cancelLongPress}
      onMouseUp={cancelLongPress}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      role="button"
      tabIndex={0}
    >
      <span
        className={`w-4 h-4 rounded-full bg-ecru flex items-center justify-center text-[7px] font-medium flex-shrink-0 border pointer-events-none ${outlineClass} ${textClass}`}
      >
        {owner}
      </span>
      <div className="flex-1 min-w-0 relative">
        {/* 备忘录图标：卡片右上角，可点击/长按显示气泡 */}
        {memo && (
          <button
            ref={pinButtonRef}
            type="button"
            onClick={handleMemoPinClick}
            className={`absolute right-2 top-2 z-[2] p-0.5 rounded hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-user-mom/30 border-0.5 border-transparent ${checked || todayCount > 0 ? 'opacity-50 grayscale' : ''}`}
            aria-label={checked || todayCount > 0 ? '备忘录（已处理）' : '查看备忘录'}
            title={memo}
          >
            <span className="text-[10px] font-body text-stone-wash" aria-hidden>备忘</span>
          </button>
        )}
        {showMemoBubble && memo && typeof document !== 'undefined' && bubblePosition && createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              aria-hidden
              onClick={closeMemoBubble}
            />
            <div
              className="fixed z-[9999] py-2 px-3 rounded-xl bg-user-mom text-white text-xs border border-user-mom max-w-[min(280px,calc(100vw-24px))] border-0.5"
              style={{ top: bubblePosition.top, left: bubblePosition.left }}
              role="tooltip"
              onClick={(e) => e.stopPropagation()}
            >
              {memo}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); closeMemoBubble(); }}
                className="absolute right-1 top-1 w-4 h-4 rounded flex items-center justify-center text-white/80 hover:text-white text-[10px]"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
          </>,
          document.body
        )}
        <div
          className={
            checked
              ? `flex flex-col justify-center gap-0.5 py-2 px-2.5 rounded-xl text-left pointer-events-none hover:opacity-95 border ${
                  tagColor === 'tag-life' ? 'bg-tag-life border-tag-life' : tagColor === 'tag-light' ? 'bg-tag-light border-tag-light' : owner === 'Maruko' ? 'bg-user-kid border-user-kid' : 'bg-user-mom border-user-mom'
                }`
              : `flex flex-col justify-center gap-0.5 py-2 px-2.5 rounded-xl text-left pointer-events-none hover:opacity-95 bg-white border ${
                  tagColor === 'tag-life' ? 'border-tag-life' : tagColor === 'tag-light' ? 'border-tag-light' : 'border-user-mom'
                }`
          }
          style={checked ? undefined : undefined}
        >
          {showBadge && (
            <span className={`text-[7px] leading-tight px-1.5 py-0.5 rounded border w-fit mb-0.5 border-0.5 ${tagColor === 'tag-life' ? 'bg-tag-life border-tag-life text-ink' : tagColor === 'tag-light' ? 'bg-tag-light border-tag-light text-white' : 'bg-user-mom border-user-mom text-white'}`}>
              {badge}
            </span>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={
                checked
                  ? `text-xs font-medium tracking-tight truncate font-body ${tagColor === 'tag-life' ? 'text-ink' : 'text-white'}`
                  : `text-xs font-medium tracking-tight truncate font-body ${tagColor === 'tag-light' ? 'text-tag-light' : 'text-user-mom'}`
              }
            >
              {name}
            </span>
            {todayCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-madder/10 text-madder text-[9px] font-medium flex-shrink-0 font-body">
                完成 {todayCount} 次
              </span>
            )}
            {todayCount > 0 && onOpenRecordsList && (
              <button
                type="button"
                onClick={handleOpenList}
                className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0"
                aria-label={`查看今日 ${todayCount} 条记录`}
              >
                {todayCount}
              </button>
            )}
          </div>
          {timeRange && (
            <span className={`text-[9px] font-body ${checked ? (tagColor === 'tag-life' ? 'text-ink/80' : 'text-white/80') : tagColor === 'tag-light' ? 'text-tag-light/70' : 'text-user-mom/70'}`}>
              {timeRange}
            </span>
          )}
          {lastNoteSummary && (
            <span className={`text-[9px] font-light font-body ${checked ? (tagColor === 'tag-life' ? 'text-ink/90' : 'text-white/90') : 'text-stone-wash'}`}>
              {lastNoteSummary}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

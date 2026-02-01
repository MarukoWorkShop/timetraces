import { useRef, useCallback } from 'react';
import { JournalContent, A6_CARD_WIDTH, A6_CARD_MIN_HEIGHT } from './JournalContent';
import type { JournalContentData } from './JournalContent';

export interface JournalExportOverlayProps {
  date: string;
  data: JournalContentData;
  onClose: () => void;
}

/** 动态注入 @page 样式：A6Per 95×170mm / A5 148×210mm，单页左/双页右 11mm 装订留白 */
function applyPrintSize(size: 'a6per' | 'a5') {
  let el = document.getElementById('journal-print-size-style');
  if (!el) {
    el = document.createElement('style');
    el.id = 'journal-print-size-style';
    document.head.appendChild(el);
  }
  /* 手账装订：单页(右)左留白11mm，双页(左)右留白11mm */
  const bindingMargin = '@page :right { margin-left: 11mm; } @page :left { margin-right: 11mm; }';
  if (size === 'a6per') {
    el.textContent = `@media print { @page { size: 95mm 170mm; margin: 0; } ${bindingMargin} }`;
  } else {
    el.textContent = `@media print { @page { size: 148mm 210mm; margin: 0; } ${bindingMargin} }`;
  }
}

function removePrintSizeStyle() {
  document.getElementById('journal-print-size-style')?.remove();
}

/** A6Per/A5 页面内容区高度（mm），留边距 */
const PRINT_PAGE_HEIGHT_MM = { a6per: 155, a5: 190 };

export function JournalExportOverlay({ date, data, onClose }: JournalExportOverlayProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback((size: 'a6per' | 'a5') => {
    applyPrintSize(size);
    const beforePrint = () => {
      document.body.classList.add('journal-print-mode', 'journal-print-fit');
      /* 尺寸适配：若卡片高于页面，按比例缩放以完整展示 */
      requestAnimationFrame(() => {
        const card = cardRef.current;
        const wrapper = wrapperRef.current;
        if (card && wrapper) {
          const mmPerPx = 25.4 / 96;
          const maxH = PRINT_PAGE_HEIGHT_MM[size] / mmPerPx;
          const cardH = card.scrollHeight;
          if (cardH > maxH) {
            const scale = maxH / cardH;
            wrapper.style.transform = `scale(${scale})`;
            wrapper.style.transformOrigin = 'top center';
          } else {
            wrapper.style.transform = '';
          }
        }
      });
    };
    const afterPrint = () => {
      document.body.classList.remove('journal-print-mode', 'journal-print-fit');
      if (wrapperRef.current) wrapperRef.current.style.transform = '';
      removePrintSizeStyle();
      window.removeEventListener('afterprint', afterPrint);
    };
    window.addEventListener('afterprint', afterPrint);
    beforePrint();
    requestAnimationFrame(() => {
      setTimeout(() => window.print(), 50);
    });
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center gap-4 p-4 journal-export-root"
      role="dialog"
      aria-modal="true"
      aria-label="导出 PDF"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex flex-wrap justify-center gap-2 w-full max-w-[360px] journal-export-overlay-buttons">
        <button
          type="button"
          onClick={() => handlePrint('a6per')}
          className="h-9 px-6 bg-white rounded-[10px] text-ink text-xs font-medium font-body border border-ring-bg hover:bg-ecru"
        >
          A6Per
        </button>
        <button
          type="button"
          onClick={() => handlePrint('a5')}
          className="h-9 px-6 bg-white rounded-[10px] text-ink text-xs font-medium font-body border border-ring-bg hover:bg-ecru"
        >
          A5
        </button>
      </div>

      {/* JournalContent：打印时隐藏按钮，仅展示内容 */}
      <div
        className="journal-print-area flex justify-center overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={wrapperRef}
          className="relative rounded-md border border-ring-bg overflow-visible"
          style={{ width: A6_CARD_WIDTH, minHeight: A6_CARD_MIN_HEIGHT }}
        >
          <JournalContent ref={cardRef} date={date} data={data} />
        </div>
      </div>
    </div>
  );
}

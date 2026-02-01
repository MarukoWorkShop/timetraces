import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEY_RECORDS, STORAGE_KEY_TAG_SETTINGS } from '@/constants/storage';
import type { CheckInRecord, TagSettings } from '@/types';
import { formatMonthDay } from '@/utils/dateUtils';

type TagSettingsMap = Record<string, TagSettings>;

/** 动态注入 @page 样式 */
function applyPrintSize(size: 'a6' | 'a5') {
  let el = document.getElementById('attendance-print-size-style');
  if (!el) {
    el = document.createElement('style');
    el.id = 'attendance-print-size-style';
    document.head.appendChild(el);
  }
  el.textContent =
    size === 'a6'
      ? '@media print { @page { size: 95mm 171mm; margin: 0; } }'
      : '@media print { @page { size: 148mm 210mm; margin: 0; } }';
}

function removePrintSizeStyle() {
  document.getElementById('attendance-print-size-style')?.remove();
}

/** A6 活页留白：左侧 15mm 打孔位 */
const BINDING_MARGIN_MM = 15;

export function AttendancePrintPage() {
  const navigate = useNavigate();
  const { tagId } = useParams<{ tagId: string }>();
  const printAreaRef = useRef<HTMLDivElement>(null);

  const [checkInRecords] = useLocalStorage<CheckInRecord[]>(STORAGE_KEY_RECORDS, []);
  const [tagSettingsMap] = useLocalStorage<TagSettingsMap>(STORAGE_KEY_TAG_SETTINGS, {});

  const { records, tagName, tag } = useMemo(() => {
    if (!tagId) return { records: [] as CheckInRecord[], tagName: '', tag: undefined as TagSettings | undefined };
    const t = tagSettingsMap[tagId];
    if (!t) {
      return { records: [] as CheckInRecord[], tagName: '', tag: undefined };
    }
    const filtered = checkInRecords
      .filter((r) => r.tagId === tagId)
      .sort((a, b) => (b.date > a.date ? 1 : -1));
    return { records: filtered, tagName: t.name || '未命名', tag: t };
  }, [checkInRecords, tagSettingsMap, tagId]);

  const trackingOptions = tag?.trackingOptions ?? {};
  const showCourseTopic = trackingOptions.courseTopic === true;
  const showKm = trackingOptions.km === true;
  const showCalories = trackingOptions.calories === true;
  const showOneSentenceNote = trackingOptions.oneSentenceNote !== false;
  const showDailyPhoto = trackingOptions.dailyPhoto === true;

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const handleBack = () => navigate(-1);

  const handleDownload = useCallback(() => {
    const el = printAreaRef.current;
    if (!el) return;
    const { scrollWidth, scrollHeight } = el;
    html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#F7F6F2',
      logging: false,
      width: scrollWidth,
      height: scrollHeight,
    })
      .then((canvas) => {
        const dataUrl = canvas.toDataURL('image/png');
        setImagePreviewUrl(dataUrl);
      })
      .catch(() => {});
  }, []);

  const handleDownloadFromPreview = useCallback(() => {
    if (!imagePreviewUrl) return;
    const a = document.createElement('a');
    a.href = imagePreviewUrl;
    a.download = `${tagName || '打卡'}出勤统计-${records.length}次.png`;
    a.click();
  }, [imagePreviewUrl, records.length, tagName]);

  const closeImagePreview = () => setImagePreviewUrl(null);

  const handlePrint = useCallback((size: 'a6' | 'a5') => {
    applyPrintSize(size);
    document.body.classList.add('attendance-print-mode');
    const afterPrint = () => {
      document.body.classList.remove('attendance-print-mode');
      removePrintSizeStyle();
      window.removeEventListener('afterprint', afterPrint);
    };
    window.addEventListener('afterprint', afterPrint);
    setTimeout(() => window.print(), 50);
  }, []);

  return (
    <div
      className="min-h-screen max-w-[430px] mx-auto attendance-print-page"
      style={{ backgroundColor: '#F7F6F2' }}
    >
      {/* 顶部导航：no-print 打印时隐藏 */}
      <header className="no-print flex-shrink-0 h-14 px-4 flex items-center justify-between border-b border-ring-bg">
          <button
            type="button"
            onClick={handleBack}
            className="text-ink text-xs font-medium"
          aria-label="返回"
        >
          » » 返回
        </button>
        <h1 className="text-num-primary text-sm font-medium font-display tracking-widest">{tagName}出勤统计</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 text-ink text-xs font-medium"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
            >
              <path
                d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.3594 2.39052 13.6095C2.14048 13.8595 2 13.0203 2 12.6667V10"
                stroke="#333333"
                strokeWidth="1.33333"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4.66675 6.66667L8.00008 10L11.3334 6.66667"
                stroke="#333333"
                strokeWidth="1.33333"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 10V2"
                stroke="#333333"
                strokeWidth="1.33333"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            下载
          </button>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => handlePrint('a6')}
              className="px-2 py-1 text-[10px] rounded bg-[#EDEBE7] text-ink hover:bg-[#E8E6E1]"
            >
              A6
            </button>
            <button
              type="button"
              onClick={() => handlePrint('a5')}
              className="px-2 py-1 text-[10px] rounded bg-[#EDEBE7] text-ink hover:bg-[#E8E6E1]"
            >
              A5
            </button>
          </div>
        </div>
      </header>

      {/* 打印区域：活页留白 15mm 左侧 + 内容区 */}
      <main
        ref={printAreaRef}
        className="attendance-print-area flex flex-col py-4 px-4"
        style={{
          marginLeft: `${BINDING_MARGIN_MM}mm`,
          minHeight: 'calc(171mm - 32px)',
        }}
      >
        {/* 手帐内页列表：极细虚线分隔 */}
        <div className="flex-1 flex flex-col">
          {records.length === 0 ? (
            <div className="py-12 text-center text-[#7A7A7A] text-xs">
              暂无「{tagName || '该标签'}」打卡记录
            </div>
          ) : (
            records.map((r, idx) => (
              <div
                key={r.id}
                className="py-3 last:border-b-0 border-b border-ring-bg border-dashed"
              >
                {/* 首行：序号 | 日期 | 标签名称 */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-num-primary text-base font-bold font-display w-6 flex-shrink-0">
                    {records.length - idx}
                  </span>
                  <span className="text-num-primary text-xs font-bold font-display">
                    {formatMonthDay(r.date)}
                  </span>
                  <span className="text-ink text-xs font-medium font-body">{tagName}</span>
                </div>
                {/* 追踪选项：按勾选展示用户填写内容 */}
                <div className="mt-1.5 pl-0 flex flex-col gap-0.5">
                  {showCourseTopic && r.courseTopic && (
                    <div className="text-ink text-[10px]">
                      <span className="text-[#7A7A7A] mr-1">课程主题</span>
                      {r.courseTopic}
                    </div>
                  )}
                  {(showKm || showCalories) && (
                    <div className="flex gap-3 text-ink text-[10px]">
                      {showKm && r.km && (
                        <span><span className="text-[#7A7A7A] mr-1">公里数</span>{r.km}</span>
                      )}
                      {showCalories && r.calories && (
                        <span><span className="text-[#7A7A7A] mr-1">卡路里</span>{r.calories}</span>
                      )}
                    </div>
                  )}
                  {showOneSentenceNote && r.notes && (
                    <div className="text-ink text-[10px]">
                      <span className="text-[#7A7A7A] mr-1">一句话评价</span>
                      「{r.notes}」
                    </div>
                  )}
                  {showDailyPhoto && r.photoBase64 && (
                    <div className="text-ink text-[10px]">
                      <span className="text-[#7A7A7A] mr-1">当日照片</span>有
                    </div>
                  )}
                  {(r.startTime || r.endTime) && (
                    <div className="text-ink text-[10px]">
                      <span className="text-[#7A7A7A] mr-1">打卡时间段</span>
                      {[r.startTime, r.endTime].filter(Boolean).join('－')}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部：累计印章 - 右下角圆形 */}
        {records.length > 0 && (
          <div className="mt-auto pt-6 flex justify-end">
            <div
              className="relative flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-num-primary"
              aria-label={`出勤 ${records.length} 次`}
            >
              <span className="text-num-primary text-2xl font-bold font-display leading-none">
                {records.length}
              </span>
              <span className="text-stone-wash text-[8px] font-display mt-0.5">出勤次数</span>
            </div>
          </div>
        )}
      </main>

      {/* 半透明全屏层：展示生成的图片，支持长按保存 */}
      {imagePreviewUrl && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-black/60 attendance-image-preview"
          role="dialog"
          aria-modal="true"
          aria-label="打卡卡片预览"
        >
          <div className="flex flex-col items-center gap-4 w-full max-w-[min(100%,400px)]">
            <img
              src={imagePreviewUrl}
              alt={`${tagName || '打卡'}出勤统计`}
              className="max-w-full max-h-[75vh] w-auto h-auto object-contain rounded-lg border border-ring-bg"
              style={{ backgroundColor: '#F7F6F2', touchAction: 'none' }}
            />
            <p className="text-white/95 text-sm text-center px-4">
              已生成打卡卡片，请长按保存到相册
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDownloadFromPreview}
                className="h-10 px-5 bg-white rounded-xl text-ink text-sm font-medium"
              >
                下载
              </button>
              <button
                type="button"
                onClick={closeImagePreview}
                className="h-10 px-5 bg-white/20 rounded-xl text-white text-sm font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

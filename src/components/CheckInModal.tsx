import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { TimeTagItem } from './TimeTag';
import type { CheckInRecord } from '../types';
import { toDateString } from '../utils/dateUtils';

interface CheckInModalProps {
  open: boolean;
  item: TimeTagItem | null;
  onClose: () => void;
  onSave: (record: CheckInRecord) => void;
}

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `checkin-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const RING_SIZE = 60;
const RING_STROKE = 5;
const R = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function CheckInModal({ open, item, onClose, onSave }: CheckInModalProps) {
  const [score, setScore] = useState(50);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && item) {
      setScore(50);
      setNotes('');
      setSubmitting(false);
    }
  }, [open, item]);

  if (!open || !item) return null;

  const userColor = item.userColor || '#525252';
  const dashOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  const handleSubmit = () => {
    setSubmitting(true);
    const record: CheckInRecord = {
      id: generateId(),
      tagId: item.id,
      date: toDateString(new Date()),
      score,
      notes: notes.trim() || undefined,
    };
    setTimeout(() => {
      onSave(record);
      onClose();
    }, 300);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-modal-title"
    >
      <div
        className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-ecru border border-ring-bg flex flex-col gap-4 p-5 animate-slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-full bg-ecru flex items-center justify-center text-[10px] font-medium border-2 flex-shrink-0 font-body"
            style={{ borderColor: userColor, color: userColor }}
          >
            {item.owner}
          </span>
          <h2 id="checkin-modal-title" className="text-ink text-lg font-medium font-display">
            {item.name}
          </h2>
        </div>

        {/* 能量打分：圆环进度 + 滑块 */}
        <div className="flex flex-col items-center gap-3">
          <label className="text-sm text-ink self-start font-body">
            能量感受 <span className="text-stone-wash font-normal">0–100</span>
          </label>
          <div className="relative flex items-center justify-center w-[60px] h-[60px] flex-shrink-0">
            <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90" aria-hidden>
              <defs>
                <linearGradient id={`ring-gradient-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={userColor} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={userColor} stopOpacity="1" />
                </linearGradient>
              </defs>
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={R}
                fill="none"
                strokeWidth={RING_STROKE}
                stroke="currentColor"
                className="text-ring-bg"
              />
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={R}
                fill="none"
                strokeWidth={RING_STROKE}
                stroke={`url(#ring-gradient-${item.id})`}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-[stroke-dashoffset] duration-150"
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums font-display"
              style={{ color: userColor }}
            >
              {score}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-ring-bg"
            style={{ accentColor: userColor }}
          />
        </div>

        {/* 备注：信纸感无边框，仅底横线 */}
        <div className="flex flex-col gap-1">
          <label htmlFor="checkin-notes" className="text-sm text-ink font-body">
            备注
          </label>
          <textarea
            id="checkin-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="简短记录一下..."
            rows={3}
            className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-ring-bg rounded-none resize-none focus:outline-none focus:ring-0 focus:border-user-mom font-body text-ink placeholder:text-stone-wash transition-colors"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-[10px] border border-user-mom text-user-mom text-sm font-medium hover:bg-user-mom/10 font-body disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-[10px] text-white text-sm font-medium disabled:opacity-80 transition-opacity"
            style={{ backgroundColor: userColor }}
          >
            {submitting ? '入墨中...' : '完成打卡'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

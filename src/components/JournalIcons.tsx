/** Daily Journal 与 A6 手账卡片用图标，组件化以保证导出时像素清晰 */

export function IconClose({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M18 6L6 18" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 6L18 18" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconShare({ className, size = 14 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} aria-hidden>
      <path d="M10.5 4.66666C11.4665 4.66666 12.25 3.88316 12.25 2.91666C12.25 1.95017 11.4665 1.16666 10.5 1.16666C9.5335 1.16666 8.75 1.95017 8.75 2.91666C8.75 3.88316 9.5335 4.66666 10.5 4.66666Z" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 8.75C4.4665 8.75 5.25 7.9665 5.25 7C5.25 6.0335 4.4665 5.25 3.5 5.25C2.5335 5.25 1.75 6.0335 1.75 7C1.75 7.9665 2.5335 8.75 3.5 8.75Z" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 12.8333C11.4665 12.8333 12.25 12.0498 12.25 11.0833C12.25 10.1168 11.4665 9.33334 10.5 9.33334C9.5335 9.33334 8.75 10.1168 8.75 11.0833C8.75 12.0498 9.5335 12.8333 10.5 12.8333Z" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.01074 7.88084L8.99491 10.2025" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.98908 3.7975L5.01074 6.11917" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDownload({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.6665 6.66667L7.99984 10L11.3332 6.66667" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 10V2" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMic({ className, size = 14 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} aria-hidden>
      <path d="M7 1.16669C6.53587 1.16669 6.09075 1.35106 5.76256 1.67925C5.43437 2.00744 5.25 2.45256 5.25 2.91669V7.00002C5.25 7.46415 5.43437 7.90927 5.76256 8.23746C6.09075 8.56565 6.53587 8.75002 7 8.75002C7.46413 8.75002 7.90925 8.56565 8.23744 8.23746C8.56563 7.90927 8.75 7.46415 8.75 7.00002V2.91669C8.75 2.45256 8.56563 2.00744 8.23744 1.67925C7.90925 1.35106 7.46413 1.16669 7 1.16669Z" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.0832 5.83331V6.99998C11.0832 8.08295 10.653 9.12156 9.88719 9.88733C9.12142 10.6531 8.0828 11.0833 6.99984 11.0833C5.91687 11.0833 4.87826 10.6531 4.11248 9.88733C3.34671 9.12156 2.9165 8.08295 2.9165 6.99998V5.83331" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 11.0833V12.8333" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 评分圆环：灰色底 + 按 score 0–100 的虚线弧 */
export function IconScoreRing({ score, size = 28, className }: { score: number; size?: number; className?: string }) {
  const r = (size - 2.5) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - (score ?? 0) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`origin-center -rotate-90 ${className}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#E0E0E0" strokeWidth="2.5" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#4A4A4A"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
}

export function IconDot({ className, size = 2 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 2 2" fill="none" className={className} aria-hidden>
      <circle cx="1" cy="1" r="1" fill="#CCCCCC" />
    </svg>
  );
}

export function IconDividerDot({ className, size = 4 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 4 4" fill="none" className={className} aria-hidden>
      <circle cx="2" cy="2" r="2" fill="#CCCCCC" />
    </svg>
  );
}

export function IconPlus({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M8.00016 3.33331V12.6667M3.3335 7.99997H12.6669" stroke="#DDDDDD" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconSparkle({ className, size = 12 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} aria-hidden>
      <path d="M4.96871 7.75C4.92408 7.57697 4.83388 7.41905 4.70752 7.29269C4.58116 7.16633 4.42325 7.07614 4.25021 7.0315L1.18271 6.2405C1.13038 6.22565 1.08432 6.19413 1.05152 6.15072C1.01872 6.10732 1.00098 6.0544 1.00098 6C1.00098 5.9456 1.01872 5.89268 1.05152 5.84928C1.08432 5.80588 1.13038 5.77436 1.18271 5.7595L4.25021 4.968C4.42319 4.92341 4.58106 4.83329 4.70742 4.70702C4.83377 4.58075 4.924 4.42295 4.96871 4.25L5.75971 1.1825C5.77442 1.12996 5.80591 1.08367 5.84937 1.0507C5.89284 1.01773 5.9459 0.999878 6.00046 0.999878C6.05502 0.999878 6.10809 1.01773 6.15155 1.0507C6.19502 1.08367 6.22651 1.12996 6.24121 1.1825L7.03171 4.25C7.07635 4.42304 7.16654 4.58095 7.29291 4.70731C7.41927 4.83367 7.57718 4.92386 7.75021 4.9685L10.8177 5.759C10.8705 5.77355 10.917 5.80501 10.9501 5.84854C10.9833 5.89207 11.0012 5.94528 11.0012 6C11.0012 6.05472 10.9833 6.10793 10.9501 6.15146C10.917 6.195 10.8705 6.22645 10.8177 6.241L7.75021 7.0315C7.57718 7.07614 7.41927 7.16633 7.29291 7.29269C7.16654 7.41905 7.07635 7.57697 7.03171 7.75L6.24071 10.8175C6.22601 10.87 6.19452 10.9163 6.15105 10.9493C6.10759 10.9823 6.05452 11.0001 5.99996 11.0001C5.9454 11.0001 5.89234 10.9823 5.84887 10.9493C5.80541 10.9163 5.77392 10.87 5.75921 10.8175L4.96871 7.75Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

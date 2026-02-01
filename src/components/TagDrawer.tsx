import { X, Pencil } from 'lucide-react';
import type { TagSettings } from '@/types';
import type { OwnerKey } from '@/constants/themeColors';

export interface TagDrawerProps {
  owner: OwnerKey;
  ownerName: string;
  tags: TagSettings[];
  onClose: () => void;
  onCheckIn: (tagId: string) => void;
  onEditTag: (tagId: string) => void;
}

/** 底部抽屉：展示某用户下所有标签，归档的用 opacity-40 grayscale */
export function TagDrawer({
  ownerName,
  tags,
  onClose,
  onCheckIn,
  onEditTag,
}: TagDrawerProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed left-0 right-0 bottom-0 z-[91] max-h-[75vh] rounded-t-2xl bg-ecru border border-ring-bg border-b-0 flex flex-col animate-slide-in-from-bottom"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tag-drawer-title"
      >
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-ring-bg">
          <h2 id="tag-drawer-title" className="text-num-primary text-base font-medium font-display tracking-widest">
            {ownerName} · 全部标签
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="size-9 flex items-center justify-center rounded-lg text-ink hover:bg-[#EDEBE7]"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 max-w-[430px] mx-auto w-full">
          {tags.length === 0 ? (
            <p className="text-stone-wash text-sm py-4 text-center font-body">暂无标签</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tags.map((s) => {
                const isArchived = !!s.archived;
                const inactiveClass = isArchived ? 'opacity-40 grayscale' : '';
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => !isArchived && onCheckIn(s.id)}
                      disabled={isArchived}
                      className={`w-full text-left rounded-2xl border border-ring-bg py-3 px-3 flex items-center justify-between gap-2 border-0.5 transition-opacity ${inactiveClass} ${
                        isArchived ? 'bg-status-pending/50 text-status-done cursor-not-allowed' : 'bg-ecru/80 text-ink hover:bg-ecru'
                      }`}
                    >
                      <span className="text-sm font-medium truncate font-body">{s.name || '未命名'}</span>
                      {!isArchived && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTag(s.id);
                          }}
                          className="p-1 rounded hover:bg-black/10 flex-shrink-0 text-stone-wash hover:text-ink"
                          aria-label="编辑"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

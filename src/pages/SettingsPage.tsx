import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';

import {
  STORAGE_KEY_OWNER_NAMES,
  STORAGE_KEY_OWNER_COLORS,
  STORAGE_KEY_RECORDS,
  STORAGE_KEY_TAG_SETTINGS,
  STORAGE_KEY_HOUSEWORK,
  STORAGE_KEY_JOURNAL,
  STORAGE_KEY_CONFIG,
} from '@/constants/storage';
import {
  THEME_COLOR_OPTIONS,
  DEFAULT_OWNER_COLORS,
  getHexForColor,
  getContrastTextColor,
  type ThemeColorKey,
  type OwnerKey,
} from '@/constants/themeColors';

export type OwnerNames = Record<OwnerKey, string>;

const DEFAULT_OWNER_NAMES: OwnerNames = { Julia: '用户1', Maruko: '用户2' };

/** 导出数据结构 */
interface ExportData {
  version: number;
  ownerNames: OwnerNames;
  ownerColors?: Record<string, string>;
  tagSettings: Record<string, unknown>;
  records: unknown[];
  housework: unknown[];
  journalEntries: Record<string, string>;
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M15.8332 17.5V15.8333C15.8332 14.9493 15.482 14.1014 14.8569 13.4763C14.2317 12.8512 13.3839 12.5 12.4998 12.5H7.49984C6.61578 12.5 5.76794 12.8512 5.14281 13.4763C4.51769 14.1014 4.1665 14.9493 4.1665 15.8333V17.5"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.99984 9.16667C11.8408 9.16667 13.3332 7.67428 13.3332 5.83333C13.3332 3.99238 11.8408 2.5 9.99984 2.5C8.15889 2.5 6.6665 3.99238 6.6665 5.83333C6.6665 7.67428 8.15889 9.16667 9.99984 9.16667Z"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M7.5 15L12.5 10L7.5 5"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M17.5 12.5V15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V12.5"
        stroke="white"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.8335 8.33334L10.0002 12.5L14.1668 8.33334"
        stroke="white"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 12.5V2.5"
        stroke="white"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M17.5 12.5V15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V12.5"
        stroke="white"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.1668 6.66667L10.0002 2.5L5.8335 6.66667"
        stroke="white"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 2.5V12.5"
        stroke="white"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M2.5 5H17.5"
        stroke="white"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.8332 5V16.6667C15.8332 17.5 14.9998 18.3333 14.1665 18.3333H5.83317C4.99984 18.3333 4.1665 17.5 4.1665 16.6667V5"
        stroke="white"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.6665 4.99999V3.33332C6.6665 2.49999 7.49984 1.66666 8.33317 1.66666H11.6665C12.4998 1.66666 13.3332 2.49999 13.3332 3.33332V4.99999"
        stroke="white"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.3335 9.16666V14.1667"
        stroke="white"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.6665 9.16666V14.1667"
        stroke="white"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M9.99984 18.3334C14.6022 18.3334 18.3332 14.6024 18.3332 10C18.3332 5.39765 14.6022 1.66669 9.99984 1.66669C5.39746 1.66669 1.6665 5.39765 1.6665 10C1.6665 14.6024 5.39746 18.3334 9.99984 18.3334Z"
        stroke="white"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 13.3333V10"
        stroke="white"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 6.66669H10.0083"
        stroke="white"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ownerNames, setOwnerNames] = useLocalStorage<OwnerNames>(
    STORAGE_KEY_OWNER_NAMES,
    DEFAULT_OWNER_NAMES
  );
  const [ownerColors, setOwnerColors] = useLocalStorage<Record<OwnerKey, ThemeColorKey>>(
    STORAGE_KEY_OWNER_COLORS,
    DEFAULT_OWNER_COLORS
  );
  const [editingOwner, setEditingOwner] = useState<OwnerKey | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<ThemeColorKey>('deep-blue');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleExport = () => {
    const tagSettings: Record<string, unknown> = {};
    const rawTag = window.localStorage.getItem(STORAGE_KEY_TAG_SETTINGS);
    if (rawTag) try { Object.assign(tagSettings, JSON.parse(rawTag)); } catch { /* ignore */ }

    const records: unknown[] = [];
    const rawRecords = window.localStorage.getItem(STORAGE_KEY_RECORDS);
    if (rawRecords) try { records.push(...(JSON.parse(rawRecords) as unknown[])); } catch { /* ignore */ }

    const housework: unknown[] = [];
    const rawHousework = window.localStorage.getItem(STORAGE_KEY_HOUSEWORK);
    if (rawHousework) try { housework.push(...(JSON.parse(rawHousework) as unknown[])); } catch { /* ignore */ }

    const journalEntries: Record<string, string> = {};
    const rawJournal = window.localStorage.getItem(STORAGE_KEY_JOURNAL);
    if (rawJournal) try { Object.assign(journalEntries, JSON.parse(rawJournal)); } catch { /* ignore */ }

    const ownerColors = window.localStorage.getItem(STORAGE_KEY_OWNER_COLORS);
    const ownerColorsData = ownerColors ? (JSON.parse(ownerColors) as Record<string, string>) : {};

    const data: ExportData = {
      version: 1,
      ownerNames: { ...ownerNames },
      ownerColors: ownerColorsData,
      tagSettings,
      records,
      housework,
      journalEntries,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-traces-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => {
      alert('读取文件失败，请重试');
    };
    reader.onload = () => {
      const raw = reader.result;
      if (typeof raw !== 'string') {
        alert('无效的备份文件');
        return;
      }
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        alert('JSON 格式无效，请确认文件内容是否正确');
        return;
      }
      if (data == null || typeof data !== 'object') {
        alert('无效的备份文件格式');
        return;
      }
      const obj = data as Record<string, unknown>;
      if (obj.version !== 1) {
        alert('不支持的备份版本，请使用当前版本导出的文件');
        return;
      }
      const ownerNamesRaw = obj.ownerNames;
      const ownerNames =
        ownerNamesRaw != null && typeof ownerNamesRaw === 'object' && !Array.isArray(ownerNamesRaw)
          ? { ...DEFAULT_OWNER_NAMES, ...ownerNamesRaw }
          : DEFAULT_OWNER_NAMES;

      const tagSettings = obj.tagSettings;
      const tagSettingsValid =
        tagSettings != null && typeof tagSettings === 'object' && !Array.isArray(tagSettings);

      const records = Array.isArray(obj.records) ? obj.records : [];

      const housework = Array.isArray(obj.housework) ? obj.housework : [];

      const journalRaw = obj.journalEntries;
      const journalEntries =
        journalRaw != null && typeof journalRaw === 'object' && !Array.isArray(journalRaw)
          ? journalRaw
          : {};

      if (!tagSettingsValid) {
        alert('无效的备份文件格式：缺少标签设置');
        return;
      }

      try {
        setOwnerNames(ownerNames as OwnerNames);
        const ownerColorsRaw = obj.ownerColors;
        if (ownerColorsRaw != null && typeof ownerColorsRaw === 'object' && !Array.isArray(ownerColorsRaw)) {
          window.localStorage.setItem(STORAGE_KEY_OWNER_COLORS, JSON.stringify(ownerColorsRaw));
        }
        window.localStorage.setItem(STORAGE_KEY_TAG_SETTINGS, JSON.stringify(tagSettings));
        window.localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
        window.localStorage.setItem(STORAGE_KEY_HOUSEWORK, JSON.stringify(housework));
        window.localStorage.setItem(STORAGE_KEY_JOURNAL, JSON.stringify(journalEntries));
        alert('数据已恢复');
        window.location.reload();
      } catch (err) {
        console.error('导入数据时出错', err);
        alert('写入数据失败，请重试');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    window.localStorage.removeItem(STORAGE_KEY_RECORDS);
    window.localStorage.removeItem(STORAGE_KEY_TAG_SETTINGS);
    window.localStorage.removeItem(STORAGE_KEY_HOUSEWORK);
    window.localStorage.removeItem(STORAGE_KEY_JOURNAL);
    setShowClearConfirm(false);
    alert('已清空所有标签与记录');
    window.location.reload();
  };

  const openEdit = (owner: OwnerKey) => {
    setEditingOwner(owner);
    setEditName(ownerNames[owner] || '');
    setEditColor(ownerColors[owner] ?? DEFAULT_OWNER_COLORS[owner]);
  };

  const saveEdit = () => {
    if (editingOwner != null) {
      if (editName.trim()) {
        const nextNames = { ...ownerNames, [editingOwner]: editName.trim() };
        setOwnerNames(nextNames);
        try {
          const configRaw = localStorage.getItem(STORAGE_KEY_CONFIG);
          const config = configRaw ? JSON.parse(configRaw) : {};
          localStorage.setItem(
            STORAGE_KEY_CONFIG,
            JSON.stringify({ ...config, ownerNames: nextNames })
          );
        } catch {
          // ignore
        }
      }
      setOwnerColors((prev) => ({ ...prev, [editingOwner]: editColor }));
    }
    setEditingOwner(null);
    setEditName('');
  };

  const owners: { key: OwnerKey }[] = [{ key: 'Julia' }, { key: 'Maruko' }];

  return (
    <div className="w-full max-w-[384px] min-h-screen mx-auto bg-ecru overflow-hidden relative">
      {/* 顶栏：返回 + 设置 */}
      <div className="sticky top-0 z-10 w-full h-12 px-4 bg-ecru border-b border-ring-bg flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="h-5 flex items-center gap-1 text-ink text-sm font-medium tracking-tight font-body"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M11.25 13.5L6.75 9L11.25 4.5" stroke="#333333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          返回
        </button>
        <span className="text-ink text-base font-medium tracking-tight font-display font-body">设置</span>
        <div className="w-12" aria-hidden />
      </div>

      <div className="pt-0 pb-8 flex flex-col">
        {/* 用户 */}
        <div className="self-stretch h-8 bg-ecru flex items-center px-4">
          <span className="text-neutral-400 text-xs font-normal leading-4">用户</span>
        </div>
        <div className="self-stretch border-b border-ring-bg bg-ecru">
          {owners.map(({ key }, index) => {
            const colorKey = ownerColors[key] ?? DEFAULT_OWNER_COLORS[key];
            const avatarBg = getHexForColor(colorKey);
            const avatarIconColor = getContrastTextColor(avatarBg);
            return (
            <div key={key}>
              {index > 0 && <div className="w-full h-px bg-zinc-100 ml-4" />}
              <button
                type="button"
                onClick={() => openEdit(key)}
                className="w-full h-16 px-4 flex items-center gap-3 bg-ecru active:bg-ring-bg font-body"
              >
                <div
                  className="size-10 rounded-full flex justify-center items-center flex-shrink-0"
                  style={{ backgroundColor: avatarBg, color: avatarIconColor }}
                >
                  <UserIcon />
                </div>
                <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5 text-left">
                  <span className="text-ink text-sm font-medium leading-5 tracking-tight truncate w-full font-body">
                    {ownerNames[key] || DEFAULT_OWNER_NAMES[key]}
                  </span>
                  <span className="text-neutral-400 text-xs font-medium leading-4 tracking-tight">
                    修改名称和颜色
                  </span>
                </div>
                <ChevronRight className="text-stone-wash flex-shrink-0" />
              </button>
            </div>
            );
          })}
        </div>

        {/* 数据 */}
        <div className="self-stretch h-8 bg-ecru flex items-center px-4 mt-0">
          <span className="text-neutral-400 text-xs font-normal leading-4">数据</span>
        </div>
        <div className="self-stretch border-b border-ring-bg bg-ecru">
          <button
            type="button"
            onClick={handleExport}
            className="w-full h-16 px-4 flex items-center gap-3 bg-white active:bg-ring-bg"
          >
            <div className="size-10 rounded-full bg-slate-400 flex justify-center items-center flex-shrink-0">
              <DownloadIcon />
            </div>
            <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5 text-left">
              <span className="text-ink text-sm font-medium leading-5 tracking-tight font-body">导出数据</span>
              <span className="text-neutral-400 text-xs font-medium leading-4 tracking-tight">JSON格式备份</span>
            </div>
            <ChevronRight className="text-zinc-300 flex-shrink-0" />
          </button>
          <div className="w-full h-px bg-zinc-100 ml-4" />
          <button
            type="button"
            onClick={handleImport}
            className="w-full h-16 px-4 flex items-center gap-3 bg-white active:bg-ring-bg"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={onFileChange}
            />
            <div className="size-10 rounded-full bg-zinc-400 flex justify-center items-center flex-shrink-0">
              <UploadIcon />
            </div>
            <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5 text-left">
              <span className="text-ink text-sm font-medium leading-5 tracking-tight font-body">导入数据</span>
              <span className="text-neutral-400 text-xs font-medium leading-4 tracking-tight">从JSON恢复数据</span>
            </div>
            <ChevronRight className="text-zinc-300 flex-shrink-0" />
          </button>
          <div className="w-full h-px bg-zinc-100 ml-4" />
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="w-full h-16 px-4 flex items-center gap-3 bg-white active:bg-ring-bg"
          >
            <div className="size-10 rounded-full bg-neutral-400 flex justify-center items-center flex-shrink-0">
              <TrashIcon />
            </div>
            <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5 text-left">
              <span className="text-ink text-sm font-medium leading-5 tracking-tight font-body">清空数据</span>
              <span className="text-neutral-400 text-xs font-medium leading-4 tracking-tight">删除所有标签和记录</span>
            </div>
            <ChevronRight className="text-zinc-300 flex-shrink-0" />
          </button>
        </div>

        {/* 支持 */}
        <div className="self-stretch h-8 bg-ecru flex items-center px-4 mt-0">
          <span className="text-neutral-400 text-xs font-normal leading-4">支持</span>
        </div>
        <div className="self-stretch border-b border-ring-bg">
          <div className="w-full h-16 px-4 flex items-center gap-3 bg-ecru">
            <div className="size-10 rounded-full bg-slate-400 flex justify-center items-center flex-shrink-0">
              <InfoIcon />
            </div>
            <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5">
              <span className="text-ink text-sm font-medium leading-5 tracking-tight font-body">关于应用</span>
              <span className="text-neutral-400 text-xs font-medium leading-4 tracking-tight">Version 1.0.0</span>
            </div>
            <ChevronRight className="text-zinc-300 flex-shrink-0 opacity-0" aria-hidden />
          </div>
        </div>
      </div>

      {/* 编辑用户名弹窗 */}
      {editingOwner != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
          onClick={() => { setEditingOwner(null); setEditName(''); setEditColor('deep-blue'); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-owner-title"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-ecru p-4 border border-ring-bg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-owner-title" className="text-ink text-base font-medium mb-3 font-display font-body">
              修改{editingOwner === 'Julia' ? '用户1' : '用户2'}名称
            </h2>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={DEFAULT_OWNER_NAMES[editingOwner]}
              className="w-full h-10 px-3 rounded-xl border border-ring-bg text-sm text-ink placeholder:text-stone-wash font-body outline-none focus:ring-2 focus:ring-action-primary/30 focus:border-action-primary/50"
              autoFocus
            />
            <div className="mt-4">
              <span className="text-stone-wash text-xs font-medium mb-2 block">代表色</span>
              <div className="flex gap-2 flex-wrap">
                {THEME_COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setEditColor(opt.key)}
                    className={`size-9 rounded-full border-2 flex-shrink-0 transition-colors ${editColor === opt.key ? 'border-action-primary ring-2 ring-action-primary/20' : 'border-transparent'}`}
                    style={{ backgroundColor: opt.hex }}
                    title={opt.label}
                    aria-label={opt.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => { setEditingOwner(null); setEditName(''); setEditColor('deep-blue'); }}
                className="flex-1 h-9 rounded-xl border border-ring-bg text-ink text-sm font-medium active:bg-ring-bg"
              >
                取消
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="flex-1 h-9 rounded-xl bg-action-primary text-ecru text-sm font-medium font-body"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 清空确认弹窗 */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
          onClick={() => setShowClearConfirm(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-ecru p-4 border border-ring-bg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-ink text-sm mb-4 font-body">确定要删除所有标签和记录吗？此操作不可恢复。</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 h-9 rounded-xl border border-neutral-200 text-zinc-600 text-sm font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 h-9 rounded-xl bg-red-500 text-white text-sm font-medium"
              >
                清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

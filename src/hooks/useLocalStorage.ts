import { useState, useCallback, useEffect } from 'react';

/**
 * 从 LocalStorage 读取并解析 JSON，解析失败时返回 fallback。
 */
function getStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * 写入 LocalStorage，失败时静默忽略。
 */
function setStoredValue<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 静默忽略（如隐私模式、配额超限等）
  }
}

/**
 * 自定义 Hook：将状态持久化到 LocalStorage，并保持与 React 状态同步。
 * 数据完全保存在用户本地浏览器中，无需后端。
 *
 * @param key - LocalStorage 键名
 * @param initialValue - 首次使用或键不存在时的初始值
 * @returns [storedValue, setValue] 与 useState 用法一致
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValueState] = useState<T>(() => getStoredValue(key, initialValue));

  const setValue = useCallback(
    (valueOrUpdater: T | ((prev: T) => T)) => {
      setStoredValueState((prev) => {
        const next = typeof valueOrUpdater === 'function' ? (valueOrUpdater as (prev: T) => T)(prev) : valueOrUpdater;
        setStoredValue(key, next);
        return next;
      });
    },
    [key]
  );

  // 同源其他标签页修改同一 key 时同步到当前页
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue == null) return;
      try {
        setStoredValueState(JSON.parse(e.newValue) as T);
      } catch {
        // 忽略解析错误
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key]);

  return [storedValue, setValue];
}

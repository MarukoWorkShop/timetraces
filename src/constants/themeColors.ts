/** 4 个主题色：深蓝、影纳户、茜草色、萨克斯蓝 */
export const THEME_COLOR_OPTIONS = [
  { key: 'deep-blue', hex: '#1B263B', label: '深蓝色' },
  { key: 'yinnahu', hex: '#4A5D66', label: '影纳户' },
  { key: 'madder', hex: '#8C2727', label: '茜草色' },
  { key: 'saxe', hex: '#7892B5', label: '萨克斯蓝' },
] as const;

export type ThemeColorKey = (typeof THEME_COLOR_OPTIONS)[number]['key'];

export function getHexForColor(key: ThemeColorKey): string {
  const opt = THEME_COLOR_OPTIONS.find((o) => o.key === key);
  return opt?.hex ?? '#1B263B';
}

/** 根据背景色返回可读的前景色：深色背景用白字，浅色背景用深字 */
export function getContrastTextColor(hex: string): string {
  const h = hex.replace(/^#/, '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? '#1B263B' : '#FFFFFF';
}

export type OwnerKey = 'Julia' | 'Maruko';

export const DEFAULT_OWNER_COLORS: Record<OwnerKey, ThemeColorKey> = {
  Julia: 'deep-blue',
  Maruko: 'saxe',
};

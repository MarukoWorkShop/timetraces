/**
 * 时迹 (Time Traces) - 数据类型定义
 * 所有数据仅存于本地浏览器，无后端依赖。
 */

/** 按周重复：每周固定星期几生效 */
export interface FrequencyWeekly {
  kind: 'weekly';
  /** 生效的星期几，0=周日, 1=周一, ..., 6=周六 */
  activeWeekdays: number[];
}

/** 每 X 周一次：从起始周起每隔 interval 周生效 */
export interface FrequencyEveryNWeeks {
  kind: 'everyNWeeks';
  /** 间隔周数，如 2 表示每 2 周一次 */
  interval: number;
  /** 起始日期（ISO 日期字符串），用于计算“第几周” */
  startDate: string;
  /** 生效的星期几，0=周日, 1=周一, ..., 6=周六；不传则默认全部 */
  activeWeekdays?: number[];
}

export type TagFrequency = FrequencyWeekly | FrequencyEveryNWeeks;

export interface Tag {
  id: string;
  name: string;
  /** 用户选择的颜色，如 hex */
  userColor: string;
  /** 归属/所有者标识，可选 */
  owner?: string;
  /** 备注 */
  memo: string;
  /** 重复规则：按周重复 或 每 X 周一次 */
  frequency: TagFrequency;
}

export interface CheckInRecord {
  id: string;
  tagId: string;
  /** 打卡日期，ISO 日期字符串 YYYY-MM-DD */
  date: string;
  /** 评分，可选 */
  score?: number;
  /** 文字备注（一句话评价） */
  notes?: string;
  /** 打卡时间段 开始，HH:mm */
  startTime?: string;
  /** 打卡时间段 结束，HH:mm */
  endTime?: string;
  /** 照片 Base64，可选 */
  photoBase64?: string;
  /** 课程主题（追踪选项 courseTopic 勾选时填写） */
  courseTopic?: string;
  /** 公里数（追踪选项 km 勾选时填写） */
  km?: string;
  /** 卡路里（追踪选项 calories 勾选时填写） */
  calories?: string;
}

/** 导出用打卡记录：含标签名、分数、连续天数、今日次数、一句话评价等 */
export interface JournalExportRecord extends CheckInRecord {
  tagName: string;
  score: number;
  streak: number;
  todayCount: number;
  scoreText: string;
}

/** 打卡时记录项：勾选后 CheckInPage 显示对应表单项（起止时间、评分为核心必选，不在此列） */
export interface TrackingOptions {
  /** 课程主题 */
  courseTopic?: boolean;
  /** 公里数 */
  km?: boolean;
  /** 卡路里 */
  calories?: boolean;
  /** 一句话评价 */
  oneSentenceNote?: boolean;
  /** 当日照片 */
  dailyPhoto?: boolean;
}

/** 频率选项（编辑标签页） */
export type TagFrequencyType = 'daily' | 'weekly' | 'biweekly' | 'custom' | 'once';

/** 课程计划类型：次卡包 / 期间卡 / 日常习惯 */
export type TagPlanType = 'countPack' | 'periodCard' | 'dailyHabit';

/** 标签规则配置（用于 TagSettingsPage 与 CheckInPage 联动，同步 localStorage） */
export interface TagSettings {
  id: string;
  name: string;
  /** 所有者：Julia / Maruko（对应妈妈/宝宝） */
  owner: 'Julia' | 'Maruko';
  /** 默认打卡开始时间 HH:mm，打卡页默认用此作为起始 */
  defaultStartTime?: string;
  /** 默认打卡结束时间 HH:mm */
  defaultEndTime?: string;
  /** 备忘录（显示在首页，限 20 字） */
  memo?: string;
  /** 频率：每天 / 每周 / 双周 / 自定义 / 单次 */
  frequency?: TagFrequencyType;
  /** 重复星期几，0=周日…6=周六；当频率为每周/每天时可勾选 */
  repeatDays?: number[];
  /** 课程计划类型 */
  planType?: TagPlanType;
  /** 次卡包总课时（仅 planType 为 countPack 时有效） */
  totalLessons?: number;
  /** 期间卡开始日期 YYYY-MM-DD（仅 planType 为 periodCard 时有效） */
  startDate?: string;
  /** 期间卡结束日期 YYYY-MM-DD（仅 planType 为 periodCard 时有效） */
  endDate?: string;
  /** 追踪选项：勾选的项在打卡页显示 */
  trackingOptions: TrackingOptions;
  /** 是否已归档（拖入回收站） */
  archived?: boolean;
}

/** 家事任务频率（用于紧急度计算）：对应天数 */
export type HouseworkFrequencyKind =
  | 'daily'    // 每天 1
  | 'weekly'   // 每周 7
  | 'biweekly' // 两周一次 14
  | 'monthly'  // 每月 30
  | 'custom'   // 自定义（需 frequencyDays）
  | 'once';   // 一次性 0

/** 家事任务（存 localStorage housework-list） */
export interface HouseworkTask {
  id: string;
  name: string;
  /** 上次完成日期 YYYY-MM-DD，null 表示从未完成 */
  lastDoneDate: string | null;
  /** 频率间隔天数：1=每天，7=每周，14=两周，30=每月，0=一次性 */
  frequencyDays: number;
  /** 创建时间 YYYY-MM-DD，用于新任务紧急度推算 */
  createdAt: string;
  /** 起始日 YYYY-MM-DD，用于计算下一次提醒（从未完成时 nextReminder = startDate + frequencyDays）；旧数据缺省时用 createdAt */
  startDate?: string;
}

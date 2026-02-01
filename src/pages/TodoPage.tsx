import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { HouseworkTask } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEY_HOUSEWORK } from '@/constants/storage';
import { toDateString, formatMonthDay } from '@/utils/dateUtils';
import { getTaskDisplayInfo, calculateNextReminderDate } from '@/utils/housework';

export function TodoPage() {
  const navigate = useNavigate();
  const today = toDateString(new Date());
  const [houseworkList] = useLocalStorage<HouseworkTask[]>(STORAGE_KEY_HOUSEWORK, []);

  /** 列表顺序：未完成/周期任务在前（按下次提醒日），单次且已完成的排在最后并弱化 */
  const sortedList = useMemo(() => {
    const singleDone: HouseworkTask[] = [];
    const rest: HouseworkTask[] = [];
    houseworkList.forEach((t) => {
      if (t.frequencyDays === 0 && t.lastDoneDate) singleDone.push(t);
      else rest.push(t);
    });
    rest.sort((a, b) => {
      const da = calculateNextReminderDate(a, today);
      const db = calculateNextReminderDate(b, today);
      return da.localeCompare(db);
    });
    return [...rest, ...singleDone];
  }, [houseworkList, today]);

  return (
    <div className="min-h-screen bg-ecru leading-[30px]">
      <div className="max-w-[430px] mx-auto px-4 py-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-ink text-sm font-body"
        >
          ← 返回首页
        </button>
        <h1 className="text-slate-400 text-lg font-medium font-pingfang tracking-widest mt-4 leading-[30px]">家事看板</h1>
        {sortedList.length === 0 ? (
          <p className="text-stone-wash text-sm mt-2 font-body">敬请期待</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3 font-body">
            {sortedList.map((task) => {
              const isSingleDone = task.frequencyDays === 0 && task.lastDoneDate;
              const displayInfo = getTaskDisplayInfo(task, today);
              if (isSingleDone) {
                return (
                  <li
                    key={task.id}
                    className="text-stone-wash text-sm leading-5"
                  >
                    <span className="text-stone-wash">{task.name}</span>
                    <span className="text-stone-wash/80 text-xs ml-1">
                      完成于 {formatMonthDay(task.lastDoneDate!)}
                    </span>
                  </li>
                );
              }
              return (
                <li key={task.id} className="text-ink text-sm leading-5">
                  <span>{task.name}</span>
                  <span className="text-madder text-xs ml-1">
                    下一次提醒：{formatMonthDay(displayInfo.nextReminderDate)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

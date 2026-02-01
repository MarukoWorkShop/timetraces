import { useSearchParams, Link } from 'react-router-dom';

/** 统计页占位：支持从 /statistics?tag=xxx 跳回标签设置页 */
export function StatisticsPage() {
  const [searchParams] = useSearchParams();
  const tagId = searchParams.get('tag') ?? '';

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col p-4">
      <div className="max-w-md mx-auto w-full bg-ecru rounded-2xl border border-ring-bg p-6">
        <h1 className="text-num-primary text-lg font-medium font-display tracking-widest mb-2">此标签历史统计</h1>
        <p className="text-neutral-500 text-sm mb-4">
          {tagId ? `标签 ID：${tagId}` : '请从标签设置页进入'}
        </p>
        {tagId && (
          <Link
            to={`/tag-settings/${encodeURIComponent(tagId)}`}
            className="inline-block py-2 px-4 rounded-xl bg-action-primary text-white text-sm font-medium font-body"
          >
            返回标签设置
          </Link>
        )}
      </div>
    </div>
  );
}

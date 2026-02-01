import { useState, useEffect } from 'react';
import { PHILOSOPHIC_PROMPTS } from '@/constants/prompts';

export interface InterviewBannerProps {
  /** 点击问题后回调，用于自动填入输入框 */
  onSelectQuestion: (question: string) => void;
}

/** 随机取 N 个不重复问题 */
function pickRandom(questions: string[], n: number): string[] {
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

export function InterviewBanner({ onSelectQuestion }: InterviewBannerProps) {
  const [displayQuestions, setDisplayQuestions] = useState<string[]>([]);

  const refresh = () => {
    setDisplayQuestions(pickRandom(PHILOSOPHIC_PROMPTS, 3));
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="p-3 rounded-xl font-body">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[11px] text-status-done/50 font-pingfang">
          想不出写什么，或者可以问问自己这些问题……
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={refresh}
          onKeyDown={(e) => e.key === 'Enter' && refresh()}
          className="text-[10px] text-status-done/50 cursor-pointer hover:text-status-done/70 transition-colors font-pingfang"
        >
          换一批
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {displayQuestions.map((q, index) => (
          <span
            key={`${index}-${q.slice(0, 8)}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelectQuestion(q)}
            onKeyDown={(e) => e.key === 'Enter' && onSelectQuestion(q)}
            className="py-2 px-3 rounded-lg text-left text-[11px] text-status-done/30 cursor-pointer hover:text-status-done/50 transition-colors font-pingfang"
          >
            {q}
          </span>
        ))}
      </div>
    </section>
  );
}

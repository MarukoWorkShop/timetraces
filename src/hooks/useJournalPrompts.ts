import { useMemo, useState, useEffect } from 'react';
import { PHILOSOPHIC_PROMPTS } from '../constants/prompts';

export function useJournalPrompt(dateStr?: string) {
  const prompt = useMemo(() => {
    // 如果没有传入日期，默认使用今天
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    
    // 使用日期作为种子生成随机索引，确保每天的问题固定
    const dateSeed = targetDate.getFullYear() * 10000 + (targetDate.getMonth() + 1) * 100 + targetDate.getDate();
    const index = dateSeed % PHILOSOPHIC_PROMPTS.length;
    
    return PHILOSOPHIC_PROMPTS[index];
  }, [dateStr]);

  const [displayPrompt, setDisplayPrompt] = useState(prompt);
  useEffect(() => { setDisplayPrompt(prompt); }, [prompt]);

  const getRandomPrompt = () => {
    const next = PHILOSOPHIC_PROMPTS[Math.floor(Math.random() * PHILOSOPHIC_PROMPTS.length)];
    setDisplayPrompt(next);
    return next;
  };

  return { prompt: displayPrompt, getRandomPrompt };
}
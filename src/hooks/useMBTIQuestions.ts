/**
 * 咕噜 Gulu — MBTI 分维度答题 Hook
 * 为能量场/认知棱镜/伤痕映射/命运罗盘步骤提供统一的题目切换与答案记录
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useOnboardingStore } from '../stores/onboardingStore';
import { MBTI_QUESTIONS } from '../constants/mbti';
import type { MBTIDimension, MBTIAnswer } from '../types';

export function useMBTIQuestions(dimension: MBTIDimension) {
  const questions = MBTI_QUESTIONS.filter((q) => q.dimension === dimension);
  const addMBTIAnswer = useOnboardingStore((s) => s.addMBTIAnswer);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<MBTIAnswer['value'] | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = questions[index];

  const selectOption = useCallback(
    (value: MBTIAnswer['value']) => {
      if (transitioning || !currentQuestion) return;
      setSelected(value);
      addMBTIAnswer({ questionId: currentQuestion.id, value });
      setTransitioning(true);
      timerRef.current = setTimeout(() => {
        setSelected(null);
        setTransitioning(false);
        setIndex((prev) => prev + 1);
      }, 800);
    },
    [addMBTIAnswer, currentQuestion, transitioning]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    currentQuestion,
    index,
    total: questions.length,
    selected,
    selectOption,
    isDone: index >= questions.length,
  };
}

/**
 * 咕噜 Gulu — 任务 Store
 * 管理每日任务与每周任务生成、进度、领取
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DailyTask, WeeklyTask } from '../types';
import { DAILY_TASK_TEMPLATES, WEEKLY_TASK_TEMPLATES } from '../constants/tasks';
import { useCurrencyStore } from './currencyStore';

interface TaskState {
  dailyTasks: DailyTask[];
  weeklyTasks: WeeklyTask[];
  dailyStreak: number;
  lastDailyResetAt: string;
  lastWeeklyResetAt: string;
  dailyCompletionRate: number;
  /** 本周每天是否全部完成每日任务，用于计算每周任务星尘系数 */
  weekDailyAllDone: boolean[];
  checkAndReset: (stageNumber: 1 | 2 | 3) => void;
  generateDailyTasks: (stageNumber: 1 | 2 | 3, force?: boolean) => void;
  generateWeeklyTasks: (force?: boolean) => void;
  updateTaskProgress: (taskId: string, progressDelta: number, isWeekly?: boolean) => void;
  claimTaskReward: (taskId: string, isWeekly?: boolean) => { guluCoin?: number; starDust?: number } | null;
  getDailyMultiplier: () => number;
  getWeeklyMultiplier: () => number;
}

const RESET_HOUR = 4;

function getResetTime(referenceDate = new Date()): Date {
  const d = new Date(referenceDate);
  d.setHours(RESET_HOUR, 0, 0, 0);
  if (d.getTime() > referenceDate.getTime()) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

function getNextWeeklyResetDate(lastReset: string): Date {
  const last = new Date(lastReset);
  const next = new Date(last);
  next.setDate(next.getDate() + 7);
  next.setHours(RESET_HOUR, 0, 0, 0);
  return next;
}

function shouldResetDaily(lastResetAt: string): boolean {
  const now = new Date();
  const resetTime = getResetTime(now);
  return new Date(lastResetAt).getTime() < resetTime.getTime();
}

function shouldResetWeekly(lastResetAt: string): boolean {
  const now = new Date();
  const nextReset = getNextWeeklyResetDate(lastResetAt);
  return now.getTime() >= nextReset.getTime();
}

function buildDailyTask(template: typeof DAILY_TASK_TEMPLATES[0], stageNumber: 1 | 2 | 3): DailyTask {
  return {
    id: `${template.type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: template.type,
    description: template.getDescription(stageNumber),
    currentProgress: 0,
    targetProgress: template.target[stageNumber],
    reward: template.baseReward,
    isCompleted: false,
    isClaimed: false,
  };
}

function buildWeeklyTask(template: typeof WEEKLY_TASK_TEMPLATES[0]): WeeklyTask {
  return {
    id: `${template.type}_weekly_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: template.type,
    description: template.description,
    currentProgress: 0,
    targetProgress: template.target,
    baseReward: template.baseReward,
    isCompleted: false,
    isClaimed: false,
  };
}

function calculateCompletionRate(week: boolean[]): number {
  if (week.length === 0) return 0;
  return week.filter(Boolean).length / week.length;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      dailyTasks: [],
      weeklyTasks: [],
      dailyStreak: 0,
      lastDailyResetAt: new Date().toISOString(),
      lastWeeklyResetAt: new Date().toISOString(),
      dailyCompletionRate: 0,
      weekDailyAllDone: [],

      checkAndReset: (stageNumber) => {
        const state = get();
        let needsDailyReset = false;
        let needsWeeklyReset = false;

        try {
          needsDailyReset = shouldResetDaily(state.lastDailyResetAt);
        } catch {
          needsDailyReset = true;
        }

        try {
          needsWeeklyReset = shouldResetWeekly(state.lastWeeklyResetAt);
        } catch {
          needsWeeklyReset = true;
        }

        let dailyStreak = state.dailyStreak;
        let weekDailyAllDone = state.weekDailyAllDone;
        let dailyCompletionRate = state.dailyCompletionRate;

        if (needsDailyReset) {
          const allDone =
            state.dailyTasks.length > 0 &&
            state.dailyTasks.every((t) => t.isCompleted && t.isClaimed);
          dailyStreak = allDone ? dailyStreak + 1 : 0;
          weekDailyAllDone = [...weekDailyAllDone, allDone];
          dailyCompletionRate = calculateCompletionRate(weekDailyAllDone);
        }

        if (needsWeeklyReset) {
          weekDailyAllDone = [];
          dailyCompletionRate = 0;
        }

        set({ dailyStreak, weekDailyAllDone, dailyCompletionRate });

        if (needsDailyReset) {
          get().generateDailyTasks(stageNumber, true);
        }
        if (needsWeeklyReset) {
          get().generateWeeklyTasks(true);
        }
      },

      generateDailyTasks: (stageNumber, force = false) => {
        const { dailyTasks, lastDailyResetAt } = get();
        if (!force && dailyTasks.length > 0 && !shouldResetDaily(lastDailyResetAt)) {
          return;
        }

        const tasks = DAILY_TASK_TEMPLATES.map((t) => buildDailyTask(t, stageNumber));
        set({
          dailyTasks: tasks,
          lastDailyResetAt: new Date().toISOString(),
        });
      },

      generateWeeklyTasks: (force = false) => {
        const { weeklyTasks, lastWeeklyResetAt } = get();
        if (!force && weeklyTasks.length > 0 && !shouldResetWeekly(lastWeeklyResetAt)) {
          return;
        }

        const tasks = WEEKLY_TASK_TEMPLATES.map((t) => buildWeeklyTask(t));
        set({
          weeklyTasks: tasks,
          lastWeeklyResetAt: new Date().toISOString(),
        });
      },

      updateTaskProgress: (taskId, progressDelta, isWeekly = false) => {
        set((state) => {
          if (isWeekly) {
            const tasks = state.weeklyTasks.map((task) => {
              if (task.id !== taskId) return task;
              const newProgress = Math.min(task.targetProgress, task.currentProgress + progressDelta);
              return {
                ...task,
                currentProgress: newProgress,
                isCompleted: newProgress >= task.targetProgress,
              };
            });
            return { weeklyTasks: tasks };
          }

          const tasks = state.dailyTasks.map((task) => {
            if (task.id !== taskId) return task;
            const newProgress = Math.min(task.targetProgress, task.currentProgress + progressDelta);
            return {
              ...task,
              currentProgress: newProgress,
              isCompleted: newProgress >= task.targetProgress,
            };
          });
          return { dailyTasks: tasks };
        });
      },

      claimTaskReward: (taskId, isWeekly = false) => {
        const state = get();
        let reward: { guluCoin?: number; starDust?: number } | null = null;

        if (isWeekly) {
          const task = state.weeklyTasks.find((t) => t.id === taskId);
          if (!task || !task.isCompleted || task.isClaimed) return null;

          const multiplier = get().getWeeklyMultiplier();
          const starDust = Math.floor(task.baseReward * multiplier);
          useCurrencyStore.getState().addStarDust(starDust);

          set((s) => ({
            weeklyTasks: s.weeklyTasks.map((t) =>
              t.id === taskId ? { ...t, isClaimed: true } : t
            ),
          }));
          reward = { starDust };
        } else {
          const task = state.dailyTasks.find((t) => t.id === taskId);
          if (!task || !task.isCompleted || task.isClaimed) return null;

          const completedCount = state.dailyTasks.filter((t) => t.isCompleted).length;
          let multiplier = 1.0;
          if (completedCount >= 5) multiplier = 2.0;
          else if (completedCount >= 4) multiplier = 1.5;
          else if (completedCount >= 3) multiplier = 1.2;

          const streakMultiplier = state.dailyStreak >= 3 ? 1.5 : 1.0;
          const guluCoin = Math.floor(task.reward * multiplier * streakMultiplier);
          useCurrencyStore.getState().addGuluCoin(guluCoin);

          const allDailyCompleted = state.dailyTasks.every(
            (t) => t.id === taskId || t.isCompleted
          );
          if (allDailyCompleted && completedCount >= 5) {
            useCurrencyStore.getState().addGuluCoin(50);
          }

          set((s) => ({
            dailyTasks: s.dailyTasks.map((t) =>
              t.id === taskId ? { ...t, isClaimed: true } : t
            ),
          }));
          reward = { guluCoin };
        }

        return reward;
      },

      getDailyMultiplier: () => {
        const state = get();
        const completedCount = state.dailyTasks.filter((t) => t.isCompleted).length;
        let multiplier = 1.0;
        if (completedCount >= 5) multiplier = 2.0;
        else if (completedCount >= 4) multiplier = 1.5;
        else if (completedCount >= 3) multiplier = 1.2;

        if (state.dailyStreak >= 3) {
          multiplier *= 1.5;
        }
        return multiplier;
      },

      getWeeklyMultiplier: () => {
        const rate = calculateCompletionRate(get().weekDailyAllDone);
        if (rate >= 1.0) return 2.0;
        if (rate >= 0.8) return 1.5;
        if (rate >= 0.5) return 1.0;
        return 0.5;
      },
    }),
    {
      name: 'gulu-task-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

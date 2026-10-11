import { lessons, type Exercise, type Lesson } from '../data/lessons';

export const PRACTICE_XP = 15;
export const DEFAULT_DAILY_GOAL_XP = 40;

export interface LessonCompletion {
  completedAt: string;
  completedDay: string;
  bestScore: number;
}

export interface Progress {
  version: 1;
  completedLessons: Record<string, LessonCompletion>;
  practiceDays: string[];
  activityDays: string[];
  dailyXP: Record<string, number>;
  totalXP: number;
  dailyGoalXP: number;
}

export interface ProgressStats {
  totalXP: number;
  completedCount: number;
  streak: number;
  longestStreak: number;
  todayXP: number;
  dailyGoalXP: number;
  minutesLearned: number;
}

/** Local calendar dates preserve streaks across time zones and daylight saving. */
export function localDayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDayKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day, 12);
  return localDayKey(date) === value;
}

/** Calendar arithmetic deliberately avoids adding fixed 24-hour milliseconds. */
export function addCalendarDays(day: string, offset: number): string {
  if (!isDayKey(day)) throw new Error('Expected a valid local calendar day.');
  const [year, month, date] = day.split('-').map(Number);
  return localDayKey(new Date(year, month - 1, date + offset, 12));
}

export function defaultProgress(): Progress {
  return {
    version: 1,
    completedLessons: {},
    practiceDays: [],
    activityDays: [],
    dailyXP: {},
    totalXP: 0,
    dailyGoalXP: DEFAULT_DAILY_GOAL_XP,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validDays(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter(isDayKey))].sort() : [];
}

function recomputeXP(progress: Progress): Progress {
  const dailyXP: Record<string, number> = {};
  for (const lesson of lessons) {
    const completion = progress.completedLessons[lesson.id];
    if (completion) dailyXP[completion.completedDay] = (dailyXP[completion.completedDay] ?? 0) + lesson.xp;
  }
  for (const day of progress.practiceDays) dailyXP[day] = (dailyXP[day] ?? 0) + PRACTICE_XP;
  return {
    ...progress,
    dailyXP,
    totalXP: Object.values(dailyXP).reduce((total, xp) => total + xp, 0),
    activityDays: [...new Set([
      ...progress.activityDays,
      ...Object.keys(dailyXP),
    ])].sort(),
  };
}

/** Storage is untrusted: unknown lessons and corrupted counters are discarded. */
export function sanitizeProgress(value: unknown): Progress {
  const progress = defaultProgress();
  if (!isRecord(value) || value.version !== 1) return progress;
  if (isRecord(value.completedLessons)) {
    for (const lesson of lessons) {
      const completion = value.completedLessons[lesson.id];
      if (!isRecord(completion) || !isDayKey(completion.completedDay)) continue;
      const timestamp = typeof completion.completedAt === 'string' ? Date.parse(completion.completedAt) : NaN;
      if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== completion.completedAt) continue;
      const bestScore = typeof completion.bestScore === 'number' && Number.isFinite(completion.bestScore)
        ? Math.max(0, Math.min(100, Math.round(completion.bestScore))) : 0;
      progress.completedLessons[lesson.id] = {
        completedAt: new Date(timestamp).toISOString(),
        completedDay: completion.completedDay,
        bestScore,
      };
    }
  }
  progress.practiceDays = validDays(value.practiceDays);
  progress.activityDays = validDays(value.activityDays);
  if (typeof value.dailyGoalXP === 'number' && Number.isFinite(value.dailyGoalXP) && value.dailyGoalXP > 0) {
    progress.dailyGoalXP = Math.max(10, Math.min(200, Math.round(value.dailyGoalXP)));
  }
  return recomputeXP(progress);
}

export function getLessonStatus(progress: Progress, lessonId: string): 'completed' | 'available' | 'locked' {
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index < 0) return 'locked';
  if (progress.completedLessons[lessonId]) return 'completed';
  return lessons.slice(0, index).every((lesson) => progress.completedLessons[lesson.id]) ? 'available' : 'locked';
}

export function getNextLesson(progress: Progress): Lesson | undefined {
  return lessons.find((lesson) => getLessonStatus(progress, lesson.id) === 'available');
}

/** First completion earns XP; replays only improve the score and study streak. */
export function recordLessonCompletion(
  progress: Progress,
  lessonId: string,
  scorePercent: number,
  now = new Date(),
): Progress {
  const clean = sanitizeProgress(progress);
  if (getLessonStatus(clean, lessonId) === 'locked' || !Number.isFinite(now.getTime())) return clean;
  const day = localDayKey(now);
  const score = Number.isFinite(scorePercent) ? Math.max(0, Math.min(100, Math.round(scorePercent))) : 0;
  const previous = clean.completedLessons[lessonId];
  return recomputeXP({
    ...clean,
    completedLessons: {
      ...clean.completedLessons,
      [lessonId]: previous ? { ...previous, bestScore: Math.max(previous.bestScore, score) } : {
        completedAt: now.toISOString(), completedDay: day, bestScore: score,
      },
    },
    activityDays: [...clean.activityDays, day],
  });
}

/** A completed practice session earns 15 XP once per local day. */
export function recordPracticeCompletion(progress: Progress, now = new Date()): Progress {
  const clean = sanitizeProgress(progress);
  if (!Number.isFinite(now.getTime())) return clean;
  const day = localDayKey(now);
  return recomputeXP({
    ...clean,
    practiceDays: [...new Set([...clean.practiceDays, day])].sort(),
    activityDays: [...clean.activityDays, day],
  });
}

/** Yesterday keeps an active streak alive until the learner studies today. */
export function calculateStreak(activityDays: string[], now = new Date()): number {
  const days = new Set(validDays(activityDays));
  let cursor = localDayKey(now);
  if (!days.has(cursor)) cursor = addCalendarDays(cursor, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addCalendarDays(cursor, -1);
  }
  return streak;
}

export function calculateLongestStreak(activityDays: string[]): number {
  const days = validDays(activityDays);
  let longest = 0;
  let current = 0;
  let previous: string | undefined;
  for (const day of days) {
    current = previous && addCalendarDays(previous, 1) === day ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = day;
  }
  return longest;
}

export function getProgressStats(progress: Progress, now = new Date()): ProgressStats {
  return {
    totalXP: progress.totalXP,
    completedCount: Object.keys(progress.completedLessons).length,
    streak: calculateStreak(progress.activityDays, now),
    longestStreak: calculateLongestStreak(progress.activityDays),
    todayXP: progress.dailyXP[localDayKey(now)] ?? 0,
    dailyGoalXP: progress.dailyGoalXP,
    minutesLearned: lessons.reduce((minutes, lesson) => minutes + (progress.completedLessons[lesson.id] ? lesson.duration : 0), 0),
  };
}

export function getWeeklyActivity(progress: Progress, now = new Date()): {
  day: string; label: string; xp: number; isToday: boolean;
}[] {
  const today = localDayKey(now);
  return Array.from({ length: 7 }, (_, index) => {
    const day = addCalendarDays(today, index - 6);
    const [year, month, date] = day.split('-').map(Number);
    return {
      day,
      label: new Date(year, month - 1, date, 12).toLocaleDateString('en', { weekday: 'short' }),
      xp: progress.dailyXP[day] ?? 0,
      isToday: day === today,
    };
  });
}

/** Accents, smart apostrophes, case and punctuation do not obscure A1 answers. */
export function normalizeFrenchAnswer(answer: string): string {
  return answer
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/['’‘`]/g, '')
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b([cdjlmnst]|qu) ([aeiouyh])/g, '$1$2')
    .trim();
}

export function checkAnswer(exercise: Exercise, answer: string | string[]): boolean {
  const normalized = normalizeFrenchAnswer(Array.isArray(answer) ? answer.join(' ') : answer);
  if (!normalized) return false;
  const accepted = exercise.type === 'choice' ? [exercise.answer] : exercise.acceptedAnswers;
  return accepted.some((candidate) => normalizeFrenchAnswer(candidate) === normalized);
}

import { describe, expect, it } from 'vitest';
import { lessons } from '../data/lessons';
import {
  addCalendarDays, calculateLongestStreak, calculateStreak, checkAnswer, defaultProgress,
  getLessonStatus, getNextLesson, getProgressStats, getWeeklyActivity, localDayKey,
  normalizeFrenchAnswer, PRACTICE_XP, recordLessonCompletion, recordPracticeCompletion,
  sanitizeProgress,
} from './progress';

const date = (day: number) => new Date(2026, 9, day, 12);

describe('curriculum', () => {
  it('provides eight ordered lessons with unique IDs, two units and answerable exercises', () => {
    expect(lessons).toHaveLength(8);
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(8);
    expect(new Set(lessons.map((lesson) => lesson.unit))).toEqual(new Set([1, 2]));
    const allIds = lessons.flatMap((lesson) => lesson.exercises.map((exercise) => exercise.id));
    expect(new Set(allIds).size).toBe(allIds.length);
    for (const lesson of lessons) {
      expect(lesson.duration).toBeGreaterThan(0);
      expect(lesson.xp).toBeGreaterThan(0);
      expect(lesson.vocabulary.length).toBeGreaterThan(3);
      expect(lesson.exercises.length).toBeGreaterThanOrEqual(5);
      expect(lesson.exercises.length).toBeLessThanOrEqual(6);
      for (const exercise of lesson.exercises) {
        expect(exercise.prompt.length).toBeGreaterThan(0);
        expect(exercise.explanation.length).toBeGreaterThan(0);
        if (exercise.type === 'choice') {
          expect(new Set(exercise.options).size).toBe(exercise.options.length);
          expect(exercise.options).toContain(exercise.answer);
          expect(checkAnswer(exercise, exercise.answer)).toBe(true);
          for (const distractor of exercise.options.filter((option) => option !== exercise.answer)) {
            expect(checkAnswer(exercise, distractor)).toBe(false);
          }
        } else {
          expect(exercise.acceptedAnswers.length).toBeGreaterThan(0);
          for (const answer of exercise.acceptedAnswers) expect(checkAnswer(exercise, answer)).toBe(true);
          if (exercise.type === 'arrange') {
            const expectedWords = normalizeFrenchAnswer(exercise.acceptedAnswers[0]).split(' ').sort();
            const availableWords = normalizeFrenchAnswer(exercise.words.join(' ')).split(' ').sort();
            expect(availableWords).toEqual(expectedWords);
          }
        }
        expect(checkAnswer(exercise, '')).toBe(false);
        expect(checkAnswer(exercise, 'an incorrect answer')).toBe(false);
      }
    }
  });

  it('accepts accents, smart punctuation, spacing and ligature variations without ignoring words', () => {
    const exercise = lessons[0].exercises[3];
    expect(checkAnswer(exercise, '  a BIENTÔT!!! ')).toBe(true);
    expect(checkAnswer(exercise, ['À', 'bientôt'])).toBe(true);
    expect(checkAnswer(exercise, 'bientôt')).toBe(false);
    expect(normalizeFrenchAnswer('C’est ma sœur.')).toBe(normalizeFrenchAnswer("C'est ma soeur"));
    expect(normalizeFrenchAnswer('S’IL VOUS PLAÎT')).toBe(normalizeFrenchAnswer("s'il vous plait"));
  });

  it('accepts omitted or spaced contraction apostrophes while preserving meaningful words and order', () => {
    const bookExercise = lessons[3].exercises[5];
    for (const answer of ["J'ai un livre", 'J’ai un livre', 'Jai un livre', 'J ai un livre']) {
      expect(checkAnswer(bookExercise, answer)).toBe(true);
    }
    const nameExercise = lessons[1].exercises[1];
    for (const answer of ["Je m'appelle Camille", 'Je mappelle Camille', 'Je m appelle Camille']) {
      expect(checkAnswer(nameExercise, answer)).toBe(true);
    }
    const pleaseExercise = lessons[2].exercises[2];
    for (const answer of ["s'il vous plaît", 'sil vous plait', 's il vous plait']) {
      expect(checkAnswer(pleaseExercise, answer)).toBe(true);
    }
    for (const answer of ['Jai livre', 'Jai un', 'un livre Jai', 'Jaiunlivre', 'Je ai un livre']) {
      expect(checkAnswer(bookExercise, answer)).toBe(false);
    }
    expect(checkAnswer(nameExercise, 'Je appelle Camille')).toBe(false);
    expect(checkAnswer(nameExercise, 'Camille Je mappelle')).toBe(false);
    expect(checkAnswer(pleaseExercise, 'sil te plait')).toBe(false);
    expect(normalizeFrenchAnswer('Je mange le matin')).toBe('je mange le matin');
  });
});

describe('lesson completion and unlocking', () => {
  it('starts with only the first lesson available and unlocks sequentially', () => {
    const initial = defaultProgress();
    expect(getNextLesson(initial)?.id).toBe(lessons[0].id);
    expect(getLessonStatus(initial, lessons[0].id)).toBe('available');
    expect(getLessonStatus(initial, lessons[1].id)).toBe('locked');
    expect(recordLessonCompletion(initial, lessons[1].id, 100, date(10)).totalXP).toBe(0);
    const completed = recordLessonCompletion(initial, lessons[0].id, 80, date(10));
    expect(getLessonStatus(completed, lessons[0].id)).toBe('completed');
    expect(getNextLesson(completed)?.id).toBe(lessons[1].id);
    expect(initial.completedLessons).toEqual({});
  });

  it('awards XP only once across retries and replays, while keeping the best score', () => {
    const first = recordLessonCompletion(defaultProgress(), lessons[0].id, 67, date(10));
    const retry = recordLessonCompletion(first, lessons[0].id, 67, date(10));
    expect(retry.totalXP).toBe(lessons[0].xp);
    const replay = recordLessonCompletion(retry, lessons[0].id, 100, date(11));
    expect(replay.totalXP).toBe(first.totalXP);
    expect(replay.completedLessons[lessons[0].id].bestScore).toBe(100);
    expect(replay.completedLessons[lessons[0].id].completedDay).toBe('2026-10-10');
    expect(replay.dailyXP['2026-10-11']).toBeUndefined();
    expect(getProgressStats(replay, date(11)).streak).toBe(2);
    const weakerReplay = recordLessonCompletion(replay, lessons[0].id, 50, date(11));
    expect(weakerReplay.completedLessons[lessons[0].id].bestScore).toBe(100);
  });

  it('supports completing the full course and reports learned minutes', () => {
    let progress = defaultProgress();
    for (const lesson of lessons) progress = recordLessonCompletion(progress, lesson.id, 100, date(11));
    expect(getNextLesson(progress)).toBeUndefined();
    const stats = getProgressStats(progress, date(11));
    expect(stats.completedCount).toBe(8);
    expect(stats.totalXP).toBe(lessons.reduce((sum, lesson) => sum + lesson.xp, 0));
    expect(stats.minutesLearned).toBe(lessons.reduce((sum, lesson) => sum + lesson.duration, 0));
    expect(stats.todayXP).toBe(stats.totalXP);
  });

  it('ignores unknown lessons and invalid dates', () => {
    const initial = defaultProgress();
    expect(recordLessonCompletion(initial, 'does-not-exist', 100, date(11))).toEqual(initial);
    expect(recordLessonCompletion(initial, lessons[0].id, 100, new Date(NaN))).toEqual(initial);
  });
});

describe('practice and local calendar activity', () => {
  it('awards practice XP once per local day', () => {
    const first = recordPracticeCompletion(defaultProgress(), date(10));
    const retry = recordPracticeCompletion(first, date(10));
    expect(retry.totalXP).toBe(PRACTICE_XP);
    const nextDay = recordPracticeCompletion(retry, date(11));
    expect(nextDay.totalXP).toBe(PRACTICE_XP * 2);
    expect(nextDay.practiceDays).toEqual(['2026-10-10', '2026-10-11']);
    expect(getProgressStats(nextDay, date(11)).todayXP).toBe(PRACTICE_XP);
  });

  it('uses local midnight for study-day boundaries', () => {
    const beforeMidnight = new Date(2026, 9, 10, 23, 59);
    const afterMidnight = new Date(2026, 9, 11, 0, 1);
    expect(localDayKey(beforeMidnight)).toBe('2026-10-10');
    expect(localDayKey(afterMidnight)).toBe('2026-10-11');
    let progress = recordPracticeCompletion(defaultProgress(), beforeMidnight);
    progress = recordPracticeCompletion(progress, afterMidnight);
    expect(progress.totalXP).toBe(PRACTICE_XP * 2);
    expect(getProgressStats(progress, afterMidnight).streak).toBe(2);
  });

  it('keeps yesterday’s streak alive and breaks it after a missed calendar day', () => {
    const days = ['2026-10-08', '2026-10-09', '2026-10-10'];
    expect(calculateStreak(days, date(10))).toBe(3);
    expect(calculateStreak(days, date(11))).toBe(3);
    expect(calculateStreak(days, date(12))).toBe(0);
    expect(calculateStreak([...days, '2026-10-12'], date(12))).toBe(1);
    expect(calculateLongestStreak([...days, '2026-10-10', '2026-10-12'])).toBe(3);
  });

  it('handles month/year boundaries, leap years and calendar changes', () => {
    expect(addCalendarDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addCalendarDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addCalendarDays('2026-03-08', -1)).toBe('2026-03-07');
    expect(addCalendarDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(calculateStreak(['2026-12-31', '2027-01-01'], new Date(2027, 0, 1, 12))).toBe(2);
  });

  it('returns exactly seven chronological calendar days ending today', () => {
    const progress = recordPracticeCompletion(defaultProgress(), date(11));
    const week = getWeeklyActivity(progress, date(11));
    expect(week).toHaveLength(7);
    expect(week[0].day).toBe('2026-10-05');
    expect(week[6]).toMatchObject({ day: '2026-10-11', xp: PRACTICE_XP, isToday: true });
    expect(week.filter((day) => day.isToday)).toHaveLength(1);
    expect(week.slice(0, 6).every((day) => day.xp === 0)).toBe(true);
  });
});

describe('persisted progress validation', () => {
  it('resets invalid storage safely and does not share mutable defaults', () => {
    for (const value of [null, undefined, [], 'bad json', {}, { version: 9 }]) {
      expect(sanitizeProgress(value)).toEqual(defaultProgress());
    }
    const first = defaultProgress();
    first.activityDays.push('2026-10-10');
    expect(defaultProgress().activityDays).toEqual([]);
  });

  it('deduplicates days, rejects impossible dates and derives XP instead of trusting totals', () => {
    const progress = sanitizeProgress({
      version: 1,
      totalXP: 999999,
      dailyXP: { '2026-10-10': 999999 },
      dailyGoalXP: -5,
      activityDays: ['2026-10-10', '2026-10-10', '2026-02-30', 'nope', 5],
      practiceDays: ['2026-10-10', '2026-10-10', '2026-13-01'],
      completedLessons: {
        [lessons[0].id]: { completedAt: date(10).toISOString(), completedDay: '2026-10-10', bestScore: 500 },
        [lessons[1].id]: { completedAt: 'bad timestamp', completedDay: '2026-10-10', bestScore: 50 },
        unknown: { completedAt: date(10).toISOString(), completedDay: '2026-10-10', bestScore: 100 },
      },
    });
    expect(progress.totalXP).toBe(lessons[0].xp + PRACTICE_XP);
    expect(progress.dailyXP).toEqual({ '2026-10-10': lessons[0].xp + PRACTICE_XP });
    expect(progress.activityDays).toEqual(['2026-10-10']);
    expect(progress.practiceDays).toEqual(['2026-10-10']);
    expect(Object.keys(progress.completedLessons)).toEqual([lessons[0].id]);
    expect(progress.completedLessons[lessons[0].id].bestScore).toBe(100);
    expect(progress.dailyGoalXP).toBe(40);
  });

  it('keeps valid goals and scores and handles non-finite numeric values', () => {
    const completed = recordLessonCompletion(defaultProgress(), lessons[0].id, 88, date(11));
    const loaded = sanitizeProgress(JSON.parse(JSON.stringify({ ...completed, dailyGoalXP: 60 })));
    expect(loaded).toEqual({ ...completed, dailyGoalXP: 60 });
    expect(sanitizeProgress({ ...completed, dailyGoalXP: Infinity }).dailyGoalXP).toBe(40);
    expect(sanitizeProgress({ ...completed, dailyGoalXP: 500 }).dailyGoalXP).toBe(200);
    const malformed = { ...completed, completedLessons: {
      [lessons[0].id]: { ...completed.completedLessons[lessons[0].id], bestScore: NaN },
    } };
    expect(sanitizeProgress(malformed).completedLessons[lessons[0].id].bestScore).toBe(0);
  });

  it('rejects timestamp rollover dates and non-ISO timestamp strings', () => {
    for (const completedAt of ['2026-02-30T12:00:00.000Z', '1', 'October 11, 2026']) {
      const stored = {
        ...defaultProgress(),
        completedLessons: {
          [lessons[0].id]: { completedAt, completedDay: '2026-10-11', bestScore: 100 },
        },
      };
      expect(sanitizeProgress(stored).completedLessons).toEqual({});
      expect(sanitizeProgress(stored).totalXP).toBe(0);
    }
  });

  it('preserves replay activity independently of the day XP was first earned', () => {
    let completed = recordLessonCompletion(defaultProgress(), lessons[0].id, 80, date(10));
    completed = recordLessonCompletion(completed, lessons[0].id, 90, date(11));
    const restored = sanitizeProgress(JSON.parse(JSON.stringify(completed)));
    expect(restored.activityDays).toEqual(['2026-10-10', '2026-10-11']);
    expect(restored.dailyXP['2026-10-11']).toBeUndefined();
    expect(getProgressStats(restored, date(11)).streak).toBe(2);
    expect(restored.totalXP).toBe(lessons[0].xp);
  });
});

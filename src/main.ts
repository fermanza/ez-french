import './styles.css';
import { lessons, type Lesson, type Exercise } from './data/lessons';
import {
  defaultProgress, sanitizeProgress, recordLessonCompletion, recordPracticeCompletion,
  getLessonStatus, getProgressStats, getWeeklyActivity, getNextLesson, checkAnswer,
} from './lib/progress';

type View = 'learn' | 'practice' | 'vocabulary' | 'progress';
type Preferences = { name: string; audio: boolean; savedWords: string[] };
type Quiz = {
  lesson?: Lesson;
  exercises: Exercise[];
  index: number;
  selected: string;
  tokens: number[];
  feedback: 'correct' | 'incorrect' | null;
  mistakes: Set<number>;
  finished: boolean;
  started: boolean;
  awardedXP: number;
};

const PROGRESS_KEY = 'bonjour.progress.v1';
const PREFERENCES_KEY = 'bonjour.preferences.v1';
const app = document.querySelector<HTMLDivElement>('#app')!;
const modalRoot = document.querySelector<HTMLDivElement>('#modal-root')!;
const toastElement = document.querySelector<HTMLDivElement>('#toast')!;
let storageAvailable = true;
let progress = sanitizeProgress(readStorage(PROGRESS_KEY));
const storedPreferences = readStorage(PREFERENCES_KEY) as Partial<Preferences> | null;
let preferences: Preferences = {
  name: typeof storedPreferences?.name === 'string' ? storedPreferences.name.slice(0, 30) : 'French explorer',
  audio: storedPreferences?.audio !== false,
  savedWords: Array.isArray(storedPreferences?.savedWords)
    ? [...new Set(storedPreferences.savedWords.filter((word): word is string => typeof word === 'string' && allVocabulary().some(entry => entry.french === word)))] : [],
};
let view: View = 'learn';
let unit = 1;
let vocabularyQuery = '';
let vocabularyFilter = 'all';
let quiz: Quiz | null = null;
let activeDialog: 'quiz' | 'settings' | 'reset' | 'leave' | null = null;
let returnFocus: HTMLElement | null = null;
let toastTimer: ReturnType<typeof setTimeout>;

function readStorage(key: string): unknown {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : null; }
  catch { storageAvailable = false; return null; }
}

function persist() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
    toast('Progress is saved for this session. Local storage is unavailable.');
  }
}

function escape(value: string | number): string {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

const iconPaths: Record<string, string> = {
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4z"/><path d="M20 4h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-3h3z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  spark: '<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z"/>',
  chart: '<path d="M4 4v16h17M8 15v-3m5 3V8m5 7V5"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  fire: '<path d="M12 3c2 5-2 6 1 9 1-2 2-3 3-4 2 3 4 5 4 8a8 8 0 0 1-16 0c0-4 3-7 5-9 0 3 1 4 2 5 2-3 0-5 1-9Z"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  settings: '<path d="m9 3-1 3-3 1-2 4 2 2-1 3 3 3 3-1 2 3 4-1 1-3 3-1 1-4-2-2 1-3-3-3-3 1-2-2z"/><circle cx="12" cy="12" r="3"/>',
  cup: '<path d="M5 4h14v5a7 7 0 0 1-14 0zM9 21h6m-3-5v5M5 6H2v3a4 4 0 0 0 4 4m13-7h3v3a4 4 0 0 1-4 4"/>',
  chat: '<path d="M4 4h16v12H9l-5 4z"/><path d="M8 8h8m-8 4h5"/>',
  heart: '<path d="M12 21 3 12a5 5 0 0 1 7-7l2 2 2-2a5 5 0 0 1 7 7z"/>',
  coffee: '<path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9h2a3 3 0 0 1 0 6h-2M7 2v3m4-3v3m4-3v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a19 19 0 0 1 0 18 19 19 0 0 1 0-18z"/>',
  hand: '<path d="M7 13V5a2 2 0 0 1 4 0v7-9a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v7l1-4a2 2 0 0 1 3 2l-2 8a5 5 0 0 1-5 4h-5L4 16a2 2 0 0 1 3-3l4 4"/>',
  numbers: '<path d="m9 3-2 18M17 3l-2 18M3 9h18M2 15h18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  home: '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16m6-14v16"/>',
};

function icon(name: string, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] ?? iconPaths.book}</svg>`;
}

function logo() {
  return '<svg viewBox="0 0 44 44" class="brand-mark" aria-hidden="true"><rect width="44" height="44" rx="14" fill="#285845"/><path d="M11 12h23v17H20l-7 6v-6h-2z" fill="#d8ed99"/><circle cx="18" cy="20" r="1.5" fill="#285845"/><circle cx="27" cy="20" r="1.5" fill="#285845"/><path d="M19 24q3.5 3 7 0" fill="none" stroke="#285845" stroke-width="1.7" stroke-linecap="round"/></svg>';
}

function parisIllustration() {
  return `<div class="paris-art" aria-hidden="true">
    <svg class="paris-scene" viewBox="0 0 370 275" fill="none">
      <ellipse cx="215" cy="143" rx="113" ry="107" fill="#386752"/>
      <circle cx="287" cy="62" r="31" fill="#e5b690"/>
      <path d="M34 223h320" stroke="#64826b" stroke-width="2"/>
      <path d="M54 223v-64h31v64m-26-80h21v16m9 64v-90h31v90m-26-107h21v17m180 90v-80h29v80m-24-94h19v14m10 80v-51h23v51" fill="#416d55"/>
      <path d="M211 29c-2 50-12 93-30 136l-26 58h30l15-43h21l15 43h31l-27-58c-19-43-28-86-29-136Z" fill="#cfe0b0"/>
      <path d="m202 77 18 0m-23 25h29m-39 38h49m-55 25h62m-66 14h70m-62 44 29-50 29 50M192 120l39 20-39 25m30-88-25 25 32 20m-30-21 23-24" stroke="#7b9b70" stroke-width="3"/>
      <path d="M211 19v12m-40 137h80m-98 56h116" stroke="#e7edce" stroke-width="5" stroke-linecap="round"/>
      <path d="m109 74 4-9 4 9 9 4-9 4-4 9-4-9-9-4z" fill="#d2dfaa"/>
      <path d="m314 147 3-6 3 6 6 3-6 3-3 6-3-6-6-3z" fill="#e3b393"/>
      <path d="M70 111q7-9 14 0m-8 0q7-9 14 0" stroke="#9aaa80" stroke-width="2" stroke-linecap="round"/>
      <circle cx="140" cy="47" r="3" fill="#99af84"/><circle cx="320" cy="201" r="3" fill="#99af84"/>
      <path d="M31 223c-6-14-2-31 8-39 10 8 14 25 8 39m268 0c-6-14-2-31 8-39 10 8 14 25 8 39" fill="#9eb68a"/>
      <path d="M39 203v20m284-20v20" stroke="#54795d" stroke-width="2"/>
    </svg>
    <span class="art-word word-bonjour">bonjour ! <span>✦</span></span>
    <span class="art-word word-bienvenue">bienvenue</span>
    <span class="art-caption">YOUR NEXT CHAPTER: FRANCE</span>
  </div>`;
}

function render() {
  const stats = getProgressStats(progress);
  const links: { id: View; title: string; icon: string }[] = [
    { id: 'learn', title: 'Learn', icon: 'book' },
    { id: 'practice', title: 'Practice', icon: 'spark' },
    { id: 'vocabulary', title: 'Vocabulary', icon: 'grid' },
    { id: 'progress', title: 'My progress', icon: 'chart' },
  ];
  app.innerHTML = `<aside class="sidebar">
    <button class="brand" data-action="navigate" data-view="learn" aria-label="Bonjour home">${logo()}<span>bonjour<span class="brand-dot">.</span></span></button>
    <div class="course-label">YOUR DAILY DOSE OF FRENCH</div>
    <nav class="main-nav" aria-label="Main navigation">${links.map(link => `<button class="nav-link ${view === link.id ? 'active' : ''}" data-action="navigate" data-view="${link.id}" ${view === link.id ? 'aria-current="page"' : ''}>${icon(link.icon)}<span>${link.title}</span>${link.id === 'practice' ? '<span class="nav-badge">DAILY</span>' : ''}</button>`).join('')}</nav>
    <div class="sidebar-note"><div class="note-illustration">${icon('chat')}<span>ça va ?</span></div><h3>Little by little,<br>you’ll get there.</h3><p>Five minutes today.<br>A world of possibilities tomorrow.</p><span class="note-signature">On y va !</span></div>
    <button class="profile" data-action="settings" aria-label="Open profile and study settings"><span class="avatar">${escape(preferences.name.trim().charAt(0).toUpperCase() || 'F')}</span><span class="profile-copy"><strong>${escape(preferences.name)}</strong><small>Beginner · A1</small></span>${icon('settings')}</button>
  </aside>
  <div class="workspace"><header class="topbar"><div class="course-switch"><span class="french-flag" aria-label="French flag"><i></i><i></i><i></i></span><strong>French</strong><span class="course-level">A1 · Beginner</span></div><div class="topbar-stats"><button class="stat-pill streak-pill" data-action="navigate" data-view="progress" aria-label="${stats.streak} day streak">${icon('fire')}<strong>${stats.streak}</strong><span>day streak</span></button><button class="stat-pill xp-pill" data-action="navigate" data-view="progress" aria-label="${stats.totalXP} total experience points">${icon('bolt')}<strong>${stats.totalXP}</strong><span>XP</span></button></div></header>
  <main class="main-content" id="main-content">${view === 'learn' ? renderLearn() : view === 'practice' ? renderPractice() : view === 'vocabulary' ? renderVocabulary() : renderProgress()}</main>
  <footer class="app-footer"><span>Made for your next <em>bonjour.</em></span><span>${icon(storageAvailable ? 'check' : 'clock')} ${storageAvailable ? 'Progress saved on this device' : 'Session-only progress'}</span></footer></div>`;
}

function pageHeader(eyebrow: string, title: string, subtitle: string, extra = '') {
  return `<div class="page-heading"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${subtitle}</p></div>${extra}</div>`;
}

function goalCard() {
  const stats = getProgressStats(progress);
  const percent = Math.min(100, Math.round(stats.todayXP / stats.dailyGoalXP * 100));
  return `<button class="daily-goal" data-action="settings" aria-label="Daily goal: ${stats.todayXP} of ${stats.dailyGoalXP} XP. Change goal"><div class="goal-ring" style="--progress:${percent}%" role="progressbar" aria-label="Daily XP goal" aria-valuemin="0" aria-valuemax="${stats.dailyGoalXP}" aria-valuenow="${Math.min(stats.todayXP, stats.dailyGoalXP)}">${percent === 100 ? icon('check') : icon('bolt')}</div><div><strong>${percent === 100 ? 'Daily goal complete!' : 'Your daily goal'}</strong><span><b>${stats.todayXP}</b> / ${stats.dailyGoalXP} XP</span></div>${icon('chevron')}</button>`;
}

function renderLearn() {
  const next = getNextLesson(progress);
  const stats = getProgressStats(progress);
  const unitLessons = lessons.filter(lesson => lesson.unit === unit);
  const unitCompleted = unitLessons.filter(lesson => getLessonStatus(progress, lesson.id) === 'completed').length;
  return `${pageHeader('A FRESH START, EVERY DAY', 'A little French, <em>every day.</em>', 'Small lessons. Big discoveries. Your journey starts with a bonjour.', goalCard())}
    <section class="hero-card"><div class="hero-copy"><span class="hero-eyebrow"><span class="tiny-dot"></span>${next ? `UNIT ${next.unit} · ${escape(next.unitTitle.toUpperCase())}` : 'TOUTES NOS FÉLICITATIONS'}</span><h2>${stats.completedCount === 0 ? 'Every great story starts<br>with a little hello.' : next ? 'Your next adventure<br>is a lesson away.' : 'Look how far<br>your French has come.'}</h2><p>${stats.completedCount === 0 ? 'Meet a new language. Find your first words.<br>Let’s take that first step together.' : next ? `${escape(next.description)}<br>A few minutes now, a little more confidence tomorrow.` : 'You’ve completed all eight lessons.<br>Keep your new words close with a little daily practice.'}</p><button class="button hero-button" data-action="${next ? 'start-lesson' : 'start-practice'}" ${next ? `data-id="${next.id}"` : ''}>${stats.completedCount === 0 ? 'Let’s begin' : next ? 'Continue learning' : 'Keep practicing'}${icon('arrow')}</button><span class="hero-meta">${icon('clock')} ${next?.duration ?? 5} min <span>·</span> ${next ? `${next.xp} XP to earn` : 'Keep your streak going'}</span></div>${parisIllustration()}</section>
    <div class="dashboard-grid"><section class="learning-section"><div class="section-heading"><div><h2>Your learning path</h2><p>A little closer to your first conversation.</p></div><span class="section-count">${stats.completedCount} / ${lessons.length} lessons</span></div><div class="unit-tabs" role="tablist" aria-label="Lesson units">${[1, 2].map(id => `<button role="tab" aria-selected="${unit === id}" class="unit-tab ${unit === id ? 'selected' : ''}" data-action="unit" data-unit="${id}"><span>0${id}</span>${id === 1 ? 'First words' : 'Everyday life'}${unit === id ? icon('check') : ''}</button>`).join('')}</div><div class="unit-intro"><span class="unit-level">UNIT ${unit}</span><span>${unitCompleted} of ${unitLessons.length} lessons completed</span></div><div class="lesson-grid">${unitLessons.map((lesson, index) => lessonCard(lesson, index)).join('')}</div><div class="path-note">${icon('heart')} A few minutes every day goes a long way. You’ve got this.</div></section><aside class="right-rail">${weeklyCard()}${wordOfTheDay()}<div class="tip-card"><span class="tip-icon">${icon('spark')}</span><div><strong>Make it a little habit.</strong><p>Try saying your new words out loud. Even a whisper counts.</p></div></div></aside></div>`;
}

function lessonCard(lesson: Lesson, index: number) {
  const status = getLessonStatus(progress, lesson.id);
  const available = status === 'available';
  const iconName = ['chat', 'user', 'heart', 'numbers', 'coffee', 'home', 'map', 'globe'][lessons.indexOf(lesson)] ?? 'book';
  return `<button class="lesson-card ${status}" data-action="${status === 'locked' ? 'locked' : 'start-lesson'}" data-id="${lesson.id}" aria-label="${escape(lesson.title)}. ${status === 'locked' ? 'Complete the previous lesson to unlock' : status === 'completed' ? 'Completed. Review lesson' : 'Start lesson'}"><div class="lesson-card-top"><span class="lesson-symbol symbol-${index % 4}">${icon(iconName)}</span><span class="lesson-status">${status === 'locked' ? icon('lock') : status === 'completed' ? icon('check') : '<span class="ready-dot"></span> UP NEXT'}</span></div><span class="lesson-number">LESSON ${String(lessons.indexOf(lesson) + 1).padStart(2, '0')}</span><h3>${escape(lesson.title)}</h3><p>${escape(lesson.description)}</p><div class="lesson-card-bottom"><span>${icon('clock')} ${lesson.duration} min <i>·</i> ${lesson.xp} XP</span><span class="lesson-arrow">${icon(available ? 'arrow' : status === 'completed' ? 'check' : 'lock')}</span></div>${available ? '<span class="card-accent"></span>' : ''}</button>`;
}

function weeklyCard() {
  const days = getWeeklyActivity(progress);
  const active = days.filter(day => progress.activityDays.includes(day.day)).length;
  const max = Math.max(progress.dailyGoalXP, ...days.map(day => day.xp));
  return `<section class="card weekly-card"><div class="card-heading"><h3>Your week in French</h3>${icon('chart')}</div><p><strong>${active} ${active === 1 ? 'day' : 'days'}</strong> of showing up. Every one counts.</p><div class="week-chart" role="img" aria-label="XP in the last seven days: ${days.map(day => `${day.label} ${day.xp}`).join(', ')}">${days.map(day => `<div class="chart-day ${day.isToday ? 'today' : ''}"><div class="bar-track"><span class="chart-bar ${day.xp ? 'has-xp' : ''}" style="height:${day.xp ? Math.max(12, day.xp / max * 100) : 7}%" title="${day.day}: ${day.xp} XP"></span></div><span>${escape(day.label.charAt(0))}</span></div>`).join('')}</div><div class="weekly-footer"><span class="legend-dot"></span>${active ? 'Keep the momentum going' : 'A good day to start'}<span>${icon('spark')}</span></div></section>`;
}

function wordOfTheDay() {
  const words = allVocabulary();
  const date = new Date();
  const localDay = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const word = words[localDay % words.length];
  return `<section class="card word-card"><div class="card-heading"><span class="eyebrow">UN PETIT MOT</span><button class="icon-button" data-action="speak" data-word="${escape(word.french)}" aria-label="Listen to ${escape(word.french)}">${icon('sound')}</button></div><span class="word-label">WORD OF THE DAY</span><h3 lang="fr">${escape(word.french)}</h3><p>${escape(word.english)}</p><button class="text-button" data-action="navigate" data-view="vocabulary">Meet more words ${icon('arrow')}</button><span class="word-decoration" aria-hidden="true">✳</span></section>`;
}

function renderPractice() {
  const stats = getProgressStats(progress);
  const practicedToday = progress.practiceDays.includes(localDate());
  return `${pageHeader('A LITTLE REPETITION, A LOT OF CONFIDENCE', 'Make it <em>stick.</em>', 'Bring back familiar words. Give your memory a friendly nudge.', goalCard())}<section class="practice-hero"><div><span class="eyebrow">YOUR DAILY MIX</span><h2>A small challenge.<br>A stronger French you.</h2><p>Six quick questions from your unlocked lessons.<br>Practice translations, phrases, and putting words in order.</p><button class="button primary" data-action="start-practice">Start daily practice ${icon('arrow')}</button><div class="practice-meta">${icon('clock')} About 5 minutes <span>·</span> ${practicedToday ? 'Daily XP already earned' : 'Earn 15 XP today'}</div></div><div class="practice-art" aria-hidden="true"><span class="practice-orbit"></span><span class="practice-float float-1">merci</span><span class="practice-float float-2">bonjour</span><span class="practice-float float-3">s’il vous plaît</span><div class="big-spark">${icon('spark')}</div></div></section><div class="section-heading"><div><h2>Keep your words close</h2><p>There’s more than one way to make progress.</p></div></div><div class="practice-options"><button class="card practice-option" data-action="navigate" data-view="vocabulary"><span class="option-icon lavender">${icon('grid')}</span><span><h3>Explore your vocabulary</h3><p>Listen, learn, and save words for later.</p><small>${allVocabulary().length} words to discover</small></span>${icon('arrow')}</button><button class="card practice-option" data-action="review"><span class="option-icon peach">${icon('book')}</span><span><h3>Revisit a lesson</h3><p>A second look is always a good idea.</p><small>${stats.completedCount} ${stats.completedCount === 1 ? 'lesson' : 'lessons'} completed</small></span>${icon('arrow')}</button></div><div class="practice-tip">${icon('heart')}Mistakes are part of learning. Take your time, and try again.</div>`;
}

function allVocabulary() {
  const unique = new Map<string, { french: string; english: string; lesson: string; unit: number }>();
  for (const lesson of lessons) for (const word of lesson.vocabulary) {
    if (!unique.has(word.french)) unique.set(word.french, { ...word, lesson: lesson.title, unit: lesson.unit });
  }
  return [...unique.values()];
}

function renderVocabulary() {
  return `${pageHeader('WORDS OPEN WORLDS', 'Your little <em>lexicon.</em>', 'New words, familiar faces. Listen to them, and make them yours.')}<div class="vocabulary-toolbar"><label class="search-box">${icon('search')}<input id="vocabulary-search" type="search" placeholder="Find a French or English word…" value="${escape(vocabularyQuery)}" aria-label="Search vocabulary" autocomplete="off"/></label><div class="filter-group" aria-label="Vocabulary filters">${[['all', 'All words'], ['saved', `Saved (${preferences.savedWords.length})`], ['1', 'First words'], ['2', 'Everyday life']].map(([id, name]) => `<button class="filter-pill ${vocabularyFilter === id ? 'selected' : ''}" data-action="vocab-filter" data-filter="${id}" aria-pressed="${vocabularyFilter === id}">${escape(name)}</button>`).join('')}</div></div><div id="vocabulary-results">${vocabularyResults()}</div><div class="vocabulary-note">${icon('sound')}Pronunciation uses your device’s French voice. Add a French voice in your OS settings if needed.</div>`;
}

function vocabularyResults() {
  const query = vocabularyQuery.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = allVocabulary().filter(word => {
    const text = `${word.french} ${word.english}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return text.includes(query) && (vocabularyFilter === 'all' || (vocabularyFilter === 'saved' ? preferences.savedWords.includes(word.french) : word.unit === Number(vocabularyFilter)));
  });
  if (!words.length) return `<div class="empty-state">${icon(vocabularyFilter === 'saved' ? 'bookmark' : 'search')}<h2>${vocabularyFilter === 'saved' && !vocabularyQuery ? 'A home for your favorite words.' : 'No words found just yet.'}</h2><p>${vocabularyFilter === 'saved' && !vocabularyQuery ? 'Tap the bookmark on a word to keep it here.' : 'Try another French or English word.'}</p><button class="button secondary" data-action="vocab-clear">Explore all words ${icon('arrow')}</button></div>`;
  return `<div class="vocabulary-count">${words.length} ${words.length === 1 ? 'word' : 'words'} in your pocket</div><div class="vocabulary-grid">${words.map(word => `<article class="card vocabulary-card"><div class="vocabulary-card-top"><span class="vocab-unit">${escape(word.lesson)}</span><button class="icon-button bookmark-button ${preferences.savedWords.includes(word.french) ? 'is-saved' : ''}" data-action="save-word" data-word="${escape(word.french)}" aria-pressed="${preferences.savedWords.includes(word.french)}" aria-label="${preferences.savedWords.includes(word.french) ? 'Unsave' : 'Save'} ${escape(word.french)}">${icon('bookmark')}</button></div><h3 lang="fr">${escape(word.french)}</h3><p>${escape(word.english)}</p><button class="pronunciation-button" data-action="speak" data-word="${escape(word.french)}" aria-label="Listen to ${escape(word.french)}">${icon('sound')} Listen <span>français</span></button></article>`).join('')}</div>`;
}

function renderProgress() {
  const stats = getProgressStats(progress);
  const achievements = [
    { name: 'First bonjour', description: 'Complete your first lesson', earned: stats.completedCount >= 1, icon: 'chat' },
    { name: 'On a roll', description: 'Study on three days in a row', earned: stats.longestStreak >= 3, icon: 'fire' },
    { name: 'Word collector', description: 'Save five favorite words', earned: preferences.savedWords.length >= 5, icon: 'bookmark' },
    { name: 'A whole new chapter', description: 'Complete all eight lessons', earned: stats.completedCount === lessons.length, icon: 'cup' },
  ];
  return `${pageHeader('EVERY STEP COUNTS', 'Look at you <em>grow.</em>', 'Learning is a journey. Here’s a little proof of yours.', goalCard())}<div class="stats-grid">${[
    { icon: 'bolt', value: stats.totalXP, label: 'Total XP', sub: 'Little wins, added up', color: 'lime' },
    { icon: 'fire', value: stats.streak, label: 'Day streak', sub: `Personal best: ${stats.longestStreak} ${stats.longestStreak === 1 ? 'day' : 'days'}`, color: 'peach' },
    { icon: 'book', value: `${stats.completedCount} / ${lessons.length}`, label: 'Lessons completed', sub: 'Building your foundation', color: 'lavender' },
    { icon: 'clock', value: stats.minutesLearned, label: 'Lesson minutes', sub: 'Based on completed lessons', color: 'blue' },
  ].map(stat => `<div class="card metric-card"><span class="metric-icon ${stat.color}">${icon(stat.icon)}</span><strong>${stat.value}</strong><h3>${stat.label}</h3><p>${escape(stat.sub)}</p></div>`).join('')}</div><div class="progress-middle"><section class="card journey-card"><div class="card-heading"><h3>Your French foundation</h3><span>${Math.round(stats.completedCount / lessons.length * 100)}%</span></div><div class="journey-progress"><span style="width:${stats.completedCount / lessons.length * 100}%"></span></div><p>${stats.completedCount === lessons.length ? 'You did it! Keep practicing to feel more confident.' : `${lessons.length - stats.completedCount} more lessons, a whole world of new conversations.`}</p><button class="text-button" data-action="navigate" data-view="learn">Back to your learning path ${icon('arrow')}</button></section>${weeklyCard()}</div><div class="section-heading"><div><h2>Little milestones</h2><p>Something to celebrate along the way.</p></div><span class="section-count">${achievements.filter(item => item.earned).length} / ${achievements.length} unlocked</span></div><div class="achievements-grid">${achievements.map(item => `<div class="card achievement ${item.earned ? 'earned' : ''}"><span class="achievement-icon">${icon(item.icon)}</span><h3>${item.name}</h3><p>${item.description}</p><span class="achievement-status">${icon(item.earned ? 'check' : 'lock')}${item.earned ? 'Achieved' : 'Keep going'}</span></div>`).join('')}</div><section class="card completed-lessons"><div class="card-heading"><h3>Your lesson journal</h3>${icon('book')}</div>${stats.completedCount ? `<div class="journal-list">${lessons.filter(lesson => progress.completedLessons[lesson.id]).map(lesson => `<button data-action="start-lesson" data-id="${lesson.id}" class="journal-row"><span class="journal-check">${icon('check')}</span><span><strong>${escape(lesson.title)}</strong><small>Best accuracy: ${progress.completedLessons[lesson.id].bestScore}%</small></span><span>Review ${icon('arrow')}</span></button>`).join('')}</div>` : '<div class="journal-empty">Your first lesson is the first page. Let’s write it.</div>'}</section>`;
}

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function startLesson(id: string) {
  const lesson = lessons.find(item => item.id === id);
  if (!lesson) return;
  if (getLessonStatus(progress, id) === 'locked') { toast('Complete the previous lesson to unlock this one.'); return; }
  quiz = { lesson, exercises: lesson.exercises, index: 0, selected: '', tokens: [], feedback: null, mistakes: new Set(), finished: false, started: false, awardedXP: 0 };
  openDialog('quiz');
}

function startPractice() {
  const exercises = lessons.filter(lesson => getLessonStatus(progress, lesson.id) !== 'locked').flatMap(lesson => lesson.exercises);
  const shuffled = [...exercises];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const random = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[random]] = [shuffled[random], shuffled[index]];
  }
  quiz = { exercises: shuffled.slice(0, 6), index: 0, selected: '', tokens: [], feedback: null, mistakes: new Set(), finished: false, started: true, awardedXP: 0 };
  openDialog('quiz');
}

function openDialog(type: NonNullable<typeof activeDialog>) {
  if (!activeDialog) returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  activeDialog = type;
  app.inert = true;
  document.body.classList.add('modal-open');
  renderDialog();
}

function closeDialog() {
  activeDialog = null;
  quiz = null;
  modalRoot.innerHTML = '';
  app.inert = false;
  document.body.classList.remove('modal-open');
  if (returnFocus?.isConnected) returnFocus.focus();
  else app.querySelector<HTMLElement>('.nav-link.active')?.focus();
}

function renderDialog(focus = true) {
  if (!activeDialog) return;
  let content = '';
  if (activeDialog === 'quiz') content = renderQuiz();
  else if (activeDialog === 'settings') content = renderSettings();
  else if (activeDialog === 'reset') content = `<div class="confirm-dialog"><span class="confirm-icon">${icon('book')}</span><h2 id="dialog-title">Start a fresh chapter?</h2><p>This clears your lessons, XP, streak, and saved words on this device. Your name and daily goal will stay.</p><div class="dialog-actions"><button class="button secondary" data-action="settings">Keep my progress</button><button class="button danger" data-action="confirm-reset">Reset progress</button></div></div>`;
  else content = `<div class="confirm-dialog"><span class="confirm-icon">${icon('clock')}</span><h2 id="dialog-title">Take a little break?</h2><p>Your progress in this exercise won’t be saved. You can start the lesson again whenever you’re ready.</p><div class="dialog-actions"><button class="button secondary" data-action="resume-quiz">Keep learning</button><button class="button primary" data-action="leave-quiz">Leave lesson</button></div></div>`;
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="dialog ${activeDialog === 'quiz' ? 'quiz-dialog' : 'settings-dialog'}" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${content}</section></div>`;
  if (focus) {
    requestAnimationFrame(() => {
      const target = (activeDialog === 'quiz' && quiz?.feedback ? modalRoot.querySelector<HTMLElement>('#quiz-check') : null)
        ?? modalRoot.querySelector<HTMLElement>('input:not([type="checkbox"]):not([disabled])')
        ?? modalRoot.querySelector<HTMLElement>('.quiz-choice:not([disabled]), .word-bank .word-token:not([disabled])')
        ?? modalRoot.querySelector<HTMLElement>('.completion-continue, .intro-footer button, .dialog-actions button')
        ?? modalRoot.querySelector<HTMLElement>('.dialog-close');
      target?.focus();
    });
  }
}

function renderQuiz() {
  if (!quiz) return '';
  if (quiz.finished) return renderCompletion();
  if (!quiz.started && quiz.lesson) return renderLessonIntro(quiz.lesson);
  const exercise = quiz.exercises[quiz.index];
  const percent = Math.round(quiz.index / quiz.exercises.length * 100);
  const title = quiz.lesson?.title ?? 'Your daily mix';
  return `<div class="quiz-top"><button class="icon-button dialog-close" data-action="quit-quiz" aria-label="Leave lesson">${icon('close')}</button><span>${escape(title)}</span><strong>${quiz.index + 1} / ${quiz.exercises.length}</strong></div><div class="quiz-progress" role="progressbar" aria-label="Lesson progress" aria-valuemin="0" aria-valuemax="${quiz.exercises.length}" aria-valuenow="${quiz.index}"><span style="width:${percent}%"></span></div><div class="quiz-content"><span class="eyebrow">${exercise.type === 'choice' ? 'CHOOSE THE RIGHT ANSWER' : exercise.type === 'translate' ? 'FIND THE RIGHT WORDS' : 'BUILD A LITTLE SENTENCE'}</span><h2 id="dialog-title">${escape(exercise.prompt)}</h2><p class="quiz-hint">${exercise.type === 'choice' ? 'One of these is just right. Which one?' : exercise.type === 'translate' ? 'Type your answer. Accents and punctuation are optional.' : 'Tap the words in the right order.'}</p>${exercise.type === 'choice' ? `<div class="quiz-choices" role="radiogroup" aria-label="Answer choices">${exercise.options.map((option, index) => `<button class="quiz-choice ${quiz!.selected === option ? 'selected' : ''}" data-action="select-answer" data-answer="${escape(option)}" role="radio" aria-checked="${quiz!.selected === option}" ${quiz!.feedback ? 'disabled' : ''}><span class="choice-number">${index + 1}</span><span>${escape(option)}</span>${quiz!.selected === option ? icon('check') : ''}</button>`).join('')}</div>` : exercise.type === 'translate' ? `<label class="translation-label" for="translation-answer">Your answer</label><input class="translation-input" id="translation-answer" type="text" value="${escape(quiz.selected)}" placeholder="${escape(exercise.placeholder)}" autocomplete="off" spellcheck="false" ${quiz.feedback ? 'disabled' : ''}/>` : `<div class="sentence-builder" aria-label="Your sentence">${quiz.tokens.length ? quiz.tokens.map((tokenIndex, index) => `<button class="word-token selected-token" data-action="remove-token" data-index="${index}" ${quiz!.feedback ? 'disabled' : ''} aria-label="Remove ${escape(exercise.words[tokenIndex])}">${escape(exercise.words[tokenIndex])}</button>`).join('') : '<span>Your sentence will appear here…</span>'}</div><div class="word-bank" aria-label="Available words">${exercise.words.map((word, index) => `<button class="word-token ${quiz!.tokens.includes(index) ? 'used' : ''}" data-action="add-token" data-index="${index}" ${quiz!.tokens.includes(index) || quiz!.feedback ? 'disabled' : ''}>${escape(word)}</button>`).join('')}</div>`}</div><div class="quiz-bottom ${quiz.feedback ?? ''}"><div class="quiz-feedback" aria-live="polite">${quiz.feedback ? `<span class="feedback-icon">${icon(quiz.feedback === 'correct' ? 'check' : 'heart')}</span><div><strong>${quiz.feedback === 'correct' ? 'Très bien! You’ve got it.' : 'Almost! Let’s give it another try.'}</strong><p>${escape(exercise.explanation)}</p></div>` : `<span class="keyboard-hint">${icon('spark')} Take your time. Every try is a step forward.</span>`}</div><button id="quiz-check" class="button primary" data-action="${quiz.feedback === 'correct' ? 'next-question' : quiz.feedback === 'incorrect' ? 'retry-question' : 'check-answer'}" ${!quiz.feedback && !hasAnswer() ? 'disabled' : ''}>${quiz.feedback === 'correct' ? quiz.index === quiz.exercises.length - 1 ? 'Finish lesson' : 'Continue' : quiz.feedback === 'incorrect' ? 'Try again' : 'Check answer'}${icon('arrow')}</button></div>`;
}

function hasAnswer() {
  if (!quiz) return false;
  return quiz.exercises[quiz.index].type === 'arrange' ? quiz.tokens.length > 0 : quiz.selected.trim().length > 0;
}

function renderLessonIntro(lesson: Lesson) {
  return `<div class="quiz-top"><button class="icon-button dialog-close" data-action="quit-quiz" aria-label="Leave lesson">${icon('close')}</button><span>UNIT ${lesson.unit} · ${escape(lesson.unitTitle)}</span><strong>${lesson.duration} min</strong></div><div class="lesson-intro"><span class="eyebrow">A FEW WORDS TO TAKE WITH YOU</span><h2 id="dialog-title">${escape(lesson.title)}</h2><p>${escape(lesson.description)} Read and listen, then put your words to work.</p><div class="intro-vocabulary">${lesson.vocabulary.map(word => `<div class="intro-word"><div><strong lang="fr">${escape(word.french)}</strong><span>${escape(word.english)}</span></div><button class="icon-button" data-action="speak" data-word="${escape(word.french)}" aria-label="Listen to ${escape(word.french)}">${icon('sound')}</button></div>`).join('')}</div><div class="intro-footer"><span>${lesson.exercises.length} questions · ${lesson.xp} XP</span><button class="button primary" data-action="start-exercises">Let’s try it ${icon('arrow')}</button></div></div>`;
}

function submitAnswer() {
  if (!quiz || quiz.feedback || !hasAnswer()) return;
  const exercise = quiz.exercises[quiz.index];
  const answer = exercise.type === 'arrange' ? quiz.tokens.map(index => exercise.words[index]) : quiz.selected;
  const correct = checkAnswer(exercise, answer);
  quiz.feedback = correct ? 'correct' : 'incorrect';
  if (!correct) quiz.mistakes.add(quiz.index);
  renderDialog(false);
  modalRoot.querySelector<HTMLElement>('#quiz-check')?.focus();
}

function nextQuestion() {
  if (!quiz || quiz.feedback !== 'correct') return;
  if (quiz.index + 1 === quiz.exercises.length) {
    const score = Math.round((quiz.exercises.length - quiz.mistakes.size) / quiz.exercises.length * 100);
    const previousXP = progress.totalXP;
    progress = quiz.lesson ? recordLessonCompletion(progress, quiz.lesson.id, score) : recordPracticeCompletion(progress);
    quiz.awardedXP = progress.totalXP - previousXP;
    quiz.finished = true;
    persist();
    render();
  } else {
    quiz.index++;
    quiz.selected = '';
    quiz.tokens = [];
    quiz.feedback = null;
  }
  renderDialog();
}

function renderCompletion() {
  if (!quiz) return '';
  const accuracy = Math.round((quiz.exercises.length - quiz.mistakes.size) / quiz.exercises.length * 100);
  const next = getNextLesson(progress);
  return `<div class="completion"><div class="completion-art" aria-hidden="true"><span>✦</span>${icon('cup')}<span>✧</span></div><span class="eyebrow">ONE MORE LITTLE WIN</span><h2 id="dialog-title">${accuracy === 100 ? 'Magnifique !' : 'Bravo, you did it!'}</h2><p>${quiz.lesson ? `You’ve completed “${escape(quiz.lesson.title)}”.` : 'Your daily practice is complete.'}<br>Every little lesson brings you closer.</p><div class="completion-stats"><div>${icon('bolt')}<strong>+${quiz.awardedXP}</strong><span>XP earned</span></div><div>${icon('check')}<strong>${accuracy}%</strong><span>First-try accuracy</span></div><div>${icon('fire')}<strong>${getProgressStats(progress).streak}</strong><span>Day streak</span></div></div>${quiz.awardedXP === 0 ? `<p class="replay-note">${quiz.lesson ? 'You already earned XP for this lesson. Your best score is still saved.' : 'You’ve already earned today’s practice XP. Your study streak is saved.'}</p>` : ''}<button class="button primary completion-continue" data-action="complete-close">Back to my journey ${icon('arrow')}</button>${next && quiz.lesson ? `<span class="next-lesson-note">Up next: ${escape(next.title)}</span>` : !next && quiz.lesson ? '<button class="text-button" data-action="maintenance-goal">Set a 15 XP daily practice goal</button>' : ''}</div>`;
}

function renderSettings() {
  return `<div class="dialog-heading"><div><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2 id="dialog-title">Your little study space.</h2></div><button class="icon-button dialog-close" data-action="close-dialog" aria-label="Close settings">${icon('close')}</button></div><form id="settings-form"><label class="settings-label" for="learner-name">What should we call you?</label><input class="settings-input" id="learner-name" name="name" type="text" value="${escape(preferences.name)}" maxlength="30" required/><fieldset class="goal-options"><legend>Your daily goal</legend><p>A small, steady habit is a great place to start.</p>${[15, 40, 60].map(goal => `<label class="goal-option"><input type="radio" name="goal" value="${goal}" ${progress.dailyGoalXP === goal ? 'checked' : ''}/><span><strong>${goal} XP</strong><small>${goal === 15 ? 'Daily refresher' : goal === 40 ? 'A little momentum' : 'An extra challenge'}</small></span></label>`).join('')}</fieldset><label class="audio-setting"><span>${icon('sound')}<span><strong>Pronunciation audio</strong><small>Read French words using your device’s voice.</small></span></span><input type="checkbox" name="audio" ${preferences.audio ? 'checked' : ''}/></label><p class="privacy-note">${icon('lock')}Your progress stays on this device. No account needed.</p><button class="button primary settings-save" type="submit">Save my preferences ${icon('check')}</button></form><button class="reset-link" data-action="reset">Reset learning progress</button>`;
}

function speak(word: string) {
  if (!preferences.audio) { toast('Enable pronunciation audio in your study settings.'); return; }
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') { toast('Pronunciation isn’t available in this view. Try a browser with speech support.'); return; }
  const voices = window.speechSynthesis.getVoices();
  const frenchVoice = voices.find(voice => voice.lang.toLowerCase() === 'fr-fr') ?? voices.find(voice => voice.lang.toLowerCase().startsWith('fr'));
  if (!frenchVoice) { toast('Add a French voice in your device’s speech settings to hear pronunciation.'); return; }
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'fr-FR';
  utterance.voice = frenchVoice;
  utterance.rate = 0.8;
  utterance.onerror = () => toast('The French voice couldn’t play. Check your device’s speech settings.');
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function toast(message: string) {
  clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.add('visible');
  toastTimer = setTimeout(() => toastElement.classList.remove('visible'), 4500);
}

document.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target || target instanceof HTMLButtonElement && target.disabled) return;
  const action = target.dataset.action;
  if (action === 'navigate') {
    view = target.dataset.view as View;
    render();
    document.querySelector('.workspace')?.scrollTo({ top: 0 });
  } else if (action === 'unit') { unit = Number(target.dataset.unit); render(); }
  else if (action === 'start-lesson') startLesson(target.dataset.id!);
  else if (action === 'start-practice') startPractice();
  else if (action === 'locked') toast('Complete the previous lesson to unlock this one. One step at a time!');
  else if (action === 'settings') openDialog('settings');
  else if (action === 'close-dialog' || action === 'complete-close' || action === 'leave-quiz') closeDialog();
  else if (action === 'reset') openDialog('reset');
  else if (action === 'confirm-reset') {
    const goal = progress.dailyGoalXP;
    progress = defaultProgress();
    progress.dailyGoalXP = goal;
    preferences.savedWords = [];
    unit = 1;
    persist(); render(); closeDialog(); toast('A fresh start. Your first bonjour is waiting.');
  } else if (action === 'quit-quiz') { if (quiz?.finished) closeDialog(); else openDialog('leave'); }
  else if (action === 'resume-quiz') { activeDialog = 'quiz'; renderDialog(); }
  else if (action === 'maintenance-goal') { progress.dailyGoalXP = 15; persist(); render(); closeDialog(); toast('Your daily practice goal is now 15 XP. Keep your French growing.'); }
  else if (action === 'start-exercises' && quiz) { quiz.started = true; renderDialog(); }
  else if (action === 'select-answer' && quiz && !quiz.feedback) { quiz.selected = target.dataset.answer!; renderDialog(false); modalRoot.querySelector<HTMLElement>('.quiz-choice.selected')?.focus(); }
  else if (action === 'add-token' && quiz && !quiz.feedback) { quiz.tokens.push(Number(target.dataset.index)); renderDialog(false); (modalRoot.querySelector<HTMLElement>('.word-bank .word-token:not([disabled])') ?? modalRoot.querySelector<HTMLElement>('#quiz-check'))?.focus(); }
  else if (action === 'remove-token' && quiz && !quiz.feedback) { quiz.tokens.splice(Number(target.dataset.index), 1); renderDialog(false); modalRoot.querySelector<HTMLElement>('.word-bank .word-token:not([disabled])')?.focus(); }
  else if (action === 'check-answer') submitAnswer();
  else if (action === 'next-question') nextQuestion();
  else if (action === 'retry-question' && quiz) { quiz.feedback = null; quiz.selected = ''; quiz.tokens = []; renderDialog(); }
  else if (action === 'speak') speak(target.dataset.word!);
  else if (action === 'vocab-filter') { vocabularyFilter = target.dataset.filter!; render(); }
  else if (action === 'vocab-clear') { vocabularyFilter = 'all'; vocabularyQuery = ''; render(); }
  else if (action === 'save-word') {
    const word = target.dataset.word!;
    const saved = preferences.savedWords.includes(word);
    preferences.savedWords = saved ? preferences.savedWords.filter(item => item !== word) : [...preferences.savedWords, word];
    persist(); render(); toast(saved ? 'Word removed from your collection.' : `${word} — saved for later.`);
  } else if (action === 'review') {
    const completed = lessons.find(lesson => getLessonStatus(progress, lesson.id) === 'completed');
    if (completed) startLesson(completed.id);
    else { view = 'learn'; render(); toast('Start with your first lesson. You can review it once it’s complete.'); }
  }
});

document.addEventListener('input', event => {
  const target = event.target as HTMLInputElement;
  if (target.id === 'vocabulary-search') {
    vocabularyQuery = target.value;
    document.querySelector('#vocabulary-results')!.innerHTML = vocabularyResults();
  } else if (target.id === 'translation-answer' && quiz) {
    quiz.selected = target.value;
    const check = document.querySelector<HTMLButtonElement>('#quiz-check');
    if (check) check.disabled = !hasAnswer();
  }
});

document.addEventListener('submit', event => {
  if ((event.target as HTMLFormElement).id !== 'settings-form') return;
  event.preventDefault();
  const data = new FormData(event.target as HTMLFormElement);
  preferences.name = String(data.get('name') ?? '').trim().slice(0, 30) || 'French explorer';
  preferences.audio = data.get('audio') === 'on';
  const goal = Number(data.get('goal'));
  progress.dailyGoalXP = [15, 40, 60].includes(goal) ? goal : 40;
  persist(); render(); closeDialog(); toast('Your study space is ready. On y va!');
});

document.addEventListener('keydown', event => {
  if (!activeDialog) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (activeDialog === 'quiz' && quiz && !quiz.finished) openDialog('leave');
    else if (activeDialog === 'leave') { activeDialog = 'quiz'; renderDialog(); }
    else if (activeDialog === 'reset') openDialog('settings');
    else closeDialog();
    return;
  }
  if (event.key === 'Tab') {
    const focusables = [...modalRoot.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
    const first = focusables[0]; const last = focusables[focusables.length - 1];
    if (!modalRoot.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  if (activeDialog !== 'quiz' || !quiz || quiz.finished || !quiz.started) return;
  const exercise = quiz.exercises[quiz.index];
  const target = event.target as HTMLElement;
  if (exercise.type === 'choice' && /^[1-9]$/.test(event.key) && !quiz.feedback && target.tagName !== 'INPUT') {
    const option = exercise.options[Number(event.key) - 1];
    if (option) { quiz.selected = option; renderDialog(false); modalRoot.querySelector<HTMLElement>('.quiz-choice.selected')?.focus(); }
  }
  if (event.key === 'Enter' && target.id === 'translation-answer') { event.preventDefault(); submitAnswer(); }
});

render();
if ('speechSynthesis' in window) window.speechSynthesis.getVoices();

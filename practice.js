const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];
const WORD_MATCH_THRESHOLD = 0.7;
const PASS_SCORE = 0.8;
const DAY_MS = 86_400_000;
const DAILY_GOAL = 20;

// The recogniser hears Italian, so reduce Latin and Italian spellings of the
// same sounds to one form (e.g. "caeli" and "cieli" both become "celi").
function normalizeWord(word) {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .replace(/[æœ]/g, "e")
    .replace(/ae|oe/g, "e")
    .replace(/([^stx])ti(?=[aeiou])/g, "$1zi")
    .replace(/^ti(?=[aeiou])/, "zi")
    .replace(/(c|g|sc)i(?=[aou])/g, "$1")
    .replace(/(c|g|sc)i(?=e)/g, "$1")
    .replace(/ch/g, "c")
    .replace(/ph/g, "f")
    .replace(/th/g, "t")
    .replace(/h/g, "")
    .replace(/k/g, "c")
    .replace(/y/g, "i")
    .replace(/j/g, "i")
    .replace(/(.)\1+/g, "$1");
}

function normalizeWords(text) {
  return text.split(/\s+/).map(normalizeWord).filter(Boolean);
}

function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row.push(Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost));
    }
    prev = row;
  }
  return prev[b.length];
}

function similarity(a, b) {
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 1 : 1 - editDistance(a, b) / longest;
}

function wordHeard(target, heardWords) {
  return heardWords.some(
    (heard) => similarity(target, heard) >= WORD_MATCH_THRESHOLD,
  );
}

function scoreAttempt(target, heard) {
  const heardWords = normalizeWords(heard);
  const words = target
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => {
      const norm = normalizeWord(text);
      return { text, ok: !norm || wordHeard(norm, heardWords) };
    });
  const scored = words.filter((w) => normalizeWord(w.text));
  const score = scored.length
    ? scored.filter((w) => w.ok).length / scored.length
    : 0;
  return { score, words, heard };
}

function bestAttempt(target, alternatives) {
  return alternatives
    .map((heard) => scoreAttempt(target, heard))
    .reduce((best, next) => (next.score > best.score ? next : best), {
      score: -1,
    });
}

function hintText(text) {
  return text.replace(/\p{L}+/gu, (w) => w[0] + "_".repeat(w.length - 1));
}

function dayNumber(now = Date.now()) {
  const offsetMs = new Date(now).getTimezoneOffset() * 60_000;
  return Math.floor((now - offsetMs) / DAY_MS);
}

function scheduleAgain(entry, today) {
  return { ...entry, step: 0, due: today + REVIEW_INTERVALS_DAYS[0] };
}

// Returns null once the line has passed the last interval (learned).
function scheduleKnown(entry, today) {
  const step = entry.step + 1;
  if (step >= REVIEW_INTERVALS_DAYS.length) return null;
  return { ...entry, step, due: today + REVIEW_INTERVALS_DAYS[step] };
}

function todayCount(progress, today) {
  return progress.day === today ? progress.count : 0;
}

// The streak counts days in a row on which the daily goal was reached.
function recordPractice(progress, today, goal = DAILY_GOAL) {
  const count = todayCount(progress, today) + 1;
  if (count < goal || progress.goalDay === today)
    return { ...progress, day: today, count };
  const streak = progress.goalDay === today - 1 ? progress.streak + 1 : 1;
  return { ...progress, day: today, count, streak, goalDay: today };
}

function currentStreak(progress, today) {
  return progress.goalDay >= today - 1 ? progress.streak : 0;
}

if (typeof module !== "undefined") {
  module.exports = {
    PASS_SCORE,
    REVIEW_INTERVALS_DAYS,
    normalizeWord,
    similarity,
    scoreAttempt,
    bestAttempt,
    hintText,
    dayNumber,
    scheduleAgain,
    scheduleKnown,
    todayCount,
    recordPractice,
    currentStreak,
  };
}

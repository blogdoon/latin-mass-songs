const test = require("node:test");
const assert = require("node:assert/strict");
const p = require("./practice.js");

test("normalizeWord strips accents and punctuation", () => {
  assert.equal(p.normalizeWord("Deo,"), "deo");
  assert.equal(p.normalizeWord("Pácem."), "pacem");
});

test("normalizeWord matches Latin and Italian spellings of one sound", () => {
  assert.equal(p.normalizeWord("caeli"), p.normalizeWord("cieli"));
  assert.equal(p.normalizeWord("gratias"), p.normalizeWord("grazias"));
  assert.equal(p.normalizeWord("Christe"), p.normalizeWord("Criste"));
  assert.equal(p.normalizeWord("hominibus"), p.normalizeWord("ominibus"));
  assert.equal(p.normalizeWord("Kyrie"), p.normalizeWord("chirie"));
  assert.equal(p.normalizeWord("peccata"), p.normalizeWord("pecata"));
});

test("normalizeWord keeps ti after s, t or x", () => {
  assert.equal(p.normalizeWord("Christi"), "cristi");
  assert.equal(p.normalizeWord("bestia"), "bestia");
});

test("scoreAttempt gives full score for an exact attempt", () => {
  const r = p.scoreAttempt("Gloria in excelsis Deo,", "gloria in excelsis deo");
  assert.equal(r.score, 1);
});

test("scoreAttempt accepts Italian spellings of Latin words", () => {
  const r = p.scoreAttempt(
    "Pleni sunt caeli et terra gloria tua.",
    "pleni sunt cieli et terra gloria tua",
  );
  assert.equal(r.score, 1);
});

test("scoreAttempt marks missing words", () => {
  const r = p.scoreAttempt("Dona nobis pacem.", "dona");
  assert.deepEqual(
    r.words.map((w) => w.ok),
    [true, false, false],
  );
  assert.equal(r.score, 1 / 3);
});

test("bestAttempt picks the highest scoring alternative", () => {
  const r = p.bestAttempt("Agnus Dei", ["anno", "agnus dei"]);
  assert.equal(r.heard, "agnus dei");
});

test("hintText keeps first letters and punctuation", () => {
  assert.equal(p.hintText("Agnus Dei!"), "A____ D__!");
});

test("review scheduling moves through intervals then retires", () => {
  const today = 100;
  let entry = p.scheduleAgain({ key: "k", step: 3, due: 0 }, today);
  assert.deepEqual([entry.step, entry.due], [0, 101]);
  entry = p.scheduleKnown(entry, today);
  assert.deepEqual([entry.step, entry.due], [1, 103]);
  const last = { key: "k", step: p.REVIEW_INTERVALS_DAYS.length - 1, due: 0 };
  assert.equal(p.scheduleKnown(last, today), null);
});

const EMPTY = { day: null, count: 0, streak: 0, goalDay: null };

test("recordPractice resets the count on a new day", () => {
  const yesterday = p.recordPractice(EMPTY, 10, 3);
  const today = p.recordPractice(yesterday, 11, 3);
  assert.equal(p.todayCount(today, 11), 1);
  assert.equal(p.todayCount(today, 12), 0);
});

test("streak grows on consecutive goal days and breaks after a gap", () => {
  const reach = (progress, day) =>
    [1, 2].reduce((acc) => p.recordPractice(acc, day, 2), progress);
  let progress = reach(EMPTY, 10);
  assert.equal(p.currentStreak(progress, 10), 1);
  progress = reach(progress, 11);
  assert.equal(p.currentStreak(progress, 11), 2);
  assert.equal(p.currentStreak(progress, 12), 2);
  assert.equal(p.currentStreak(progress, 13), 0);
  progress = reach(progress, 13);
  assert.equal(p.currentStreak(progress, 13), 1);
});

test("going past the goal does not add to the streak twice", () => {
  const progress = [1, 2, 3, 4].reduce(
    (acc) => p.recordPractice(acc, 10, 2),
    EMPTY,
  );
  assert.deepEqual([progress.count, progress.streak], [4, 1]);
});

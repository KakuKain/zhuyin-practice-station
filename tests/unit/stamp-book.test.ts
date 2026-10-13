import assert from "node:assert/strict";
import test from "node:test";
import {
  addStamp,
  cardProgress,
  defaultRewardSettings,
  emptyStampBook,
  redeemCard,
  validateRewardSettings,
  validateStampBook,
  type StampBook,
  type StampInput,
} from "../../features/rewards/stamp-book";
import { childScopedKeys, ownsStorageKey, storageKeys } from "../../lib/storage/storage-keys";

const settings = { ...defaultRewardSettings, enabled: true, cardSize: 5, dailyCap: 3 };
const practice: StampInput = { kind: "practice", subject: "zhuyin", detail: "第一課 聽寫" };
const day = new Date(2026, 9, 13, 9).getTime();
const hour = 60 * 60 * 1000;

const stampMany = (book: StampBook, count: number, start: number, input = practice) => {
  let next = book;
  for (let index = 0; index < count; index++)
    next = addStamp(next, settings, input, start + index * 60_000, `s${start}${index}`).book;
  return next;
};

test("each finished practice is stamped until the day's stamps run out, without saying so", () => {
  const book = stampMany(emptyStampBook, 4, day);
  assert.deepEqual(
    book.log.map((entry) => entry.stamped),
    [true, true, true, false],
  );
  // The fourth practice is still in the parent's log; the card only shows three.
  assert.equal(cardProgress(book, settings).filled, 3);
  // A parent's 鼓勵章 is always stamped and does not use up the day's stamps.
  const cheered = addStamp(book, settings, {
    kind: "cheer",
    subject: "family",
    detail: "家長的鼓勵章",
    note: "今天自己主動來練習！",
  }).book;
  assert.equal(cheered.log.at(-1)!.stamped, true);
  assert.equal(cheered.log.at(-1)!.note, "今天自己主動來練習！");
  // The next day starts fresh.
  const tomorrow = addStamp(book, settings, practice, day + 24 * hour).book;
  assert.equal(tomorrow.log.at(-1)!.stamped, true);
});

test("a practice stamped once a day is not stamped again that day", () => {
  const once = { ...practice, detail: "第一課 默寫", key: "practice:0:默寫" };
  const first = addStamp(emptyStampBook, settings, once, day);
  assert.ok(first.entry);
  const again = addStamp(first.book, settings, once, day + hour);
  assert.equal(again.entry, null);
  assert.equal(again.book, first.book);
  assert.ok(addStamp(first.book, settings, once, day + 24 * hour).entry);
});

test("a full card waits for the child's choice; extra stamps move to the next card", () => {
  let book = stampMany(emptyStampBook, 3, day);
  book = stampMany(book, 3, day + 24 * hour);
  let progress = cardProgress(book, settings);
  assert.equal(progress.full, true);
  assert.equal(progress.filled, 5);
  assert.equal(progress.slots.length, 5);
  // Nothing happens before the card is full.
  const partial = stampMany(emptyStampBook, 2, day);
  assert.equal(redeemCard(partial, settings, "一起去公園玩"), partial);
  book = redeemCard(book, settings, "一起去公園玩", day + 25 * hour);
  progress = cardProgress(book, settings);
  assert.equal(progress.filled, 1);
  assert.equal(progress.full, false);
  assert.equal(progress.redeemed, 1);
  assert.deepEqual(book.redemptions[0], {
    at: day + 25 * hour,
    reward: "一起去公園玩",
    size: 5,
  });
});

test("a long log is trimmed without losing a stamp from the card", () => {
  let book = emptyStampBook;
  for (let index = 0; index < 650; index++)
    book = addStamp(
      book,
      { ...settings, dailyCap: 8 },
      practice,
      day + index * 4 * hour,
      `t${index}`,
    ).book;
  assert.equal(book.log.length, 600);
  assert.equal(book.archived, 50);
  const progress = cardProgress(book, { ...settings, cardSize: 10 });
  assert.equal(progress.filled, 10);
  // The card's slots come from entries still in the log, or are blank.
  assert.equal(progress.slots.length, 10);
});

test("saved stamps and settings are read leniently", () => {
  const book = validateStampBook({
    log: [
      { id: "a", at: day, kind: "fix", subject: "zhuyin", detail: "第一課 聽寫訂正「筆」" },
      { id: "b", at: "bad", kind: "practice" },
      { id: "c", at: day, kind: "steal" },
    ],
    redemptions: [{ at: day, reward: "一起玩桌遊", size: 10 }, null],
    cardStart: -4,
  });
  assert.equal(book.log.length, 1);
  assert.equal(book.log[0].stamped, true);
  assert.equal(book.redemptions.length, 1);
  assert.equal(book.cardStart, 0);
  assert.deepEqual(validateStampBook(null), emptyStampBook);

  const saved = validateRewardSettings({
    enabled: true,
    cardSize: 7,
    dailyCap: 8,
    rewards: [
      " 一起去公園玩 ",
      "一起去公園玩",
      "",
      3,
      "很長很長很長很長很長很長很長很長很長很長很長的獎勵",
    ],
  });
  assert.equal(saved.enabled, true);
  assert.equal(saved.cardSize, 10);
  assert.equal(saved.dailyCap, 8);
  assert.deepEqual(saved.rewards.slice(0, 1), ["一起去公園玩"]);
  assert.ok(saved.rewards.every((reward) => reward.length <= 20));
  assert.equal(validateRewardSettings(undefined).enabled, false);
});

test("each child has their own stamps; the family shares the settings; backup includes both", () => {
  assert.ok(childScopedKeys.has(storageKeys.stamps));
  assert.ok(!childScopedKeys.has(storageKeys.rewardSettings));
  assert.ok(ownsStorageKey(storageKeys.stamps));
  assert.ok(ownsStorageKey(`${storageKeys.stamps}@k2`));
  assert.ok(ownsStorageKey(storageKeys.rewardSettings));
  assert.ok(!ownsStorageKey(`${storageKeys.rewardSettings}@k2`));
});

/**
 * 集章卡: a child earns one stamp for finishing a practice, a 訂正之星 for correcting a question
 * they needed to practise, and a 鼓勵章 a parent gives with a note. Stamps never depend on getting
 * answers right, are never taken away, and are never compared between children. A full card lets
 * the child choose one of the rewards the parent listed, mostly time together.
 */
export type StampKind = "practice" | "fix" | "cheer";

export type StampEntry = {
  id: string;
  at: number;
  kind: StampKind;
  subject: "zhuyin" | "math" | "family";
  /** What was practised, for the parent's log: 「第五課 聽寫」. */
  detail: string;
  /** Questions marked 需要補強 in that practice, so a parent can see where to help. */
  needsPractice?: number;
  /** A 鼓勵章's message from the parent. */
  note?: string;
  /** Set for practices stamped once a day, such as re-confirming the same 默寫 check. */
  key?: string;
  /** False when the day's stamps were used up: the practice is logged, but fills no slot. */
  stamped: boolean;
};

export type Redemption = { at: number; reward: string; size: number };

export type StampBook = {
  version: 1;
  log: StampEntry[];
  redemptions: Redemption[];
  /** Stamps before the current card (all redeemed cards). */
  cardStart: number;
  /** Stamps whose log entries were trimmed, so cards still add up. */
  archived: number;
};

export type RewardSettings = {
  version: 1;
  enabled: boolean;
  cardSize: number;
  /** Automatic stamps a child can earn in a day; the child is never shown this number. */
  dailyCap: number;
  rewards: string[];
};

export const emptyStampBook: StampBook = {
  version: 1,
  log: [],
  redemptions: [],
  cardStart: 0,
  archived: 0,
};

export const cardSizes = [5, 10, 15, 20] as const;
export const dailyCaps = [3, 5, 8] as const;

export const defaultRewardSettings: RewardSettings = {
  version: 1,
  enabled: false,
  cardSize: 10,
  dailyCap: 5,
  rewards: [],
};

/** Starting ideas for parents: mostly time together, so practice is not only for things. */
export const rewardIdeas = [
  "一起去公園玩",
  "睡前多講一個故事",
  "週末選晚餐吃什麼",
  "一起玩桌遊",
  "一起烤餅乾",
  "選一部卡通一起看",
  "去圖書館借書",
  "一張喜歡的貼紙",
];
export const suggestedRewards = rewardIdeas.slice(0, 3);

const maxLog = 600;
const maxRewardLength = 20;
export const maxNoteLength = 40;

const text = (value: unknown, limit: number) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";
const count = (value: unknown) =>
  Number.isInteger(value) && (value as number) >= 0 ? (value as number) : 0;

function validEntry(raw: unknown): StampEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<Record<keyof StampEntry, unknown>>;
  if (!["practice", "fix", "cheer"].includes(item.kind as string)) return null;
  if (!Number.isFinite(item.at) || typeof item.id !== "string") return null;
  return {
    id: item.id,
    at: item.at as number,
    kind: item.kind as StampKind,
    subject: ["zhuyin", "math", "family"].includes(item.subject as string)
      ? (item.subject as StampEntry["subject"])
      : "zhuyin",
    detail: text(item.detail, 60),
    ...(Number.isInteger(item.needsPractice) ? { needsPractice: count(item.needsPractice) } : {}),
    ...(item.note ? { note: text(item.note, maxNoteLength) } : {}),
    ...(typeof item.key === "string" ? { key: item.key.slice(0, 80) } : {}),
    stamped: item.stamped !== false,
  };
}

/** Lenient: damaged entries are dropped, the rest of the book is kept. */
export function validateStampBook(raw: unknown): StampBook {
  if (!raw || typeof raw !== "object") return emptyStampBook;
  const value = raw as Partial<Record<keyof StampBook, unknown>>;
  const log = Array.isArray(value.log)
    ? value.log.map(validEntry).filter((entry): entry is StampEntry => entry !== null)
    : [];
  const redemptions = Array.isArray(value.redemptions)
    ? value.redemptions.flatMap((item) => {
        const redemption = item as Partial<Redemption> | null;
        return redemption && Number.isFinite(redemption.at)
          ? [
              {
                at: redemption.at!,
                reward: text(redemption.reward, maxRewardLength),
                size: count(redemption.size) || 10,
              },
            ]
          : [];
      })
    : [];
  return {
    version: 1,
    log,
    redemptions,
    cardStart: count(value.cardStart),
    archived: count(value.archived),
  };
}

export function validateRewardSettings(raw: unknown): RewardSettings {
  if (!raw || typeof raw !== "object") return defaultRewardSettings;
  const value = raw as Partial<Record<keyof RewardSettings, unknown>>;
  const rewards = Array.isArray(value.rewards)
    ? [...new Set(value.rewards.map((reward) => text(reward, maxRewardLength)).filter(Boolean))]
    : [];
  return {
    version: 1,
    enabled: value.enabled === true,
    cardSize: cardSizes.includes(value.cardSize as never) ? (value.cardSize as number) : 10,
    dailyCap: dailyCaps.includes(value.dailyCap as never) ? (value.dailyCap as number) : 5,
    rewards: rewards.slice(0, 12),
  };
}

export const sameDay = (a: number, b: number) =>
  new Date(a).toDateString() === new Date(b).toDateString();

/** Stamps on the books, including ones whose log entries were trimmed. */
export const stampTotal = (book: StampBook) =>
  book.archived + book.log.filter((entry) => entry.stamped).length;

/** Automatic stamps already earned today; a parent's 鼓勵章 never counts. */
export const automaticToday = (book: StampBook, now: number) =>
  book.log.filter((entry) => entry.stamped && entry.kind !== "cheer" && sameDay(entry.at, now))
    .length;

export type StampInput = Pick<StampEntry, "kind" | "subject" | "detail"> &
  Partial<Pick<StampEntry, "needsPractice" | "note" | "key">>;

/**
 * Logs a practice and stamps it while the day's stamps last; a 鼓勵章 is always stamped. A
 * practice with a key that was already logged today is ignored.
 */
export function addStamp(
  book: StampBook,
  settings: RewardSettings,
  input: StampInput,
  now = Date.now(),
  id = `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
): { book: StampBook; entry: StampEntry | null } {
  if (input.key && book.log.some((item) => item.key === input.key && sameDay(item.at, now)))
    return { book, entry: null };
  const entry: StampEntry = {
    id,
    at: now,
    ...input,
    detail: input.detail.slice(0, 60),
    ...(input.note ? { note: input.note.trim().slice(0, maxNoteLength) } : {}),
    stamped: input.kind === "cheer" || automaticToday(book, now) < settings.dailyCap,
  };
  let log = [...book.log, entry];
  let archived = book.archived;
  if (log.length > maxLog) {
    const dropped = log.slice(0, log.length - maxLog);
    archived += dropped.filter((item) => item.stamped).length;
    log = log.slice(-maxLog);
  }
  return { book: { ...book, log, archived }, entry };
}

export type CardProgress = {
  size: number;
  /** Stamps on the current card, at most its size. */
  filled: number;
  full: boolean;
  /** The current card's stamps, oldest first; slots from trimmed entries are null. */
  slots: (StampEntry | null)[];
  /** Cards completed and rewarded so far. */
  redeemed: number;
};

export function cardProgress(book: StampBook, settings: RewardSettings): CardProgress {
  const size = settings.cardSize;
  const stamped = book.log.filter((entry) => entry.stamped);
  const onCard = Math.max(0, stampTotal(book) - book.cardStart);
  const filled = Math.min(onCard, size);
  // Global stamp numbers of this card, mapped back to the entries still in the log.
  const first = book.cardStart;
  const slots = Array.from({ length: filled }, (_, slot) => {
    const index = first + slot - book.archived;
    return index >= 0 ? (stamped[index] ?? null) : null;
  });
  return { size, filled, full: filled >= size, slots, redeemed: book.redemptions.length };
}

/** The child chose a reward for a full card; any extra stamps move to the next card. */
export function redeemCard(
  book: StampBook,
  settings: RewardSettings,
  reward: string,
  now = Date.now(),
): StampBook {
  if (!cardProgress(book, settings).full) return book;
  return {
    ...book,
    cardStart: book.cardStart + settings.cardSize,
    redemptions: [...book.redemptions, { at: now, reward, size: settings.cardSize }],
  };
}

/** What a 注音 flow reports when a practice ends; the app adds the lesson's name. */
export type LessonStamp = {
  kind?: "practice" | "fix";
  lessonIndex: number;
  /** 「聽寫」, 「默寫」, 「訂正 筆」. */
  activity: string;
  needsPractice?: number;
  /** Stamp this activity on this lesson at most once a day. */
  oncePerDay?: boolean;
};
export type AwardLessonStamp = (stamp: LessonStamp) => void;

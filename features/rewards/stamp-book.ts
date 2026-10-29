/**
 * 集章卡: a child earns one stamp for finishing a practice, a 訂正之星 for correcting a question
 * they needed to practise, and a 鼓勵章 a parent gives with a note. Stamps never depend on getting
 * answers right, are never taken away, and are never compared between children. A full card lets
 * the child choose one of the rewards the parent listed, mostly time together. A parent can also
 * set 今天的任務 from what needs help; finishing one earns a 任務章.
 */
export type StampKind = "practice" | "fix" | "cheer" | "task";
const stampKinds: readonly StampKind[] = ["practice", "fix", "cheer", "task"];

export type StampEntry = {
  id: string;
  at: number;
  kind: StampKind;
  subject: "zhuyin" | "math" | "english" | "family";
  /** What was practised, for the parent's log: 「第五課 聽寫」. */
  detail: string;
  /** Questions marked 需要補強 in that practice, so a parent can see where to help. */
  needsPractice?: number;
  /** A 鼓勵章's message from the parent. */
  note?: string;
  /** Set for practices stamped once a day, such as re-confirming the same 默寫 check. */
  key?: string;
  /** Which 今天的任務 this practice finishes: 「zhuyin:4:listening」, 「math:2」, 「english:1:tap」. */
  taskKey?: string;
  /** False when the day's stamps were used up: the practice is logged, but fills no slot. */
  stamped: boolean;
};

/** A practice the parent asked for, from what the log shows needs help. */
export type DailyTask = {
  id: string;
  /** The practice that finishes it, matched against a stamp's taskKey. */
  key: string;
  /** 「第五課」, 「數學第二課」, or the name of a parent's own lesson. */
  place: string;
  /** 「聽寫」, 「默寫」, 「比一比」. */
  activity: string;
  /** Built-in names are shown in 國字注音; a parent's own lesson name is shown as typed. */
  annotate: boolean;
  at: number;
  doneAt?: number;
};
export const maxOpenTasks = 3;

export type Redemption = { at: number; reward: string; size: number };

export type StampBook = {
  version: 1;
  log: StampEntry[];
  redemptions: Redemption[];
  /** Stamps before the current card (all redeemed cards). */
  cardStart: number;
  /** Stamps whose log entries were trimmed, so cards still add up. */
  archived: number;
  tasks: DailyTask[];
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
  tasks: [],
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
  if (!stampKinds.includes(item.kind as StampKind)) return null;
  if (!Number.isFinite(item.at) || typeof item.id !== "string") return null;
  return {
    id: item.id,
    at: item.at as number,
    kind: item.kind as StampKind,
    subject: ["zhuyin", "math", "english", "family"].includes(item.subject as string)
      ? (item.subject as StampEntry["subject"])
      : "zhuyin",
    detail: text(item.detail, 60),
    ...(Number.isInteger(item.needsPractice) ? { needsPractice: count(item.needsPractice) } : {}),
    ...(item.note ? { note: text(item.note, maxNoteLength) } : {}),
    ...(typeof item.key === "string" ? { key: item.key.slice(0, 80) } : {}),
    ...(typeof item.taskKey === "string" ? { taskKey: item.taskKey.slice(0, 40) } : {}),
    stamped: item.stamped !== false,
  };
}

function validTask(raw: unknown): DailyTask | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<Record<keyof DailyTask, unknown>>;
  if (typeof item.id !== "string" || typeof item.key !== "string" || !Number.isFinite(item.at))
    return null;
  return {
    id: item.id,
    key: item.key.slice(0, 40),
    place: text(item.place, 30),
    activity: text(item.activity, 20),
    annotate: item.annotate === true,
    at: item.at as number,
    ...(Number.isFinite(item.doneAt) ? { doneAt: item.doneAt as number } : {}),
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
    tasks: Array.isArray(value.tasks)
      ? value.tasks.map(validTask).filter((task): task is DailyTask => task !== null)
      : [],
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

/** A 鼓勵章 or 任務章 is always stamped and never uses up the day's stamps. */
const alwaysStamped = (kind: StampKind) => kind === "cheer" || kind === "task";

/** Automatic stamps already earned today. */
export const automaticToday = (book: StampBook, now: number) =>
  book.log.filter((entry) => entry.stamped && !alwaysStamped(entry.kind) && sameDay(entry.at, now))
    .length;

export type StampInput = Pick<StampEntry, "kind" | "subject" | "detail"> &
  Partial<Pick<StampEntry, "needsPractice" | "note" | "key" | "taskKey">>;

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
    stamped: alwaysStamped(input.kind) || automaticToday(book, now) < settings.dailyCap,
  };
  return { book: appendEntry(book, entry), entry };
}

function appendEntry(book: StampBook, entry: StampEntry): StampBook {
  let log = [...book.log, entry];
  let archived = book.archived;
  if (log.length > maxLog) {
    const dropped = log.slice(0, log.length - maxLog);
    archived += dropped.filter((item) => item.stamped).length;
    log = log.slice(-maxLog);
  }
  return { ...book, log, archived };
}

/** Tasks still to do, and ones finished today so the child sees them done. */
export const visibleTasks = (book: StampBook, now = Date.now()) =>
  book.tasks.filter((task) => task.doneAt === undefined || sameDay(task.doneAt, now));
export const openTasks = (book: StampBook) =>
  book.tasks.filter((task) => task.doneAt === undefined);

/** Adds a task unless the same practice is already asked for or three are open. */
export function addTask(
  book: StampBook,
  task: Omit<DailyTask, "id" | "at" | "doneAt">,
  now = Date.now(),
  id = `t${now.toString(36)}${Math.random().toString(36).slice(2, 5)}`,
): StampBook {
  const open = openTasks(book);
  if (open.length >= maxOpenTasks || open.some((item) => item.key === task.key)) return book;
  return { ...book, tasks: [...visibleTasks(book, now), { ...task, id, at: now }] };
}

export const removeTask = (book: StampBook, id: string): StampBook => ({
  ...book,
  tasks: book.tasks.filter((task) => task.id !== id),
});

/** A practice that matches an open task finishes it and earns a 任務章. */
export function completeTask(
  book: StampBook,
  taskKey: string,
  subject: StampEntry["subject"],
  now = Date.now(),
  id = `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}k`,
): { book: StampBook; entry: StampEntry | null } {
  const task = openTasks(book).find((item) => item.key === taskKey);
  if (!task) return { book, entry: null };
  const entry: StampEntry = {
    id,
    at: now,
    kind: "task",
    subject,
    detail: `今天的任務：${task.place} ${task.activity}`.trim(),
    taskKey,
    stamped: true,
  };
  const tasks = book.tasks.map((item) => (item.id === task.id ? { ...item, doneAt: now } : item));
  return { book: appendEntry({ ...book, tasks }, entry), entry };
}

/**
 * Recent practices with questions marked 需要補強, newest first, one per practice: what a parent
 * may want to set as a task. Practices already set as open tasks are left out.
 */
export function taskSuggestions(book: StampBook, now = Date.now(), days = 14) {
  const open = new Set(openTasks(book).map((task) => task.key));
  const seen = new Set<string>();
  const suggestions: { taskKey: string; detail: string; needsPractice: number; at: number }[] = [];
  for (const entry of [...book.log].reverse()) {
    if (now - entry.at > days * 24 * 60 * 60 * 1000) break;
    if (entry.kind !== "practice" || !entry.taskKey || !entry.needsPractice) continue;
    if (open.has(entry.taskKey) || seen.has(entry.taskKey)) continue;
    seen.add(entry.taskKey);
    suggestions.push({
      taskKey: entry.taskKey,
      detail: entry.detail,
      needsPractice: entry.needsPractice,
      at: entry.at,
    });
  }
  return suggestions.slice(0, 4);
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
  /** The whole-lesson practice, for matching 今天的任務. */
  task?: "listening" | "fill";
  needsPractice?: number;
  /** Stamp this activity on this lesson at most once a day. */
  oncePerDay?: boolean;
};
export type AwardLessonStamp = (stamp: LessonStamp) => void;

/** The task keys practices report, so a task set by the parent is finished by the right one. */
export const taskKeys = {
  lesson: (lessonIndex: number, task: "listening" | "fill") => `zhuyin:${lessonIndex}:${task}`,
  math: (lessonId: number) => `math:${lessonId}`,
  english: (lessonId: number, mode: "tap" | "write") => `english:${lessonId}:${mode}`,
  sound: "sound",
  fix: "fix",
} as const;

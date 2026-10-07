export type View =
  | "courses"
  | "symbols"
  | "practice"
  | "more"
  | "lesson"
  | "fill"
  | "fill-practice"
  | "listen"
  | "result";

export type ListenPhase =
  | "ready"
  | "active"
  | "batch_review"
  | "review"
  | "remediation_offer"
  | "choice"
  | "retry_ready"
  | "retry";

export type ParentResult = "correct" | "needs_review" | null;

export type PreviewMode = "annotated" | "zhuyin";

export type SyllableItem = { character: string; zhuyin: string };

export type ListenCategory = "symbols" | "characters" | "words";

export type ListeningSeed = {
  category: ListenCategory;
  answer: string;
  audioText: string;
  distractors: readonly string[];
};

export type ListeningQuestion = ListeningSeed & { id: string; choices: readonly string[] };

export type LessonExercise = {
  lines: readonly (readonly SyllableItem[])[];
  questions: readonly ListeningSeed[];
};

export type InkPoint = { x: number; y: number };

export type InkStroke = InkPoint[];

export type FillDraft = {
  version: 1;
  lessonIndex: number;
  savedAt: number;
  strokes: Record<number, InkStroke[]>;
  pendingCells: Record<number, InkStroke[]>;
  needsRetry: number[];
  reviewOpen: boolean;
};

export type SavedQuestion = {
  lessonIndex: number;
  questionId: string;
  isFavorite: boolean;
  needsPractice: boolean;
};

export type PracticeSession = {
  id: string;
  lessonIndex: number;
  mode: "fill" | "listening" | "single";
  completedAt: number;
  answeredUnits: number;
  correctUnits: number;
  pendingQuestions: number;
};

export type FillFavorite = {
  lessonIndex: number;
  character: string;
  zhuyin: string;
  positions: number[];
  status: "needs_rewrite" | "review_later" | "mastered";
  /** Missing in legacy v1 records; migration preserves those stars. */
  isFavorite?: boolean;
};

export type PracticeState = {
  savedQuestions: SavedQuestion[];
  recentLesson: number | null;
  completedSessions: number;
  history: PracticeSession[];
};

export type ListeningSettings = {
  repeatCount: 1 | 2 | 3;
  intervalSeconds: 5 | 8 | 10;
  answerTime: "standard" | "relaxed";
};

export type MorePanel =
  "home" | "help" | "listening" | "audio" | "versions" | "materials" | "backup";

export type StateSetter<T> = import("react").Dispatch<import("react").SetStateAction<T>>;

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpenText, Gear, Headphones, Heart, House, Info, Lightbulb, MusicNotes, Notebook, PencilLine, Play, Question, SpeakerHigh, Timer } from "@phosphor-icons/react";

type View = "home" | "courses" | "practice" | "more" | "lesson" | "fill" | "listen" | "result";
type ListenPhase = "ready" | "active" | "review" | "remediation_offer" | "choice" | "retry_ready" | "retry";
type ParentResult = "correct" | "needs_review" | null;
type PreviewMode = "annotated" | "zhuyin";
type SyllableItem = { character: string; zhuyin: string };
type ListenCategory = "symbols" | "characters" | "words";
type ListeningSeed = { category: ListenCategory; answer: string; audioText: string; distractors: readonly string[] };
type ListeningQuestion = ListeningSeed & { id: string; choices: readonly string[] };
type LessonExercise = { lines: readonly (readonly SyllableItem[])[]; questions: readonly ListeningSeed[] };
type InkPoint = { x: number; y: number };
type InkStroke = InkPoint[];
type SavedQuestion = { lessonIndex: number; questionId: string; needsPractice?: boolean };
type PracticeState = { savedQuestions: SavedQuestion[]; recentLesson: number | null; completedSessions: number };
type ListeningSettings = { repeatCount: 1 | 2 | 3; intervalSeconds: 5 | 8 | 10 };
const practiceStorageKey = "zhuyin-practice-state-v3";
const listeningSettingsStorageKey = "zhuyin-listening-settings-v1";
const defaultListeningSettings: ListeningSettings = { repeatCount: 2, intervalSeconds: 8 };
const previousPracticeStorageKey = "zhuyin-practice-state-v2";
const firstPracticeStorageKey = "zhuyin-practice-state-v1";

const lessons = [
  { title: "貓咪", lines: ["咪咪咪", "咪咪咪", "逼", "貓咪弟弟", "跑第一"], symbols: ["ㄅ", "ㄆ", "ㄇ", "ㄉ", "ㄧ", "ㄠ"] },
  { title: "鵝寶寶", lines: ["鵝鵝鵝", "鵝鵝鵝", "哈哈哈", "好得意", "孵出", "五隻鵝寶寶"], symbols: ["ㄈ", "ㄏ", "ㄓ", "ㄔ", "ㄨ", "ㄚ", "ㄜ"] },
  { title: "河馬和河狸", lines: ["河馬要去泡澡", "半路遇到河狸", "喔", "河狸", "忙著築巢"], symbols: ["ㄌ", "ㄑ", "ㄗ", "ㄩ", "ㄛ", "ㄢ", "ㄤ"] },
] as const;

// The font's first alternate reading is selected with IVS U+E01E1 in both preview modes.
const previewPronunciationVariants: Record<number, Record<number, Record<number, string>>> = {
  0: { 3: { 3: "\u{E01E1}" } }, // 貓咪弟弟：第二個「弟」讀輕聲
  1: { 5: { 4: "\u{E01E1}" } }, // 五隻鵝寶寶：第二個「寶」依課本讀輕聲
};

const firstLessonLines = [
  [{ character: "咪", zhuyin: "ㄇㄧ" }, { character: "咪", zhuyin: "ㄇㄧ" }, { character: "咪", zhuyin: "ㄇㄧ" }],
  [{ character: "咪", zhuyin: "ㄇㄧ" }, { character: "咪", zhuyin: "ㄇㄧ" }, { character: "咪", zhuyin: "ㄇㄧ" }],
  [{ character: "逼", zhuyin: "ㄅㄧ" }],
  [{ character: "貓", zhuyin: "ㄇㄠ" }, { character: "咪", zhuyin: "ㄇㄧ" }, { character: "弟", zhuyin: "ㄉㄧˋ" }, { character: "弟", zhuyin: "˙ㄉㄧ" }],
  [{ character: "跑", zhuyin: "ㄆㄠˇ" }, { character: "第", zhuyin: "ㄉㄧˋ" }, { character: "一", zhuyin: "ㄧ" }],
] as const;
const secondLessonLines = [
  [{ character: "鵝", zhuyin: "ㄜˊ" }, { character: "鵝", zhuyin: "ㄜˊ" }, { character: "鵝", zhuyin: "ㄜˊ" }],
  [{ character: "鵝", zhuyin: "ㄜˊ" }, { character: "鵝", zhuyin: "ㄜˊ" }, { character: "鵝", zhuyin: "ㄜˊ" }],
  [{ character: "哈", zhuyin: "ㄏㄚ" }, { character: "哈", zhuyin: "ㄏㄚ" }, { character: "哈", zhuyin: "ㄏㄚ" }],
  [{ character: "好", zhuyin: "ㄏㄠˇ" }, { character: "得", zhuyin: "ㄉㄜˊ" }, { character: "意", zhuyin: "ㄧˋ" }],
  [{ character: "孵", zhuyin: "ㄈㄨ" }, { character: "出", zhuyin: "ㄔㄨ" }],
  [{ character: "五", zhuyin: "ㄨˇ" }, { character: "隻", zhuyin: "ㄓ" }, { character: "鵝", zhuyin: "ㄜˊ" }, { character: "寶", zhuyin: "ㄅㄠˇ" }, { character: "寶", zhuyin: "˙ㄅㄠ" }],
] as const;
const thirdLessonLines = [
  [{ character: "河", zhuyin: "ㄏㄜˊ" }, { character: "馬", zhuyin: "ㄇㄚˇ" }, { character: "要", zhuyin: "ㄧㄠˋ" }, { character: "去", zhuyin: "ㄑㄩˋ" }, { character: "泡", zhuyin: "ㄆㄠˋ" }, { character: "澡", zhuyin: "ㄗㄠˇ" }],
  [{ character: "半", zhuyin: "ㄅㄢˋ" }, { character: "路", zhuyin: "ㄌㄨˋ" }, { character: "遇", zhuyin: "ㄩˋ" }, { character: "到", zhuyin: "ㄉㄠˋ" }, { character: "河", zhuyin: "ㄏㄜˊ" }, { character: "狸", zhuyin: "ㄌㄧˊ" }],
  [{ character: "喔", zhuyin: "ㄛ" }],
  [{ character: "河", zhuyin: "ㄏㄜˊ" }, { character: "狸", zhuyin: "ㄌㄧˊ" }],
  [{ character: "忙", zhuyin: "ㄇㄤˊ" }, { character: "著", zhuyin: "˙ㄓㄜ" }, { character: "築", zhuyin: "ㄓㄨˊ" }, { character: "巢", zhuyin: "ㄔㄠˊ" }],
] as const;

const firstListeningQuestions = [
  { category: "symbols", answer: "ㄅ", audioText: "ㄅ", distractors: ["ㄆ", "ㄇ"] },
  { category: "symbols", answer: "ㄆ", audioText: "ㄆ", distractors: ["ㄅ", "ㄉ"] },
  { category: "symbols", answer: "ㄇ", audioText: "ㄇ", distractors: ["ㄅ", "ㄆ"] },
  { category: "symbols", answer: "ㄉ", audioText: "ㄉ", distractors: ["ㄇ", "ㄅ"] },
  { category: "characters", answer: "ㄇㄠ", audioText: "貓", distractors: ["ㄇㄧ", "ㄆㄠˇ"] },
  { category: "characters", answer: "ㄇㄧ", audioText: "咪", distractors: ["ㄇㄠ", "ㄅㄧ"] },
  { category: "characters", answer: "ㄉㄧˋ", audioText: "弟", distractors: ["˙ㄉㄧ", "ㄧ"] },
  { category: "characters", answer: "ㄆㄠˇ", audioText: "跑", distractors: ["ㄆㄠˊ", "ㄆㄠˋ"] },
  { category: "words", answer: "ㄇㄠ|ㄇㄧ", audioText: "貓咪", distractors: ["ㄇㄠ|ㄇㄠ", "ㄇㄧ|ㄇㄧ"] },
  { category: "words", answer: "ㄉㄧˋ|˙ㄉㄧ", audioText: "弟弟", distractors: ["ㄉㄧˋ|ㄉㄧˋ", "˙ㄉㄧ|ㄉㄧˋ"] },
] as const;
const secondListeningQuestions = [
  { category: "symbols", answer: "ㄈ", audioText: "ㄈ", distractors: ["ㄏ", "ㄓ"] },
  { category: "symbols", answer: "ㄏ", audioText: "ㄏ", distractors: ["ㄈ", "ㄔ"] },
  { category: "symbols", answer: "ㄓ", audioText: "ㄓ", distractors: ["ㄔ", "ㄏ"] },
  { category: "symbols", answer: "ㄔ", audioText: "ㄔ", distractors: ["ㄓ", "ㄈ"] },
  { category: "characters", answer: "ㄜˊ", audioText: "鵝", distractors: ["ㄅㄠˇ", "ㄏㄚ"] },
  { category: "characters", answer: "ㄅㄠˇ", audioText: "寶", distractors: ["˙ㄅㄠ", "ㄏㄠˇ"] },
  { category: "characters", answer: "ㄈㄨ", audioText: "孵", distractors: ["ㄔㄨ", "ㄨˇ"] },
  { category: "characters", answer: "ㄧˋ", audioText: "意", distractors: ["ㄧ", "ㄜˊ"] },
  { category: "words", answer: "ㄅㄠˇ|˙ㄅㄠ", audioText: "寶寶", distractors: ["ㄅㄠˇ|ㄅㄠˇ", "˙ㄅㄠ|ㄅㄠˇ"] },
  { category: "words", answer: "ㄈㄨ|ㄔㄨ", audioText: "孵出", distractors: ["ㄈㄨ|ㄈㄨ", "ㄔㄨ|ㄈㄨ"] },
] as const;
const thirdListeningQuestions = [
  { category: "symbols", answer: "ㄌ", audioText: "ㄌ", distractors: ["ㄑ", "ㄗ"] },
  { category: "symbols", answer: "ㄑ", audioText: "ㄑ", distractors: ["ㄌ", "ㄩ"] },
  { category: "symbols", answer: "ㄗ", audioText: "ㄗ", distractors: ["ㄌ", "ㄑ"] },
  { category: "symbols", answer: "ㄩ", audioText: "ㄩ", distractors: ["ㄗ", "ㄑ"] },
  { category: "characters", answer: "ㄑㄩˋ", audioText: "去", distractors: ["ㄑㄩ", "ㄑㄩˇ"] },
  { category: "characters", answer: "ㄗㄠˇ", audioText: "澡", distractors: ["ㄗㄠ", "ㄗㄠˋ"] },
  { category: "characters", answer: "ㄔㄠˊ", audioText: "巢", distractors: ["ㄔㄠ", "ㄔㄠˇ"] },
  { category: "characters", answer: "ㄏㄜˊ", audioText: "河", distractors: ["ㄌㄧˊ", "ㄇㄚˇ"] },
  { category: "words", answer: "ㄏㄜˊ|ㄇㄚˇ", audioText: "河馬", distractors: ["ㄏㄜˊ|ㄌㄧˊ", "ㄇㄚˇ|ㄏㄜˊ"] },
  { category: "words", answer: "ㄏㄜˊ|ㄌㄧˊ", audioText: "河狸", distractors: ["ㄏㄜˊ|ㄇㄚˇ", "ㄌㄧˊ|ㄏㄜˊ"] },
] as const;

const exercises: Record<number, LessonExercise> = {
  0: { lines: firstLessonLines, questions: firstListeningQuestions },
  1: { lines: secondLessonLines, questions: secondListeningQuestions },
  2: { lines: thirdLessonLines, questions: thirdListeningQuestions },
};

const extraWordQuestions: Record<number, readonly ListeningSeed[]> = {
  0: [{ category: "words", answer: "ㄉㄧˋ|ㄧ", audioText: "第一", distractors: ["ㄉㄧˋ|ㄇㄧ", "ㄆㄠˇ|ㄧ"] }],
  1: [{ category: "words", answer: "ㄉㄜˊ|ㄧˋ", audioText: "得意", distractors: ["ㄉㄜˊ|ㄜˊ", "ㄈㄨ|ㄧˋ"] }],
  2: [
    { category: "words", answer: "ㄆㄠˋ|ㄗㄠˇ", audioText: "泡澡", distractors: ["ㄆㄠˊ|ㄗㄠˇ", "ㄆㄠˋ|ㄗㄠˋ"] },
    { category: "words", answer: "ㄅㄢˋ|ㄌㄨˋ", audioText: "半路", distractors: ["ㄅㄢˋ|ㄌㄧˊ", "ㄏㄜˊ|ㄌㄨˋ"] },
    { category: "words", answer: "ㄩˋ|ㄉㄠˋ", audioText: "遇到", distractors: ["ㄩˋ|ㄗㄠˇ", "ㄑㄩˋ|ㄉㄠˋ"] },
    { category: "words", answer: "ㄓㄨˊ|ㄔㄠˊ", audioText: "築巢", distractors: ["ㄓㄨˊ|ㄗㄠˇ", "ㄔㄠˊ|ㄓㄨˊ"] },
  ],
};

function shuffleItems<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function questionId(question: ListeningSeed): string {
  return `${question.category}:${question.audioText}`;
}

function questionSeedsForLesson(lessonIndex: number): Record<ListenCategory, ListeningSeed[]> {
  const lesson = lessons[lessonIndex] ?? lessons[0];
  const exercise = exercises[lessonIndex] ?? exercises[0];
  const symbols: ListeningSeed[] = lesson.symbols.map((symbol) => ({
    category: "symbols", answer: symbol, audioText: symbol,
    distractors: lesson.symbols.filter((other) => other !== symbol).slice(0, 2),
  }));
  const uniqueCharacters = [...new Map(exercise.lines.flat().map((item) => [item.character, item])).values()];
  const uniqueSounds = [...new Set(uniqueCharacters.map((item) => item.zhuyin))];
  const characters: ListeningSeed[] = uniqueCharacters.map((item) => ({
    category: "characters", answer: item.zhuyin, audioText: item.character,
    distractors: uniqueSounds.filter((sound) => sound !== item.zhuyin).slice(0, 2),
  }));
  const words = [...exercise.questions.filter((question) => question.category === "words"), ...(extraWordQuestions[lessonIndex] ?? [])];
  return { symbols, characters, words };
}

function makeQuestion(seed: ListeningSeed): ListeningQuestion {
  return { ...seed, id: questionId(seed), choices: shuffleItems([seed.answer, ...seed.distractors]) };
}

function buildListeningSession(lessonIndex: number): ListeningQuestion[] {
  const pools = questionSeedsForLesson(lessonIndex);
  return [
    ...shuffleItems(pools.symbols).slice(0, 4),
    ...shuffleItems(pools.characters).slice(0, 4),
    ...shuffleItems(pools.words).slice(0, 2),
  ].map(makeQuestion);
}

function findQuestionSeed(lessonIndex: number, id: string): ListeningSeed | undefined {
  const pools = questionSeedsForLesson(lessonIndex);
  return [...pools.symbols, ...pools.characters, ...pools.words].find((question) => questionId(question) === id);
}

const fallbackListeningQuestion: ListeningQuestion = { ...firstListeningQuestions[0], id: "symbols:ㄅ", choices: ["ㄅ", "ㄆ", "ㄇ"] };

// This font draws the complete vertical syllable (including its tone) from a
// representative Han character. Rendering individual Bopomofo characters would
// discard the font's built-in tone placement.
const syllableGlyphs: Record<string, string> = {
  ...Object.fromEntries([firstLessonLines, secondLessonLines, thirdLessonLines].flat(2).map(({ character, zhuyin }) => [zhuyin, character])),
  "˙ㄅㄠ": "寶\u{E01E1}",
  "ㄇㄠˊ": "毛",
  "ㄇㄠˇ": "卯",
  "ㄇㄧˊ": "迷",
  "ㄇㄧˇ": "米",
  "ㄆㄠˊ": "袍",
  "ㄆㄠˋ": "泡",
  "ㄑㄩ": "區",
  "ㄑㄩˇ": "取",
  "ㄗㄠ": "遭",
  "ㄗㄠˋ": "造",
  "ㄔㄠ": "超",
  "ㄔㄠˇ": "炒",
};

function ZhuyinStack({ text }: { text: string }) {
  return (
    <span className="zhuyin-stack" aria-label={text}>
      <span className={`zhuyin-glyph ${text === "˙ㄉㄧ" ? "is-neutral-di" : ""} ${text.length === 1 ? "is-symbol" : ""}`} aria-hidden="true">{syllableGlyphs[text] ?? text}</span>
    </span>
  );
}

function AnswerDisplay({ answer }: { answer: string }) {
  return <span className={`answer-display ${answer.includes("|") ? "is-word" : ""}`}>{answer.split("|").map((syllable, index) => <ZhuyinStack text={syllable} key={`${index}-${syllable}`} />)}</span>;
}

const listenCategoryLabels: Record<ListenCategory, string> = { symbols: "第一大題 · 注音符號", characters: "第二大題 · 生字", words: "第三大題 · 語詞" };
const legacySavedQuestionIndexes: Record<number, readonly number[]> = { 0: [4, 5, 7], 2: [4, 5, 6] };

function InkPreview({ strokes }: { strokes: InkStroke[] }) {
  return <svg viewBox="0 0 100 100" className="ink-preview" aria-hidden="true">{strokes.map((stroke, index) => stroke.length === 1
    ? <circle key={index} cx={stroke[0].x} cy={stroke[0].y} r="1.5" />
    : <polyline key={index} points={stroke.map((point) => `${point.x},${point.y}`).join(" ")} />)}</svg>;
}

function Logo() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <span>ㄅ</span>
      <i />
    </span>
  );
}

function AppHeader({ onHome, onBackToCourses }: { onHome: () => void; onBackToCourses?: () => void }) {
  return (
    <header className={`app-header ${onBackToCourses ? "has-back" : ""}`}>
      {onBackToCourses && <button className="header-back" type="button" onClick={onBackToCourses}><ArrowLeft size={18} weight="bold" aria-hidden="true" /><span>回到課程</span></button>}
      <button className="brand-button" type="button" onClick={onHome} aria-label="回到首頁">
        <Logo />
        <span>
          <strong>注音小練習</strong>
          <small>一年級學習站</small>
        </span>
      </button>
      {!onBackToCourses && <div className="header-chip"><span className="status-dot" /> 不用登入也能練</div>}
    </header>
  );
}

function BottomNav({ active, onNavigate }: { active: View; onNavigate: (view: View) => void }) {
  const items = [
    { id: "home" as View, Icon: House, label: "首頁" },
    { id: "courses" as View, Icon: BookOpenText, label: "課程" },
    { id: "practice" as View, Icon: PencilLine, label: "練習" },
    { id: "more" as View, Icon: Gear, label: "更多" },
  ];

  return (
    <nav className="bottom-nav" aria-label="主要導覽">
      {items.map((item) => (
        <button key={item.id} type="button" className={active === item.id ? "active" : ""} onClick={() => onNavigate(item.id)}>
          <span className="nav-icon" aria-hidden="true"><item.Icon size={22} weight={active === item.id ? "fill" : "regular"} /></span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="section-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}

export default function Page() {
  const [view, setView] = useState<View>("home");
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("annotated");
  const [fillStrokes, setFillStrokes] = useState<Record<number, InkStroke[]>>({});
  const [activeFillCell, setActiveFillCell] = useState<number | null>(null);
  const [fillReviewOpen, setFillReviewOpen] = useState(false);
  const [fillNeedsRetry, setFillNeedsRetry] = useState<number[]>([]);
  const [fillParentChecked, setFillParentChecked] = useState(false);
  const [fillHasInk, setFillHasInk] = useState(false);
  const [fillIsDirty, setFillIsDirty] = useState(false);
  const [listenIndex, setListenIndex] = useState(0);
  const [sessionQuestions, setSessionQuestions] = useState<ListeningQuestion[]>([]);
  const [listenPhase, setListenPhase] = useState<ListenPhase>("ready");
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [playCount, setPlayCount] = useState(0);
  const [listenMessage, setListenMessage] = useState("按下「開始聽」才會播放題目。時間會從這裡開始倒數。 ");
  const [retryMessage, setRetryMessage] = useState("");
  const [sessionScore, setSessionScore] = useState({ listeningCorrect: 0 });
  const [reviewedIndexes, setReviewedIndexes] = useState<number[]>([]);
  const [practiceState, setPracticeState] = useState<PracticeState>({ savedQuestions: [], recentLesson: null, completedSessions: 0 });
  const [practiceLoaded, setPracticeLoaded] = useState(false);
  const [listeningSettings, setListeningSettings] = useState<ListeningSettings>(defaultListeningSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [showListeningSettings, setShowListeningSettings] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [practiceNotice, setPracticeNotice] = useState("");
  const [singleQuestionPractice, setSingleQuestionPractice] = useState(false);
  const [completedFillLessons, setCompletedFillLessons] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fillCanvasRef = useRef<HTMLCanvasElement>(null);
  const fillDraftRef = useRef<InkStroke[]>([]);
  const fillActiveStrokeRef = useRef<InkStroke | null>(null);
  const fillPointerIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const timeoutRefs = useRef<number[]>([]);

  const exercise = exercises[selectedLesson] ?? exercises[0];
  const lessonLines = exercise.lines;
  const lessonItems = lessonLines.flat();
  const fillLineStarts = lessonLines.map((_, lineIndex) => lessonLines.slice(0, lineIndex).reduce((count, line) => count + line.length, 0));
  const writtenCount = lessonItems.filter((_, index) => fillStrokes[index]?.length).length;
  const fillComplete = writtenCount === lessonItems.length;
  const listeningQuestions = sessionQuestions;
  const currentQuestion = listeningQuestions[listenIndex] ?? fallbackListeningQuestion;
  const isWordQuestion = currentQuestion.category === "words";
  const sectionQuestionIndex = listenIndex - (currentQuestion.category === "symbols" ? 0 : currentQuestion.category === "characters" ? 4 : 8);
  const sectionProgress = singleQuestionPractice ? "收藏題目重練" : isWordQuestion ? `第 ${sectionQuestionIndex * 2 + 1}–${sectionQuestionIndex * 2 + 2} 格 / 4` : `第 ${sectionQuestionIndex + 1} 小題 / 4`;
  const isFocusMode = view === "listen";
  const lesson = lessons[selectedLesson];
  const lessonNumber = ["一", "二", "三"][selectedLesson];
  const currentQuestionSaved = practiceState.savedQuestions.some((item) => item.lessonIndex === selectedLesson && item.questionId === currentQuestion.id);
  const pendingSessionCount = reviewedIndexes.filter((index) => practiceState.savedQuestions.some((item) => item.lessonIndex === selectedLesson && item.questionId === listeningQuestions[index]?.id && item.needsPractice)).length;

  useEffect(() => {
    try {
      const current = window.localStorage.getItem(practiceStorageKey);
      const previous = current ? null : window.localStorage.getItem(previousPracticeStorageKey);
      const stored = current ?? previous ?? window.localStorage.getItem(firstPracticeStorageKey);
      if (stored) {
        const parsed: { savedQuestions?: Array<{ lessonIndex?: number; questionId?: string; questionIndex?: number; needsPractice?: boolean }>; recentLesson?: number | null; completedSessions?: number } = JSON.parse(stored);
        const savedQuestions = (Array.isArray(parsed.savedQuestions) ? parsed.savedQuestions : []).flatMap((item): SavedQuestion[] => {
          if (typeof item?.lessonIndex !== "number" || !lessons[item.lessonIndex]) return [];
          let id = item.questionId;
          if (!current) {
            const legacyIndex = typeof item.questionIndex === "number" ? (previous ? item.questionIndex : legacySavedQuestionIndexes[item.lessonIndex]?.[item.questionIndex]) : undefined;
            const legacyQuestion = legacyIndex === undefined ? undefined : exercises[item.lessonIndex]?.questions[legacyIndex];
            id = legacyQuestion ? questionId(legacyQuestion) : undefined;
          }
          return typeof id === "string" && findQuestionSeed(item.lessonIndex, id) ? [{ lessonIndex: item.lessonIndex, questionId: id, needsPractice: Boolean(item.needsPractice) }] : [];
        });
        setPracticeState({
          savedQuestions: savedQuestions.filter((item, index) => savedQuestions.findIndex((other) => other.lessonIndex === item.lessonIndex && other.questionId === item.questionId) === index),
          recentLesson: typeof parsed.recentLesson === "number" && lessons[parsed.recentLesson] ? parsed.recentLesson : null,
          completedSessions: typeof parsed.completedSessions === "number" && Number.isFinite(parsed.completedSessions) ? Math.max(0, parsed.completedSessions) : 0,
        });
      }
    } catch { setStorageError(true); }
    setPracticeLoaded(true);
  }, []);

  useEffect(() => {
    if (!practiceLoaded) return;
    try { window.localStorage.setItem(practiceStorageKey, JSON.stringify(practiceState)); } catch { setStorageError(true); }
  }, [practiceLoaded, practiceState]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(listeningSettingsStorageKey);
      if (stored) {
        const parsed: Partial<ListeningSettings> = JSON.parse(stored);
        setListeningSettings({
          repeatCount: parsed.repeatCount === 1 || parsed.repeatCount === 2 || parsed.repeatCount === 3 ? parsed.repeatCount : 2,
          intervalSeconds: parsed.intervalSeconds === 5 || parsed.intervalSeconds === 8 || parsed.intervalSeconds === 10 ? parsed.intervalSeconds : 8,
        });
      }
    } catch { setStorageError(true); }
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    try { window.localStorage.setItem(listeningSettingsStorageKey, JSON.stringify(listeningSettings)); } catch { setStorageError(true); }
  }, [settingsLoaded, listeningSettings]);

  const saveQuestion = (lessonIndex: number, id: string, needsPractice = false) => {
    setPracticeState((current) => {
      const existing = current.savedQuestions.find((item) => item.lessonIndex === lessonIndex && item.questionId === id);
      if (existing) return needsPractice && !existing.needsPractice
        ? { ...current, savedQuestions: current.savedQuestions.map((item) => item === existing ? { ...item, needsPractice: true } : item) }
        : current;
      return { ...current, savedQuestions: [...current.savedQuestions, { lessonIndex, questionId: id, needsPractice }] };
    });
  };

  const markQuestionPracticed = (lessonIndex: number, id: string) => {
    setPracticeState((current) => ({ ...current, savedQuestions: current.savedQuestions.map((item) => item.lessonIndex === lessonIndex && item.questionId === id ? { ...item, needsPractice: false } : item) }));
  };

  const removeQuestion = (lessonIndex: number, id: string) => {
    setPracticeState((current) => ({ ...current, savedQuestions: current.savedQuestions.filter((item) => item.lessonIndex !== lessonIndex || item.questionId !== id) }));
    setPracticeNotice("已取消收藏，這題不會再顯示在練習頁。 ");
  };

  const toggleCurrentQuestionSaved = () => {
    if (currentQuestionSaved) removeQuestion(selectedLesson, currentQuestion.id);
    else saveQuestion(selectedLesson, currentQuestion.id);
  };

  const openLesson = (index: number) => {
    setSelectedLesson(index);
    setPreviewMode("annotated");
    setPracticeState((current) => ({ ...current, recentLesson: index }));
    setView("lesson");
  };

  const clearListenTimers = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    timeoutRefs.current.forEach((id) => window.clearTimeout(id));
    timeoutRefs.current = [];
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-TW";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }, []);

  const resetListeningQuestion = (index = 0) => {
    clearListenTimers();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setListenIndex(index);
    setListenPhase("ready");
    setSecondsLeft(30);
    setPlayCount(0);
    setHasInk(false);
    setRetryMessage("");
    setListenMessage("按下「開始聽」才會播放題目。時間會從這裡開始倒數。 ");
  };

  const openListening = () => {
    setSessionQuestions(buildListeningSession(selectedLesson));
    resetListeningQuestion(0);
    setSessionScore({ listeningCorrect: 0 });
    setReviewedIndexes([]);
    setSingleQuestionPractice(false);
    setView("listen");
  };

  const openSavedQuestion = (lessonIndex: number, id: string) => {
    const seed = findQuestionSeed(lessonIndex, id);
    if (!seed) return;
    setSelectedLesson(lessonIndex);
    setSessionQuestions([makeQuestion(seed)]);
    setSingleQuestionPractice(true);
    setPracticeNotice("");
    resetListeningQuestion(0);
    setView("listen");
  };

  const openFill = () => {
    setFillStrokes({});
    setActiveFillCell(null);
    setFillReviewOpen(false);
    setFillNeedsRetry([]);
    setFillParentChecked(false);
    setCompletedFillLessons((current) => current.filter((index) => index !== selectedLesson));
    setView("fill");
  };

  const leaveFocus = () => {
    if (listenPhase === "active" && !window.confirm("這一題尚未完成，要先離開嗎？")) return;
    clearListenTimers();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setView(singleQuestionPractice ? "practice" : "lesson");
    setListenPhase("ready");
  };

  const finishListening = useCallback((early = false) => {
    clearListenTimers();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSecondsLeft(0);
    setListenPhase("review");
    setListenMessage(early ? "已交卷，請家長一起看看。" : "時間到，請把平板交給家長一起看看。");
  }, [clearListenTimers]);

  useEffect(() => {
    if (listenPhase !== "active" && listenPhase !== "retry") return;

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    const repeatPlaybacks = Array.from({ length: listeningSettings.repeatCount - 1 }, (_, index) => window.setTimeout(() => {
      setPlayCount((current) => current + 1);
      setListenMessage(`第 ${index + 2} 次播放中，可以繼續寫，也可以修改剛剛的筆畫。`);
      speak(currentQuestion.audioText);
    }, (index + 1) * listeningSettings.intervalSeconds * 1000));

    const timeUp = window.setTimeout(() => finishListening(), 30000);
    timeoutRefs.current = [...repeatPlaybacks, timeUp];

    return clearListenTimers;
  }, [clearListenTimers, currentQuestion.audioText, finishListening, listenIndex, listenPhase, listeningSettings, speak]);

  useEffect(() => {
    if (view !== "listen" || (listenPhase !== "active" && listenPhase !== "retry")) return;
    const frame = window.requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.scale(ratio, ratio);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 4;
      context.strokeStyle = "#27463f";
    });
    return () => window.cancelAnimationFrame(frame);
  }, [view, listenPhase, listenIndex]);

  useEffect(() => () => clearListenTimers(), [clearListenTimers]);

  const startListening = () => {
    setListenPhase("active");
    setSecondsLeft(30);
    setPlayCount(1);
    setHasInk(false);
    setListenMessage("第一次播放中，Canvas 已開放，可以邊聽邊寫。 ");
    speak(currentQuestion.audioText);
  };

  const startRetryWriting = () => {
    setHasInk(false);
    setListenPhase("retry");
    setSecondsLeft(30);
    setPlayCount((current) => current + 1);
    setListenMessage("題目正在播放，請重新寫一次；需要時可按重播。 ");
    speak(currentQuestion.audioText);
  };

  const replayQuestion = () => {
    setPlayCount((current) => current + 1);
    speak(currentQuestion.audioText);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const beginDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (listenPhase !== "active" && listenPhase !== "retry") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = pointFromEvent(event);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasInk(true);
  };

  const endDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDrawing(false);
  };

  const fillLineForCell = (index: number) => fillLineStarts.findIndex((start, lineIndex) => index >= start && index < start + lessonLines[lineIndex].length);

  const openFillCell = (index: number) => {
    setFillReviewOpen(false);
    setActiveFillCell(index);
  };

  useEffect(() => {
    if (view !== "fill" || activeFillCell === null) return;
    const canvas = fillCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.strokeStyle = "#17324f";
    context.fillStyle = "#17324f";
    context.lineWidth = Math.max(3, rect.width * .009);
    context.lineCap = "round";
    context.lineJoin = "round";
    const saved = fillNeedsRetry.includes(activeFillCell) ? [] : fillStrokes[activeFillCell] ?? [];
    fillDraftRef.current = saved.map((stroke) => stroke.map((point) => ({ ...point })));
    fillActiveStrokeRef.current = null;
    fillPointerIdRef.current = null;
    setFillHasInk(saved.length > 0);
    setFillIsDirty(false);
    for (const stroke of saved) {
      if (!stroke.length) continue;
      context.beginPath();
      context.moveTo(stroke[0].x * rect.width / 100, stroke[0].y * rect.height / 100);
      if (stroke.length === 1) {
        context.arc(stroke[0].x * rect.width / 100, stroke[0].y * rect.height / 100, context.lineWidth / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        for (const point of stroke.slice(1)) context.lineTo(point.x * rect.width / 100, point.y * rect.height / 100);
        context.stroke();
      }
    }
  }, [view, activeFillCell, fillStrokes, fillNeedsRetry]);

  const fillPoint = (event: React.PointerEvent<HTMLCanvasElement>): InkPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) };
  };

  const beginFillDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (fillPointerIdRef.current !== null) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    fillPointerIdRef.current = event.pointerId;
    setFillIsDirty(true);
    const point = fillPoint(event);
    fillActiveStrokeRef.current = [point];
    const context = event.currentTarget.getContext("2d");
    const rect = event.currentTarget.getBoundingClientRect();
    if (context) {
      context.beginPath();
      context.arc(point.x * rect.width / 100, point.y * rect.height / 100, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(point.x * rect.width / 100, point.y * rect.height / 100);
    }
  };

  const moveFillDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (fillPointerIdRef.current !== event.pointerId || !fillActiveStrokeRef.current) return;
    event.preventDefault();
    const point = fillPoint(event);
    fillActiveStrokeRef.current.push(point);
    const rect = event.currentTarget.getBoundingClientRect();
    const context = event.currentTarget.getContext("2d");
    if (context) {
      context.lineTo(point.x * rect.width / 100, point.y * rect.height / 100);
      context.stroke();
    }
  };

  const endFillDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (fillPointerIdRef.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (fillActiveStrokeRef.current?.length) fillDraftRef.current.push(fillActiveStrokeRef.current);
    fillActiveStrokeRef.current = null;
    fillPointerIdRef.current = null;
    setFillHasInk(fillDraftRef.current.length > 0);
  };

  const clearFillDrawing = () => {
    const canvas = fillCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    fillDraftRef.current = [];
    setFillHasInk(false);
    setFillIsDirty(true);
  };

  const saveFillDrawing = () => {
    if (activeFillCell === null || !fillDraftRef.current.length) return;
    const index = activeFillCell;
    const lineIndex = fillLineForCell(index);
    const wasFilled = Boolean(fillStrokes[index]?.length);
    const next = { ...fillStrokes, [index]: fillDraftRef.current.map((stroke) => stroke.map((point) => ({ ...point }))) };
    setFillStrokes(next);
    setActiveFillCell(null);
    setFillParentChecked(false);
    setCompletedFillLessons((current) => current.filter((item) => item !== selectedLesson));
    const remainingRetry = fillNeedsRetry.filter((item) => item !== index);
    setFillNeedsRetry(remainingRetry);
    if (wasFilled) {
      if (remainingRetry.length) setActiveFillCell(remainingRetry[0]);
      else if (Object.keys(next).length === lessonItems.length) setFillReviewOpen(true);
      return;
    }
    const lineStart = fillLineStarts[lineIndex];
    const nextEmpty = lessonLines[lineIndex].findIndex((_, offset) => !next[lineStart + offset]?.length);
    if (nextEmpty >= 0) setActiveFillCell(lineStart + nextEmpty);
    else if (Object.keys(next).length === lessonItems.length) setFillReviewOpen(true);
    else {
      const nextUnwritten = lessonItems.findIndex((_, itemIndex) => !next[itemIndex]?.length);
      if (nextUnwritten >= 0) setActiveFillCell(nextUnwritten);
    }
  };

  const leaveFillCell = () => {
    if (fillIsDirty && !window.confirm("這一格還沒儲存，要返回課文嗎？")) return;
    setActiveFillCell(null);
  };

  const goToNextQuestion = () => {
    if (listenIndex >= listeningQuestions.length - 1) {
      setPracticeState((current) => ({ ...current, completedSessions: current.completedSessions + 1 }));
      setView("result");
      clearListenTimers();
      return;
    }
    resetListeningQuestion(listenIndex + 1);
  };

  const handleParentDecision = (result: Exclude<ParentResult, null>) => {
    if (result === "correct") {
      markQuestionPracticed(selectedLesson, currentQuestion.id);
      if (singleQuestionPractice) {
        setPracticeNotice("這題練完了！可以再練一次，或取消收藏。 ");
        setView("practice");
        clearListenTimers();
      } else {
        setSessionScore((current) => ({ ...current, listeningCorrect: current.listeningCorrect + currentQuestion.answer.split("|").length }));
        goToNextQuestion();
      }
    } else {
      setReviewedIndexes((current) => current.includes(listenIndex) ? current : [...current, listenIndex]);
      saveQuestion(selectedLesson, currentQuestion.id, true);
      setListenPhase("remediation_offer");
      setListenMessage("已加入待補強，可以現在練，也可以稍後再練。 ");
    }
  };

  const deferRemediation = () => {
    if (singleQuestionPractice) {
      setPracticeNotice("這題還在待補強清單，之後可以再練。");
      setView("practice");
      clearListenTimers();
    } else goToNextQuestion();
  };

  const selectRemediation = (answer: string) => {
    if (answer !== currentQuestion.answer) {
      setRetryMessage("再聽聽看，這個選項還不是剛剛聽到的內容。 ");
      return;
    }
    setRetryMessage("你選對了！請再寫一次。 ");
    clearCanvas();
    setListenPhase("retry_ready");
    setListenMessage("選對了！按下再聽一次並重寫，聽到聲音後開始寫。 ");
  };

  const submitRetryWriting = () => {
    if (!hasInk) return;
    clearListenTimers();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSecondsLeft(0);
    setListenPhase("review");
    setListenMessage("這是補強後的手寫答案，請家長再次判定。 ");
  };

  const navigate = (next: View) => {
    if (next !== "listen") clearListenTimers();
    setView(next);
  };

  const renderHome = () => (
    <>
      <section className="home-hero">
        <div className="hero-illustration">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/zhuyin-children-hero.jpg" alt="兩位孩子一起練習注音" />
        </div>
      </section>

      <section className="home-stats" aria-label="練習摘要">
        <div><span className="stat-icon coral">✎</span><span><small>今日練習</small><strong>1 <em>/ 2</em></strong></span></div>
        <div><span className="stat-icon mint">◌</span><span><small>最近課程</small><strong>第一課</strong></span></div>
        <div><span className="stat-icon sky">↗</span><span><small>練習方式</small><strong>自己操作</strong></span></div>
      </section>

      <section className="content-section">
        <div className="section-title-row"><div><span className="eyebrow">Pick up where you left off</span><h2>最近練習</h2></div><button className="text-button" type="button" onClick={() => setView("courses")}>看全部課程 <span>→</span></button></div>
        <button className="recent-card" type="button" onClick={() => openLesson(0)}>
          <span className="lesson-number"><Notebook size={25} weight="duotone" /></span><span className="recent-copy"><small>第一課</small><strong>貓咪</strong></span><span className="progress-ring"><b>2/5</b><small>進度</small></span><span className="card-arrow"><ArrowRight size={21} /></span>
        </button>
      </section>

      <section className="tip-card"><span className="tip-icon"><Lightbulb size={20} weight="duotone" /></span><span><strong>給陪練的大人</strong><small>聽寫時會先播放兩次，時間到才會請你幫忙判定，孩子可以安心慢慢寫。</small></span><button type="button" onClick={() => setView("more")} aria-label="查看陪練說明"><ArrowRight size={20} /></button></section>
      <section className="quick-courses"><div className="section-title-row"><div><span className="eyebrow">CHOOSE A LESSON</span><h2>選擇課程</h2></div><button className="text-button" type="button" onClick={() => setView("courses")}>看全部 <ArrowRight size={15} aria-hidden="true" /></button></div><div className="quick-course-grid">{lessons.map((item, index) => <button type="button" key={item.title} onClick={() => openLesson(index)}><small>第{["一", "二", "三"][index]}課</small><strong>{item.title}</strong></button>)}</div></section>
    </>
  );

  const renderCourses = () => (
    <section className="page-section">
      <SectionHeading eyebrow="COURSES" title="選擇課程" description="每一課都從一小段注音開始，按自己的步調練習就好。" />
      <div className="course-grid">
        <button className="course-tile featured" type="button" onClick={() => openLesson(0)}><span className="course-badge">現在練習</span><span className="course-tile-number">01</span><strong>第一課</strong><b>{lessons[0].title}</b><small>默寫 · 聽寫</small><span className="tile-arrow">→</span></button>
        {[
          ["02", "第二課", lessons[1].title, "默寫 · 聽寫"],
          ["03", "第三課", lessons[2].title, "默寫 · 聽寫"],
        ].map(([number, title, subtitle, status], index) => <button className="course-tile" type="button" key={number} onClick={() => openLesson(index + 1)}><span className="course-tile-number">{number}</span><strong>{title}</strong><b>{subtitle}</b><small>{status}</small><span className="lock-icon">→</span></button>)}
      </div>
      <div className="course-note"><span>☑</span><p><strong>三課都能練習</strong><br />每課都可以練課文默寫與隨機聽寫。</p></div>
    </section>
  );

  const renderLesson = () => (
    <section className="page-section lesson-page">
      <div className="lesson-heading"><div><span className="eyebrow">LESSON {String(selectedLesson + 1).padStart(2, "0")}</span><h1>{lesson.title}</h1></div><span className="lesson-stamp">{exercises[selectedLesson] ? <>先看<br />再寫</> : <>先讀<br />課文</>}</span></div>
      {exercises[selectedLesson] && <div className="mode-grid">
        <button className="mode-card fill-mode" type="button" onClick={openFill}><span className="mode-icon" aria-hidden="true"><PencilLine size={26} weight="duotone" /></span><small>第一關</small><strong>課文默寫</strong></button>
        <button className="mode-card listen-mode" type="button" onClick={openListening}><span className="mode-icon" aria-hidden="true"><Headphones size={26} weight="duotone" /></span><small>第二關</small><strong>聽寫</strong></button>
      </div>}
      <div className="lesson-curriculum">
        <div className="lesson-curriculum-heading">
          <strong>課文</strong>
          <div className="lesson-preview-switch" role="group" aria-label="課文顯示方式">
            <button type="button" aria-pressed={previewMode === "annotated"} onClick={() => setPreviewMode("annotated")}>國字＋注音</button>
            <button type="button" aria-pressed={previewMode === "zhuyin"} onClick={() => setPreviewMode("zhuyin")}>純注音</button>
          </div>
        </div>
        <div className={`lesson-text-lines ${previewMode === "zhuyin" ? "is-zhuyin-only" : ""}`} dir="rtl" aria-label={`${lesson.title}課文，${previewMode === "zhuyin" ? "純注音" : "國字加注音"}`}>
          {lesson.lines.map((line, lineIndex) => <div className="lesson-text-line" dir="ltr" key={lineIndex}>{Array.from(line).map((char, charIndex) => <span key={charIndex}>{char}{previewPronunciationVariants[selectedLesson]?.[lineIndex]?.[charIndex] ?? ""}</span>)}</div>)}
        </div>
        <div className="lesson-curriculum-heading"><strong>注音符號</strong></div>
        <div className="lesson-symbols" dir="rtl" aria-label="本課注音符號">{lesson.symbols.map((symbol) => <span key={symbol}>{symbol}</span>)}</div>
      </div>
      {!exercises[selectedLesson] && <p className="lesson-upcoming">這一課的課文默寫與聽寫練習準備中。</p>}
    </section>
  );

  const renderFillBlank = () => (
    <section className={`page-section fill-page ${fillParentChecked ? "is-complete" : ""}`}>
      <button className="back-link" type="button" onClick={() => setView("lesson")}>← 回到第{lessonNumber}課</button>
      <div className="zhuyin-sheet">
        <div className="sheet-top"><h1>{lesson.title}</h1><small>{fillParentChecked ? "家長已檢查" : `已寫 ${writtenCount} / ${lessonItems.length} 格`}</small></div>
        <p className="fill-sheet-help">{fillParentChecked ? "家長已檢查。修改任何一格後，需要再檢查一次。" : "先寫完整篇，再請家長對照答案。"}{fillNeedsRetry.length > 0 && `有 ${fillNeedsRetry.length} 格待重寫。`}</p>
        <div className="syllable-row" dir="rtl" aria-label="課文直排注音，從右向左閱讀">
          {lessonLines.map((line, lineIndex) => {
            const lineStart = fillLineStarts[lineIndex];
            return <div className="syllable-column" role="group" aria-label={`第 ${lineIndex + 1} 行`} key={lineIndex}>
              {line.map((_, itemIndex) => {
                const index = lineStart + itemIndex;
                return <button className={`syllable-cell fill-cell ${fillStrokes[index]?.length ? "is-filled" : "is-target"} ${fillNeedsRetry.includes(index) ? "is-needs-retry" : ""}`} key={index} type="button" aria-label={`第 ${lineIndex + 1} 行第 ${itemIndex + 1} 格，${fillNeedsRetry.includes(index) ? "待重寫" : fillStrokes[index]?.length ? "修改注音" : "寫注音"}`} onClick={() => openFillCell(index)}>{fillStrokes[index]?.length ? <InkPreview strokes={fillStrokes[index]} /> : <span className="fill-cell-plus" aria-hidden="true">＋</span>}</button>;
              })}
            </div>;
          })}
        </div>
      </div>
      {!fillComplete && <button className="fill-begin-button" type="button" onClick={() => openFillCell(lessonItems.findIndex((_, index) => !fillStrokes[index]?.length))}>從第一個空格開始 <ArrowRight size={19} aria-hidden="true" /></button>}
      {fillComplete && !fillParentChecked && <div className="fill-check-actions">{fillNeedsRetry.length > 0 && <button type="button" className="fill-begin-button" onClick={() => openFillCell(fillNeedsRetry[0])}>重寫待補強的 {fillNeedsRetry.length} 格 <ArrowRight size={19} aria-hidden="true" /></button>}<button type="button" className="fill-begin-button" onClick={() => setFillReviewOpen(true)}>請家長檢查 <ArrowRight size={19} aria-hidden="true" /></button></div>}
      {fillParentChecked && <div className="completion-banner"><span>✓</span><p><strong>家長檢查完成！</strong><small>全部注音都已對照；也可以點格子修改。</small></p><button type="button" className="primary-button" onClick={openListening}>進入聽寫 <span>→</span></button></div>}
    </section>
  );

  const renderFillWriting = () => {
    if (activeFillCell === null) return null;
    const lineIndex = fillLineForCell(activeFillCell);
    const position = activeFillCell - fillLineStarts[lineIndex] + 1;
    return <main className="fill-focus-shell">
      <header className="fill-focus-header"><button type="button" onClick={leaveFillCell}><ArrowLeft size={19} aria-hidden="true" /> 回到課文</button><strong>第 {lineIndex + 1} 行 · 第 {position} 格</strong><span>{writtenCount} / {lessonItems.length}</span></header>
      <div className="fill-focus-body"><h1>寫出完整注音</h1><p>記得寫聲調，寫好後按「完成這格」。</p><div className="fill-writing-grid"><canvas ref={fillCanvasRef} onPointerDown={beginFillDrawing} onPointerMove={moveFillDrawing} onPointerUp={endFillDrawing} onPointerCancel={endFillDrawing} aria-label={`第 ${lineIndex + 1} 行第 ${position} 格手寫區`} /></div><div className="fill-writing-actions"><button type="button" className="fill-clear-button" onClick={clearFillDrawing}>清除重寫</button><button type="button" className="fill-save-button" disabled={!fillHasInk} onClick={saveFillDrawing}>完成這格 <ArrowRight size={19} aria-hidden="true" /></button></div></div>
    </main>;
  };

  const renderFillReview = () => {
    if (!fillReviewOpen) return null;
    const confirmFillReview = () => {
      setFillReviewOpen(false);
      if (fillNeedsRetry.length) {
        openFillCell(fillNeedsRetry[0]);
      } else {
        setFillParentChecked(true);
        setCompletedFillLessons((current) => current.includes(selectedLesson) ? current : [...current, selectedLesson]);
      }
    };
    return <main className="fill-focus-shell fill-review-shell"><header className="fill-focus-header"><button type="button" onClick={() => setFillReviewOpen(false)}><ArrowLeft size={19} aria-hidden="true" /> 回到課文</button><strong>家長檢查</strong><span>{fillNeedsRetry.length} 格待重寫</span></header><div className="fill-review-body"><h1>一起對照整篇課文</h1><p>請家長逐格看筆跡和正確注音；有錯的格子點「需要重寫」，其餘確認後即可完成。</p><div className="fill-compare-list">{lessonLines.map((line, lineIndex) => <section className="fill-review-line" key={lineIndex}><h2>第 {lineIndex + 1} 行</h2>{line.map((item, offset) => { const index = fillLineStarts[lineIndex] + offset; const needsRetry = fillNeedsRetry.includes(index); return <div className={`fill-compare-row ${needsRetry ? "is-needs-retry" : ""}`} key={index}><span>{offset + 1}</span><div className="fill-compare-ink"><InkPreview strokes={fillStrokes[index] ?? []} /></div><div className="fill-compare-answer"><ZhuyinStack text={item.zhuyin} /></div><button type="button" className="fill-mark-retry" aria-pressed={needsRetry} onClick={() => setFillNeedsRetry((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])}>{needsRetry ? "已標記 · 取消" : "需要重寫"}</button></div>; })}</section>)}</div><div className="fill-review-actions"><button type="button" onClick={() => setFillReviewOpen(false)}>稍後檢查</button><button type="button" onClick={confirmFillReview}>{fillNeedsRetry.length ? `重寫 ${fillNeedsRetry.length} 格` : "確認檢查完成"} <ArrowRight size={19} aria-hidden="true" /></button></div></div></main>;
  };

  const renderPractice = () => (
    <section className="page-section practice-page">
      <SectionHeading eyebrow="YOUR PRACTICE" title="練習紀錄" description="待補強與收藏題目留在這台裝置，可以隨時重練。" />
      {storageError && <p className="practice-storage-error" role="alert">這個瀏覽器目前無法儲存收藏；關閉頁面後，紀錄可能會消失。</p>}
      {practiceNotice && <p className="practice-notice" role="status">{practiceNotice}</p>}
      <div className="section-title-row"><h2>待補強與收藏</h2><span className="list-count">{practiceState.savedQuestions.filter((item) => item.needsPractice).length} 題待補強</span></div>
      {practiceState.savedQuestions.length ? <div className="saved-question-list">
        {[...practiceState.savedQuestions].sort((a, b) => Number(Boolean(b.needsPractice)) - Number(Boolean(a.needsPractice))).map(({ lessonIndex, questionId, needsPractice }, savedIndex) => {
          const question = findQuestionSeed(lessonIndex, questionId);
          if (!question) return null;
          return <div className="saved-question" key={`${lessonIndex}-${questionId}`}>
            <span className="saved-question-icon"><Headphones size={24} weight="duotone" aria-hidden="true" /></span>
            <div className="saved-question-copy"><strong>第{["一", "二", "三"][lessonIndex]}課 · {listenCategoryLabels[question.category]}</strong><small>{lessons[lessonIndex].title} · {needsPractice ? "待補強" : "已收藏"} · 題目 {savedIndex + 1}</small></div>
            <div className="saved-question-actions">
              <button type="button" onClick={() => speak(question.audioText)} aria-label={`播放第${["一", "二", "三"][lessonIndex]}課收藏題目 ${savedIndex + 1}`}><SpeakerHigh size={18} aria-hidden="true" /> 播放</button>
              <button type="button" className="saved-start" onClick={() => openSavedQuestion(lessonIndex, questionId)}>重練這題</button>
              <button type="button" className="saved-remove" onClick={() => removeQuestion(lessonIndex, questionId)}>取消收藏</button>
            </div>
          </div>;
        })}
      </div> : <div className="empty-reinforce"><span>☆</span><strong>目前沒有待補強或收藏題目</strong><small>聽寫時按「需要補強」會先記下題目，之後可以再練。</small></div>}
      <div className="practice-summary"><div className="summary-score"><span>完成聽寫</span><strong>{practiceState.completedSessions}</strong><small>次</small></div><div className="summary-copy"><span className="eyebrow">KEEP GOING</span><h2>每天 5 分鐘，慢慢變熟悉。</h2><p>完成一個小練習，就是很棒的進度。</p></div><span className="summary-doodle">✦</span></div>
      <div className="practice-list"><div className="section-title-row"><h2>最近練習</h2><span className="list-count">{practiceState.recentLesson === null ? "0 個紀錄" : "1 個紀錄"}</span></div>
        {practiceState.recentLesson === null ? <p className="practice-no-recent">還沒有練習紀錄，先選一課開始吧。</p> : <button className="practice-row" type="button" onClick={() => openLesson(practiceState.recentLesson!)}><span className="practice-row-icon">{String(practiceState.recentLesson + 1).padStart(2, "0")}</span><span><strong>第{["一", "二", "三"][practiceState.recentLesson]}課・{lessons[practiceState.recentLesson].title}</strong><small>回到課程</small></span><b>繼續 <span>→</span></b></button>}
      </div>
    </section>
  );

  const renderMore = () => (
    <section className="page-section more-page">
      <SectionHeading eyebrow="MORE" title="更多" description="簡單的說明與設定，陪孩子一起練習。" />
      <div className="more-list"><button type="button"><span className="more-list-icon mint"><Question size={21} weight="bold" /></span><span><strong>使用說明</strong><small>第一次使用，先看這裡</small></span><b>→</b></button><button type="button"><span className="more-list-icon sky"><Heart size={21} weight="duotone" /></span><span><strong>給家長的話</strong><small>為什麼不需要孩子註冊</small></span><b>→</b></button><button type="button" aria-expanded={showListeningSettings} aria-controls="listening-settings" onClick={() => setShowListeningSettings((current) => !current)}><span className="more-list-icon cream"><MusicNotes size={21} weight="duotone" /></span><span><strong>聽寫設定</strong><small>播放 {listeningSettings.repeatCount} 次 · 間隔 {listeningSettings.intervalSeconds} 秒 · 作答 30 秒</small></span><b>{showListeningSettings ? "−" : "→"}</b></button><button type="button"><span className="more-list-icon coral"><Info size={21} weight="bold" /></span><span><strong>關於這個網站</strong><small>第一版測試版本 · v0.1</small></span><b>→</b></button></div>
      {showListeningSettings && <section id="listening-settings" className="listening-settings" aria-label="聽寫設定"><h2>給家長的聽寫設定</h2><p>設定會留在這台裝置。作答時間固定 30 秒，從第一次播放開始倒數。</p><fieldset><legend>每題播放幾次</legend><div className="settings-options">{([1, 2, 3] as const).map((count) => <button type="button" key={count} aria-pressed={listeningSettings.repeatCount === count} onClick={() => setListeningSettings((current) => ({ ...current, repeatCount: count }))}>{count} 次</button>)}</div></fieldset><fieldset><legend>每次播放相隔多久</legend><div className="settings-options">{([5, 8, 10] as const).map((seconds) => <button type="button" key={seconds} aria-pressed={listeningSettings.intervalSeconds === seconds} onClick={() => setListeningSettings((current) => ({ ...current, intervalSeconds: seconds }))}>{seconds} 秒</button>)}</div></fieldset></section>}
      <div className="privacy-card"><span>◌</span><p><strong>這裡不收集孩子的個人資料</strong><small>不需要姓名、Email 或帳號，練習紀錄只留在目前的裝置上。</small></p></div>
    </section>
  );

  const renderResult = () => (
    <section className="page-section result-page">
      <div className="result-celebration"><span className="result-spark">✦</span><div className="result-check">✓</div><span className="result-spark right">✦</span></div>
      <span className="eyebrow">PRACTICE COMPLETE</span><h1>練習完成！</h1><p className="result-intro">今天的第{lessonNumber}課，你已經往前走了一小步。</p>
      <div className="result-card"><div><span className="result-icon fill"><PencilLine size={22} weight="duotone" /></span><span><strong>課文默寫</strong><small>直式注音格 · {completedFillLessons.includes(selectedLesson) ? "已完成" : "尚未練習"}</small></span><b>{completedFillLessons.includes(selectedLesson) ? "✓" : "—"}</b></div><div><span className="result-icon listen"><Headphones size={22} weight="duotone" /></span><span><strong>聽寫</strong><small>三大題 · {sessionScore.listeningCorrect} / 12 格完成</small></span><b>✓</b></div></div>
      <div className="result-note"><span>☼</span><p><strong>待補強：{pendingSessionCount} 題</strong><small>{pendingSessionCount ? "題目已留在「練習」，可以稍後單題重練。" : "這次沒有待補強的題目；收藏的題目仍可在「練習」重練。"}</small></p></div>
      <div className="result-actions"><button className="primary-button" type="button" onClick={openListening}>再練一次 <span>↻</span></button><button className="secondary-button" type="button" onClick={() => setView("practice")}>查看收藏</button><button className="secondary-button" type="button" onClick={() => setView("lesson")}>回到課次</button></div>
    </section>
  );

  const renderFocusMode = () => {
    const choiceAnswers = currentQuestion.choices;
    return (
    <main className={`focus-shell phase-${listenPhase}`}>
      <header className="focus-topbar"><button type="button" className="focus-exit" onClick={leaveFocus}>← <span>離開</span></button><div className="focus-question"><strong>{listenCategoryLabels[currentQuestion.category]}</strong><small>{sectionProgress}</small></div><div className="focus-meta"><span className={secondsLeft <= 8 && (listenPhase === "active" || listenPhase === "retry") ? "urgent" : ""}><Timer size={14} weight="bold" /> {listenPhase === "retry_ready" ? "待重寫" : listenPhase === "review" || listenPhase === "choice" ? "已交卷" : `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`}</span><span aria-label={`已播放 ${playCount} 次`}><SpeakerHigh size={14} weight="bold" /> {playCount} 次</span></div></header>
      <div className="focus-content">
        <p className="sr-only" aria-live="polite">{listenMessage}</p>
        {listenPhase === "ready" ? <div className="listen-ready-card"><span className="listen-ready-icon"><Headphones size={42} weight="duotone" aria-hidden="true" /></span><h1>準備聽寫</h1><p>{isWordQuestion ? "聽一個語詞，寫在兩格田字格裡。" : "聽題目，在田字格寫下完整注音。"}</p><div className="listen-ready-summary"><span>播放 <strong>{listeningSettings.repeatCount} 次</strong></span><span>間隔 <strong>{listeningSettings.intervalSeconds} 秒</strong></span><span>作答 <strong>30 秒</strong></span></div><button type="button" className="listen-start-button" onClick={startListening}><span className="play-circle"><Play size={17} weight="fill" /></span><span><strong>開始聽</strong><small>按下後播放，並開始倒數</small></span><b><ArrowRight size={19} /></b></button></div> : <div className={`canvas-zone ${isWordQuestion ? "is-word" : ""} ${listenPhase === "review" || listenPhase === "remediation_offer" || listenPhase === "choice" || listenPhase === "retry_ready" ? "is-locked" : ""}`}><div className="canvas-paper">{isWordQuestion && <div className="word-grid-guide" aria-hidden="true"><span /><span /></div>}<canvas ref={canvasRef} onPointerDown={beginDrawing} onPointerMove={draw} onPointerUp={endDrawing} onPointerCancel={endDrawing} onPointerLeave={endDrawing} aria-label={isWordQuestion ? "語詞兩格田字格手寫區" : "田字格手寫區"} />{listenPhase === "choice" && <div className="canvas-replay-overlay"><button type="button" className="canvas-replay-button" onClick={replayQuestion} aria-label="再播放一次題目"><Play size={30} weight="fill" aria-hidden="true" /></button><span>點一下，再聽一次</span></div>}{listenPhase === "retry_ready" && <div className="canvas-replay-overlay retry-ready-overlay"><strong>答對了！再聽一次，重新寫。</strong><button type="button" onClick={startRetryWriting}><Play size={22} weight="fill" aria-hidden="true" /> 再聽一次並重寫</button></div>}</div><div className="canvas-toolbar"><span>{isWordQuestion ? "兩格田字格 · 從左到右寫" : "田字格"}</span><button type="button" onClick={clearCanvas} disabled={listenPhase !== "active" && listenPhase !== "retry"}>清除</button></div></div>}
        {listenPhase === "active" && <button type="button" className="early-submit-button" onClick={() => finishListening(true)}>提早交卷</button>}
        {listenPhase === "review" && <div className="parent-review"><div className="answer-reveal"><span>正確答案</span><AnswerDisplay answer={currentQuestion.answer} /></div><p>{hasInk ? "請家長依照孩子的手寫內容判定。" : "還沒有手寫內容；可以先按「需要補強」再練一次。"}</p><div className="review-actions"><button type="button" className="review-correct" disabled={!hasInk} onClick={() => handleParentDecision("correct")}>✓ 答對</button><button type="button" className="review-retry" onClick={() => handleParentDecision("needs_review")}>↻ 需要補強</button></div><button type="button" className={`review-save ${currentQuestionSaved ? "is-saved" : ""}`} aria-pressed={currentQuestionSaved} onClick={toggleCurrentQuestionSaved}>{currentQuestionSaved ? "★ 已收藏 · 取消收藏" : "☆ 收藏這題，之後再練"}</button></div>}
        {listenPhase === "remediation_offer" && <div className="remediation-offer"><strong>這題已加入待補強</strong><p>可以現在練，也可以先做下一題；稍後會留在「練習」。</p><div><button type="button" onClick={() => { setListenPhase("choice"); setRetryMessage(""); }}>現在補強</button><button type="button" onClick={deferRemediation}>稍後再練</button></div></div>}
        {listenPhase === "choice" && <div className={`choice-panel ${isWordQuestion ? "is-word" : ""}`}><div className="choice-options">{choiceAnswers.map((answer) => <button type="button" key={answer} onClick={() => selectRemediation(answer)}><AnswerDisplay answer={answer} /></button>)}</div><p>{retryMessage || (isWordQuestion ? "選出你剛剛聽到的完整語詞注音。" : "選出你剛剛聽到的完整音節。")}</p><button type="button" className="remediation-later" onClick={deferRemediation}>稍後再練這題</button></div>}
        {listenPhase === "retry_ready" && <button type="button" className="remediation-later" onClick={deferRemediation}>稍後再練這題</button>}
        {listenPhase === "retry" && <div className="retry-actions"><button type="button" className="retry-replay" onClick={replayQuestion}><SpeakerHigh size={18} aria-hidden="true" /> 再聽一次</button><button type="button" className="retry-submit" disabled={!hasInk} onClick={submitRetryWriting}>我寫好了，請家長看看 <span>→</span></button><button type="button" className="remediation-later" onClick={deferRemediation}>稍後再練</button></div>}
      </div>
    </main>
    );
  };

  const renderMain = () => {
    switch (view) {
      case "courses": return renderCourses();
      case "practice": return renderPractice();
      case "more": return renderMore();
      case "lesson": return renderLesson();
      case "fill": return renderFillBlank();
      case "result": return renderResult();
      default: return renderHome();
    }
  };

  if (isFocusMode) return renderFocusMode();
  if (view === "fill" && activeFillCell !== null) return renderFillWriting();
  if (view === "fill" && fillReviewOpen) return renderFillReview();

  return (
    <div className="app-shell">
      <AppHeader onHome={() => setView("home")} onBackToCourses={view === "lesson" ? () => setView("courses") : undefined} />
      <main className="main-content">{renderMain()}</main>
      <BottomNav active={view === "lesson" || view === "fill" || view === "result" ? "courses" : view} onNavigate={navigate} />
    </div>
  );
}

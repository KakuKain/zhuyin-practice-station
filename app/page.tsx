"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpenText, Gear, Headphones, Heart, House, Info, Lightbulb, MusicNotes, Notebook, PencilLine, Play, Question, SpeakerHigh, Timer } from "@phosphor-icons/react";

type View = "home" | "courses" | "practice" | "more" | "lesson" | "fill" | "listen" | "result";
type ListenPhase = "ready" | "active" | "review" | "choice" | "retry_ready" | "retry";
type ParentResult = "correct" | "needs_review" | null;
type PreviewMode = "annotated" | "zhuyin";
type SyllableItem = { character: string; zhuyin: string };
type ListeningQuestion = { answer: string; audioText: string; distractors: readonly string[] };
type LessonExercise = { lines: readonly (readonly SyllableItem[])[]; questions: readonly ListeningQuestion[] };
type InkPoint = { x: number; y: number };
type InkStroke = InkPoint[];
type SavedQuestion = { lessonIndex: number; questionIndex: number };
type PracticeState = { savedQuestions: SavedQuestion[]; recentLesson: number | null; completedSessions: number };
const practiceStorageKey = "zhuyin-practice-state-v1";

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
const thirdLessonLines = [
  [{ character: "河", zhuyin: "ㄏㄜˊ" }, { character: "馬", zhuyin: "ㄇㄚˇ" }, { character: "要", zhuyin: "ㄧㄠˋ" }, { character: "去", zhuyin: "ㄑㄩˋ" }, { character: "泡", zhuyin: "ㄆㄠˋ" }, { character: "澡", zhuyin: "ㄗㄠˇ" }],
  [{ character: "半", zhuyin: "ㄅㄢˋ" }, { character: "路", zhuyin: "ㄌㄨˋ" }, { character: "遇", zhuyin: "ㄩˋ" }, { character: "到", zhuyin: "ㄉㄠˋ" }, { character: "河", zhuyin: "ㄏㄜˊ" }, { character: "狸", zhuyin: "ㄌㄧˊ" }],
  [{ character: "喔", zhuyin: "ㄛ" }],
  [{ character: "河", zhuyin: "ㄏㄜˊ" }, { character: "狸", zhuyin: "ㄌㄧˊ" }],
  [{ character: "忙", zhuyin: "ㄇㄤˊ" }, { character: "著", zhuyin: "˙ㄓㄜ" }, { character: "築", zhuyin: "ㄓㄨˊ" }, { character: "巢", zhuyin: "ㄔㄠˊ" }],
] as const;

const firstListeningQuestions = [
  { answer: "ㄇㄠ", audioText: "貓", distractors: ["ㄇㄠˊ", "ㄇㄠˇ"] },
  { answer: "ㄇㄧ", audioText: "咪", distractors: ["ㄇㄧˊ", "ㄇㄧˇ"] },
  { answer: "ㄆㄠˇ", audioText: "跑", distractors: ["ㄆㄠˊ", "ㄆㄠˋ"] },
] as const;
const thirdListeningQuestions = [
  { answer: "ㄑㄩˋ", audioText: "去", distractors: ["ㄑㄩ", "ㄑㄩˇ"] },
  { answer: "ㄗㄠˇ", audioText: "澡", distractors: ["ㄗㄠ", "ㄗㄠˋ"] },
  { answer: "ㄔㄠˊ", audioText: "巢", distractors: ["ㄔㄠ", "ㄔㄠˇ"] },
] as const;

const exercises: Record<number, LessonExercise> = {
  0: { lines: firstLessonLines, questions: firstListeningQuestions },
  2: { lines: thirdLessonLines, questions: thirdListeningQuestions },
};

// This font draws the complete vertical syllable (including its tone) from a
// representative Han character. Rendering individual Bopomofo characters would
// discard the font's built-in tone placement.
const syllableGlyphs: Record<string, string> = {
  ...Object.fromEntries([firstLessonLines, thirdLessonLines].flat(2).map(({ character, zhuyin }) => [zhuyin, character])),
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
      <span className={`zhuyin-glyph ${text === "˙ㄉㄧ" ? "is-neutral-di" : ""}`} aria-hidden="true">{syllableGlyphs[text] ?? text}</span>
    </span>
  );
}

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
  const [fillReviewLine, setFillReviewLine] = useState<number | null>(null);
  const [fillHasInk, setFillHasInk] = useState(false);
  const [fillIsDirty, setFillIsDirty] = useState(false);
  const [listenIndex, setListenIndex] = useState(0);
  const [listenPhase, setListenPhase] = useState<ListenPhase>("ready");
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [playCount, setPlayCount] = useState(0);
  const [listenMessage, setListenMessage] = useState("按下「開始聽」才會播放題目。時間會從這裡開始倒數。 ");
  const [retryMessage, setRetryMessage] = useState("");
  const [sessionScore, setSessionScore] = useState({ listeningCorrect: 0 });
  const [reviewedIndexes, setReviewedIndexes] = useState<number[]>([]);
  const [practiceState, setPracticeState] = useState<PracticeState>({ savedQuestions: [], recentLesson: null, completedSessions: 0 });
  const [practiceLoaded, setPracticeLoaded] = useState(false);
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
  const listeningQuestions = exercise.questions;
  const currentQuestion = listeningQuestions[listenIndex] ?? listeningQuestions[0];
  const isFocusMode = view === "listen";
  const lesson = lessons[selectedLesson];
  const lessonNumber = ["一", "二", "三"][selectedLesson];
  const currentQuestionSaved = practiceState.savedQuestions.some((item) => item.lessonIndex === selectedLesson && item.questionIndex === listenIndex);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(practiceStorageKey);
      if (saved) {
        const parsed: Partial<PracticeState> = JSON.parse(saved);
        setPracticeState({
          savedQuestions: Array.isArray(parsed.savedQuestions) ? parsed.savedQuestions.filter((item): item is SavedQuestion =>
            typeof item?.lessonIndex === "number" && typeof item?.questionIndex === "number" &&
            Boolean(exercises[item.lessonIndex]?.questions[item.questionIndex])) : [],
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

  const saveQuestion = (lessonIndex: number, questionIndex: number) => {
    setPracticeState((current) => current.savedQuestions.some((item) => item.lessonIndex === lessonIndex && item.questionIndex === questionIndex)
      ? current
      : { ...current, savedQuestions: [...current.savedQuestions, { lessonIndex, questionIndex }] });
  };

  const removeQuestion = (lessonIndex: number, questionIndex: number) => {
    setPracticeState((current) => ({ ...current, savedQuestions: current.savedQuestions.filter((item) => item.lessonIndex !== lessonIndex || item.questionIndex !== questionIndex) }));
    setPracticeNotice("已取消收藏，這題不會再顯示在練習頁。 ");
  };

  const toggleCurrentQuestionSaved = () => {
    if (currentQuestionSaved) removeQuestion(selectedLesson, listenIndex);
    else saveQuestion(selectedLesson, listenIndex);
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
    setListenIndex(index);
    setListenPhase("ready");
    setSecondsLeft(30);
    setPlayCount(0);
    setHasInk(false);
    setRetryMessage("");
    setListenMessage("按下「開始聽」才會播放題目。時間會從這裡開始倒數。 ");
  };

  const openListening = () => {
    resetListeningQuestion(0);
    setSessionScore({ listeningCorrect: 0 });
    setReviewedIndexes([]);
    setSingleQuestionPractice(false);
    setView("listen");
  };

  const openSavedQuestion = (lessonIndex: number, questionIndex: number) => {
    setSelectedLesson(lessonIndex);
    setSingleQuestionPractice(true);
    setPracticeNotice("");
    resetListeningQuestion(questionIndex);
    setView("listen");
  };

  const openFill = () => {
    setFillStrokes({});
    setActiveFillCell(null);
    setFillReviewLine(null);
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

    const secondPlayback = window.setTimeout(() => {
      setPlayCount((current) => current + 1);
      setListenMessage("第二次播放中，可以繼續寫，也可以修改剛剛的筆畫。 ");
      speak(currentQuestion.audioText);
    }, 8000);

    const timeUp = window.setTimeout(() => finishListening(), 30000);
    timeoutRefs.current = [secondPlayback, timeUp];

    return clearListenTimers;
  }, [clearListenTimers, currentQuestion.audioText, finishListening, listenIndex, listenPhase, speak]);

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
    setFillReviewLine(null);
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
    const saved = fillStrokes[activeFillCell] ?? [];
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
  }, [view, activeFillCell, fillStrokes]);

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
    if (Object.keys(next).length === lessonItems.length) setCompletedFillLessons((current) => current.includes(selectedLesson) ? current : [...current, selectedLesson]);
    if (wasFilled) return;
    const lineStart = fillLineStarts[lineIndex];
    const nextEmpty = lessonLines[lineIndex].findIndex((_, offset) => !next[lineStart + offset]?.length);
    if (nextEmpty >= 0) setActiveFillCell(lineStart + nextEmpty);
    else setFillReviewLine(lineIndex);
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
      if (singleQuestionPractice) {
        setPracticeNotice("這題練完了！可以再練一次，或取消收藏。 ");
        setView("practice");
        clearListenTimers();
      } else {
        setSessionScore((current) => ({ ...current, listeningCorrect: current.listeningCorrect + 1 }));
        goToNextQuestion();
      }
    } else {
      setReviewedIndexes((current) => current.includes(listenIndex) ? current : [...current, listenIndex]);
      saveQuestion(selectedLesson, listenIndex);
      setListenPhase("choice");
      setListenMessage("沒關係，先用三選一確認聲音，再重新寫一次。 ");
    }
  };

  const selectRemediation = (answer: string) => {
    if (answer !== currentQuestion.answer) {
      setRetryMessage("再聽聽看聲調，這個選項還不是剛剛的音節。 ");
      return;
    }
    setRetryMessage("你選對了！請在下方再寫一次這個音節。 ");
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
          ["02", "第二課", lessons[1].title, "閱讀課文"],
          ["03", "第三課", lessons[2].title, "默寫 · 聽寫"],
        ].map(([number, title, subtitle, status], index) => <button className="course-tile" type="button" key={number} onClick={() => openLesson(index + 1)}><span className="course-tile-number">{number}</span><strong>{title}</strong><b>{subtitle}</b><small>{status}</small><span className="lock-icon">→</span></button>)}
      </div>
      <div className="course-note"><span>☑</span><p><strong>三課課文已更新</strong><br />第一、三課可以練默寫與聽寫；第二課先讀課文與注音符號。</p></div>
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
    <section className={`page-section fill-page ${fillComplete ? "is-complete" : ""}`}>
      <button className="back-link" type="button" onClick={() => setView("lesson")}>← 回到第{lessonNumber}課</button>
      <div className="zhuyin-sheet">
        <div className="sheet-top"><h1>{lesson.title}</h1><small>已寫 {writtenCount} / {lessonItems.length} 格</small></div>
        <p className="fill-sheet-help">點格子寫完整注音，包含聲調。寫完一行再對照答案。</p>
        <div className="syllable-row" dir="rtl" aria-label="課文直排注音，從右向左閱讀">
          {lessonLines.map((line, lineIndex) => {
            const lineStart = fillLineStarts[lineIndex];
            const lineDone = line.every((_, offset) => fillStrokes[lineStart + offset]?.length);
            return <div className="syllable-column" role="group" aria-label={`第 ${lineIndex + 1} 行`} key={lineIndex}>
              {line.map((_, itemIndex) => {
                const index = lineStart + itemIndex;
                return <button className={`syllable-cell fill-cell ${fillStrokes[index]?.length ? "is-filled" : "is-target"}`} key={index} type="button" aria-label={`第 ${lineIndex + 1} 行第 ${itemIndex + 1} 格，${fillStrokes[index]?.length ? "修改注音" : "寫注音"}`} onClick={() => openFillCell(index)}>{fillStrokes[index]?.length ? <InkPreview strokes={fillStrokes[index]} /> : <span className="fill-cell-plus" aria-hidden="true">＋</span>}</button>;
              })}
              {lineDone && <button className="fill-line-review-link" type="button" onClick={() => setFillReviewLine(lineIndex)}>對照這行</button>}
            </div>;
          })}
        </div>
      </div>
      {!fillComplete && <button className="fill-begin-button" type="button" onClick={() => openFillCell(lessonItems.findIndex((_, index) => !fillStrokes[index]?.length))}>從第一個空格開始 <ArrowRight size={19} aria-hidden="true" /></button>}
      {fillComplete && <div className="completion-banner"><span>✓</span><p><strong>整篇寫完了！</strong><small>可以點格子修改，或進入聽寫。</small></p><button type="button" className="primary-button" onClick={openListening}>進入聽寫 <span>→</span></button></div>}
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
    if (fillReviewLine === null) return null;
    const line = lessonLines[fillReviewLine];
    const start = fillLineStarts[fillReviewLine];
    const nextLineStart = fillLineStarts[fillReviewLine + 1];
    return <main className="fill-focus-shell fill-review-shell"><header className="fill-focus-header"><button type="button" onClick={() => setFillReviewLine(null)}><ArrowLeft size={19} aria-hidden="true" /> 回到課文</button><strong>第 {fillReviewLine + 1} 行完成</strong><span>{writtenCount} / {lessonItems.length}</span></header><div className="fill-review-body"><h1>一起對照這一行</h1><p>左邊是你的筆跡，右邊是正確注音。請家長陪孩子看看聲調。</p><div className="fill-compare-list">{line.map((item, offset) => <div className="fill-compare-row" key={offset}><span>{offset + 1}</span><div className="fill-compare-ink"><InkPreview strokes={fillStrokes[start + offset] ?? []} /></div><div className="fill-compare-answer"><ZhuyinStack text={item.zhuyin} /></div></div>)}</div><div className="fill-review-actions"><button type="button" onClick={() => setFillReviewLine(null)}>回課文修改</button><button type="button" onClick={() => { setFillReviewLine(null); if (nextLineStart !== undefined) openFillCell(nextLineStart); }}> {nextLineStart === undefined ? "完成對照" : "寫下一行"} <ArrowRight size={19} aria-hidden="true" /></button></div></div></main>;
  };

  const renderPractice = () => (
    <section className="page-section practice-page">
      <SectionHeading eyebrow="YOUR PRACTICE" title="練習紀錄" description="收藏的題目留在這台裝置，可以隨時重練。" />
      {storageError && <p className="practice-storage-error" role="alert">這個瀏覽器目前無法儲存收藏；關閉頁面後，紀錄可能會消失。</p>}
      {practiceNotice && <p className="practice-notice" role="status">{practiceNotice}</p>}
      <div className="section-title-row"><h2>收藏題目</h2><span className="list-count">{practiceState.savedQuestions.length} 題</span></div>
      {practiceState.savedQuestions.length ? <div className="saved-question-list">
        {practiceState.savedQuestions.map(({ lessonIndex, questionIndex }) => (
          <div className="saved-question" key={`${lessonIndex}-${questionIndex}`}>
            <span className="saved-question-icon"><Headphones size={24} weight="duotone" aria-hidden="true" /></span>
            <div className="saved-question-copy"><strong>第{["一", "二", "三"][lessonIndex]}課 · 第 {questionIndex + 1} 題</strong><small>{lessons[lessonIndex].title} · 聽寫</small></div>
            <div className="saved-question-actions">
              <button type="button" onClick={() => speak(exercises[lessonIndex].questions[questionIndex].audioText)} aria-label={`播放第${["一", "二", "三"][lessonIndex]}課第${questionIndex + 1}題`}><SpeakerHigh size={18} aria-hidden="true" /> 播放</button>
              <button type="button" className="saved-start" onClick={() => openSavedQuestion(lessonIndex, questionIndex)}>重練這題</button>
              <button type="button" className="saved-remove" onClick={() => removeQuestion(lessonIndex, questionIndex)}>取消收藏</button>
            </div>
          </div>
        ))}
      </div> : <div className="empty-reinforce"><span>☆</span><strong>目前沒有收藏題目</strong><small>聽寫時按「需要補強」會自動收藏，也可以在家長判定時手動收藏。</small></div>}
      <div className="practice-summary"><div className="summary-score"><span>完成聽寫</span><strong>{practiceState.completedSessions}</strong><small>次</small></div><div className="summary-copy"><span className="eyebrow">KEEP GOING</span><h2>每天 5 分鐘，慢慢變熟悉。</h2><p>完成一個小練習，就是很棒的進度。</p></div><span className="summary-doodle">✦</span></div>
      <div className="practice-list"><div className="section-title-row"><h2>最近練習</h2><span className="list-count">{practiceState.recentLesson === null ? "0 個紀錄" : "1 個紀錄"}</span></div>
        {practiceState.recentLesson === null ? <p className="practice-no-recent">還沒有練習紀錄，先選一課開始吧。</p> : <button className="practice-row" type="button" onClick={() => openLesson(practiceState.recentLesson!)}><span className="practice-row-icon">{String(practiceState.recentLesson + 1).padStart(2, "0")}</span><span><strong>第{["一", "二", "三"][practiceState.recentLesson]}課・{lessons[practiceState.recentLesson].title}</strong><small>回到課程</small></span><b>繼續 <span>→</span></b></button>}
      </div>
    </section>
  );

  const renderMore = () => (
    <section className="page-section more-page">
      <SectionHeading eyebrow="MORE" title="更多" description="簡單的說明與設定，陪孩子一起練習。" />
      <div className="more-list"><button type="button"><span className="more-list-icon mint"><Question size={21} weight="bold" /></span><span><strong>使用說明</strong><small>第一次使用，先看這裡</small></span><b>→</b></button><button type="button"><span className="more-list-icon sky"><Heart size={21} weight="duotone" /></span><span><strong>給家長的話</strong><small>為什麼不需要孩子註冊</small></span><b>→</b></button><button type="button"><span className="more-list-icon cream"><MusicNotes size={21} weight="duotone" /></span><span><strong>聽寫設定</strong><small>目前播放 2 次 · 每題 30 秒</small></span><b>→</b></button><button type="button"><span className="more-list-icon coral"><Info size={21} weight="bold" /></span><span><strong>關於這個網站</strong><small>第一版測試版本 · v0.1</small></span><b>→</b></button></div>
      <div className="privacy-card"><span>◌</span><p><strong>這裡不收集孩子的個人資料</strong><small>不需要姓名、Email 或帳號，練習紀錄只留在目前的裝置上。</small></p></div>
    </section>
  );

  const renderResult = () => (
    <section className="page-section result-page">
      <div className="result-celebration"><span className="result-spark">✦</span><div className="result-check">✓</div><span className="result-spark right">✦</span></div>
      <span className="eyebrow">PRACTICE COMPLETE</span><h1>練習完成！</h1><p className="result-intro">今天的第{lessonNumber}課，你已經往前走了一小步。</p>
      <div className="result-card"><div><span className="result-icon fill"><PencilLine size={22} weight="duotone" /></span><span><strong>課文默寫</strong><small>直式注音格 · {completedFillLessons.includes(selectedLesson) ? "已完成" : "尚未練習"}</small></span><b>{completedFillLessons.includes(selectedLesson) ? "✓" : "—"}</b></div><div><span className="result-icon listen"><Headphones size={22} weight="duotone" /></span><span><strong>聽寫</strong><small>{sessionScore.listeningCorrect} / {listeningQuestions.length} 題完成</small></span><b>✓</b></div></div>
      <div className="result-note"><span>☼</span><p><strong>本次需要補強：{reviewedIndexes.length} 題</strong><small>{reviewedIndexes.length ? "需要補強的題目已加入「練習」，可以單題重練或取消收藏。" : "沒有需要補強的題目；手動收藏的題目也可以在「練習」重練。"}</small></p></div>
      <div className="result-actions"><button className="primary-button" type="button" onClick={openListening}>再練一次 <span>↻</span></button><button className="secondary-button" type="button" onClick={() => setView("practice")}>查看收藏</button><button className="secondary-button" type="button" onClick={() => setView("lesson")}>回到課次</button></div>
    </section>
  );

  const renderFocusMode = () => {
    const choiceAnswers = [currentQuestion.answer, ...currentQuestion.distractors];
    return (
    <main className={`focus-shell phase-${listenPhase}`}>
      <header className="focus-topbar"><button type="button" className="focus-exit" onClick={leaveFocus}>← <span>離開</span></button><div className="focus-question"><strong>第 {listenIndex + 1} 題 {!singleQuestionPractice && <em>/ {listeningQuestions.length}</em>}</strong></div><div className="focus-meta"><span className={secondsLeft <= 8 && (listenPhase === "active" || listenPhase === "retry") ? "urgent" : ""}><Timer size={14} weight="bold" /> {listenPhase === "retry_ready" ? "待重寫" : listenPhase === "review" || listenPhase === "choice" ? "已交卷" : `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`}</span><span aria-label={`已播放 ${playCount} 次`}><SpeakerHigh size={14} weight="bold" /> {playCount} 次</span></div></header>
      <div className="focus-content">
        <p className="sr-only" aria-live="polite">{listenMessage}</p>
        <div className={`canvas-zone ${listenPhase === "review" || listenPhase === "choice" || listenPhase === "retry_ready" ? "is-locked" : ""}`}><div className="canvas-paper"><canvas ref={canvasRef} onPointerDown={beginDrawing} onPointerMove={draw} onPointerUp={endDrawing} onPointerCancel={endDrawing} onPointerLeave={endDrawing} aria-label="田字格手寫區" />{listenPhase === "choice" && <div className="canvas-replay-overlay"><button type="button" className="canvas-replay-button" onClick={replayQuestion} aria-label="再播放一次題目"><Play size={30} weight="fill" aria-hidden="true" /></button><span>點一下，再聽一次</span></div>}{listenPhase === "retry_ready" && <div className="canvas-replay-overlay retry-ready-overlay"><strong>答對了！再聽一次，重新寫。</strong><button type="button" onClick={startRetryWriting}><Play size={22} weight="fill" aria-hidden="true" /> 再聽一次並重寫</button></div>}</div><div className="canvas-toolbar"><span>田字格</span><button type="button" onClick={clearCanvas} disabled={listenPhase !== "active" && listenPhase !== "retry"}>清除</button></div></div>
        {listenPhase === "ready" && <button type="button" className="listen-start-button" onClick={startListening}><span className="play-circle"><Play size={17} weight="fill" /></span><span><strong>開始聽</strong><small>播放 2 次 · 作答 30 秒</small></span><b><ArrowRight size={19} /></b></button>}
        {listenPhase === "active" && <button type="button" className="early-submit-button" onClick={() => finishListening(true)}>提早交卷</button>}
        {listenPhase === "review" && <div className="parent-review"><div className="answer-reveal"><span>正確答案</span><ZhuyinStack text={currentQuestion.answer} /></div><p>{hasInk ? "請家長依照孩子的手寫內容判定。" : "還沒有手寫內容；可以先按「需要補強」再練一次。"}</p><div className="review-actions"><button type="button" className="review-correct" disabled={!hasInk} onClick={() => handleParentDecision("correct")}>✓ 答對</button><button type="button" className="review-retry" onClick={() => handleParentDecision("needs_review")}>↻ 需要補強</button></div><button type="button" className={`review-save ${currentQuestionSaved ? "is-saved" : ""}`} aria-pressed={currentQuestionSaved} onClick={toggleCurrentQuestionSaved}>{currentQuestionSaved ? "★ 已收藏 · 取消收藏" : "☆ 收藏這題，之後再練"}</button></div>}
        {listenPhase === "choice" && <div className="choice-panel"><div className="choice-options">{choiceAnswers.map((answer) => <button type="button" key={answer} onClick={() => selectRemediation(answer)}><ZhuyinStack text={answer} /></button>)}</div><p>{retryMessage || "選出你剛剛聽到的完整音節。"}</p></div>}
        {listenPhase === "retry" && <div className="retry-actions"><button type="button" className="retry-replay" onClick={replayQuestion}><SpeakerHigh size={18} aria-hidden="true" /> 再聽一次</button><button type="button" className="retry-submit" disabled={!hasInk} onClick={submitRetryWriting}>我寫好了，請家長看看 <span>→</span></button></div>}
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
  if (view === "fill" && fillReviewLine !== null) return renderFillReview();

  return (
    <div className="app-shell">
      <AppHeader onHome={() => setView("home")} onBackToCourses={view === "lesson" ? () => setView("courses") : undefined} />
      <main className="main-content">{renderMain()}</main>
      <BottomNav active={view === "lesson" || view === "fill" || view === "result" ? "courses" : view} onNavigate={navigate} />
    </div>
  );
}

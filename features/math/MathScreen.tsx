import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Acorn,
  Balloon,
  Bird,
  Butterfly,
  Car,
  Carrot,
  Check,
  Fish,
  FlowerTulip,
  Heart,
  IceCream,
  Leaf,
  Play,
  Star,
  type Icon,
} from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import type { InkStroke } from "../types";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import { InkStatus, InkTools } from "../../components/InkTools";
import { InkPreview } from "../../components/AppChrome";
import {
  clearMathRound,
  isAnswered,
  newMathRound,
  readMathRound,
  recordMathRound,
  writeMathRound,
  type CountIcon,
  type MathQuestion,
  type MathRound,
} from "./math-round";
import { chineseNumber, mathPromptId, mathPromptUrl, mathPrompts } from "./math-audio";
import { mathLessons, type MathLesson } from "./math-lessons";
import { MathHeader, MathPrompt, MathStartButton } from "./MathChrome";

type MathApp = Pick<AppController, "speak" | "stopPlayback" | "navigate" | "mathLessonId">;

const CompareLesson = lazy(() =>
  Promise.all([import("./CompareLesson"), import("../../styles/lazy/math-compare.css")]).then(
    ([module]) => ({ default: module.CompareLesson }),
  ),
);

const icons: Record<CountIcon, { icon: Icon; color: string; name: string }> = {
  fish: { icon: Fish, color: "#2f8fd8", name: "魚" },
  bird: { icon: Bird, color: "#e58a2c", name: "小鳥" },
  tulip: { icon: FlowerTulip, color: "#e0567a", name: "花" },
  star: { icon: Star, color: "#e8b21f", name: "星星" },
  heart: { icon: Heart, color: "#e24b5a", name: "愛心" },
  car: { icon: Car, color: "#3d7bd9", name: "汽車" },
  iceCream: { icon: IceCream, color: "#c86bd6", name: "冰淇淋" },
  carrot: { icon: Carrot, color: "#ef7d1f", name: "紅蘿蔔" },
  balloon: { icon: Balloon, color: "#e0485d", name: "氣球" },
  butterfly: { icon: Butterfly, color: "#7b62d6", name: "蝴蝶" },
  acorn: { icon: Acorn, color: "#a0672d", name: "橡實" },
  leaf: { icon: Leaf, color: "#3f9b4f", name: "葉子" },
};

const sectionLabel = (question: MathQuestion) => (question.kind === "count" ? "數一數" : "畫圈圈");

/** Pictures in rows of five, the way a child lines things up to count them. */
function CountPictures({
  question,
  marked,
  onToggle,
  small = false,
}: {
  question: Extract<MathQuestion, { kind: "count" }>;
  marked?: ReadonlySet<number>;
  onToggle?: (index: number) => void;
  small?: boolean;
}) {
  const { icon: Picture, color, name } = icons[question.icon];
  return (
    <div
      className={`math-pictures${small ? " is-small" : ""}`}
      role={onToggle ? "group" : "img"}
      aria-label={onToggle ? `${name}，點一下做記號` : `${question.target} 個${name}`}
    >
      {Array.from({ length: question.target }, (_, index) =>
        onToggle ? (
          <button
            type="button"
            key={index}
            className={marked?.has(index) ? "is-marked" : undefined}
            aria-label={`第 ${index + 1} 個${name}`}
            aria-pressed={marked?.has(index) ?? false}
            onClick={() => onToggle(index)}
          >
            <Picture size={44} weight="fill" color={color} aria-hidden="true" />
            {marked?.has(index) && (
              <span className="math-picture-mark" aria-hidden="true">
                <Check size={16} weight="bold" />
              </span>
            )}
          </button>
        ) : (
          <span key={index}>
            <Picture size={22} weight="fill" color={color} aria-hidden="true" />
          </span>
        ),
      )}
    </div>
  );
}

/** One square to write or draw in, with the same pen, eraser and undo as dictation. */
function InkSquare({
  scope,
  initial,
  onChange,
  label,
  plain = false,
  children,
}: {
  scope: string;
  initial: InkStroke[];
  onChange: (strokes: InkStroke[]) => void;
  label: string;
  plain?: boolean;
  children?: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ink = useInkCanvas({
    scope,
    mounted: true,
    enabled: true,
    count: 1,
    getCanvas: () => canvasRef.current,
    readInitial: () => initial,
    onChange: (_, strokes) => onChange(strokes),
  });
  return (
    <div className="math-ink">
      <InkTools
        erasing={ink.eraserCell === 0}
        hasInk={Boolean(ink.ink[0])}
        canUndo={Boolean(ink.undoAvailable[0])}
        onEraser={() => ink.toggleEraser(0)}
        onUndo={() => ink.undo(0)}
        onClear={() => ink.clear(0)}
      />
      <div className={`canvas-paper math-paper${plain ? " is-plain" : ""}`}>
        <canvas
          ref={canvasRef}
          className={ink.eraserCell === 0 ? "is-erasing" : undefined}
          onPointerDown={ink.begin}
          onPointerMove={ink.move}
          onPointerUp={ink.end}
          onPointerCancel={ink.end}
          onLostPointerCapture={ink.end}
          aria-label={label}
        />
        {children}
      </div>
      <InkStatus message={ink.notice} />
    </div>
  );
}

/** While drawing circles, each stroke shows its number, so a child sees how many so far. */
function StrokeNumbers({ strokes }: { strokes: InkStroke[] }) {
  return (
    <div className="math-stroke-numbers" aria-live="polite">
      {strokes.map((stroke, index) => {
        const xs = stroke.map((point) => point.x);
        const ys = stroke.map((point) => point.y);
        const left = Math.min(98, Math.max(...xs) + 1);
        const top = Math.max(2, Math.min(...ys) - 1);
        return (
          <span key={index} style={{ left: `${left}%`, top: `${top}%` }}>
            {index + 1}
          </span>
        );
      })}
      <span className="visually-hidden">畫了 {strokes.length} 個</span>
    </div>
  );
}

export function MathScreen({ app }: { app: MathApp }) {
  const lesson = mathLessons.find((item) => item.id === app.mathLessonId) ?? mathLessons[0];
  if (lesson.id === 2)
    return (
      <Suspense
        fallback={
          <main className="math-shell">
            <p className="feature-loading" role="status">
              正在準備練習…
            </p>
          </main>
        }
      >
        <CompareLesson app={app} lesson={lesson} />
      </Suspense>
    );
  return <CountingLesson app={app} lesson={lesson} />;
}

/** 第一課 認識 1～10: write and draw, then the parent checks the round. */
function CountingLesson({ app, lesson }: { app: MathApp; lesson: MathLesson }) {
  const [saved] = useState(() => {
    const round = readMathRound();
    return round?.lessonId === lesson.id ? round : null;
  });
  const [round, setRound] = useState<MathRound | null>(null);
  const [marked, setMarked] = useState<ReadonlySet<number>>(new Set());
  const [finished, setFinished] = useState<MathRound | null>(null);
  const { speak, stopPlayback } = app;

  // Every change is saved, so a reload or a closed app continues the same round.
  useEffect(() => {
    if (round) writeMathRound({ ...round, savedAt: Date.now() });
  }, [round]);
  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const play = (question: MathQuestion) =>
    speak(mathPrompts[mathPromptId(question)], { url: mathPromptUrl(mathPromptId(question)) });

  const goTo = (current: MathRound, index: number) => {
    setMarked(new Set());
    setRound({ ...current, index });
    play(current.questions[index]);
  };
  const start = (next: MathRound) => {
    setFinished(null);
    if (next.phase === "check") return setRound(next);
    goTo(next, next.index);
  };
  const leave = () => {
    stopPlayback();
    app.navigate("courses");
  };

  const header = (title: string, detail?: string) => (
    <MathHeader title={title} detail={detail} onLeave={leave} />
  );

  if (finished) {
    const needs = finished.needsPractice.map((index) => finished.questions[index]);
    return (
      <main className="math-shell">
        {header(`${lesson.number} · ${lesson.title}`)}
        <section className="math-result">
          <h1>練習完成！</h1>
          <p>
            {finished.questions.length} 題都寫完了
            {needs.length
              ? `，有 ${needs.length} 題要再練習：${needs.map((question) => `${sectionLabel(question)} ${question.target}`).join("、")}。`
              : "，全部都會了！"}
          </p>
          <div className="math-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => start(newMathRound(lesson.id))}
            >
              再練一次
            </button>
            <button type="button" className="secondary-button" onClick={leave}>
              回到課程
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!round)
    return (
      <main className="math-shell">
        {header(`${lesson.number} · ${lesson.title}`)}
        <section className="math-ready">
          <h1>{lesson.title}</h1>
          <p>{lesson.round}</p>
          {saved ? (
            <div className="math-actions">
              <button type="button" className="primary-button" onClick={() => start(saved)}>
                <Play size={22} weight="fill" aria-hidden="true" />
                繼續上次的練習
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  clearMathRound();
                  start(newMathRound(lesson.id));
                }}
              >
                重新開始
              </button>
            </div>
          ) : (
            <MathStartButton onStart={() => start(newMathRound(lesson.id))} />
          )}
        </section>
      </main>
    );

  if (round.phase === "check") {
    const toggle = (index: number) =>
      setRound({
        ...round,
        needsPractice: round.needsPractice.includes(index)
          ? round.needsPractice.filter((item) => item !== index)
          : [...round.needsPractice, index],
      });
    return (
      <main className="math-shell is-check">
        {header(`${lesson.number} · 家長檢查`)}
        <section className="math-check">
          <h1>請家長一起檢查</h1>
          <p>對照答案，把還不會的題目標成「需要補強」。也可以看看孩子哪些數字還不熟。</p>
          {round.questions.map((question, index) => {
            const strokes = round.ink[index] ?? [];
            const pending = round.needsPractice.includes(index);
            return (
              <article className="math-check-card" key={index}>
                <h2>
                  第 {index + 1} 題 · {sectionLabel(question)}
                </h2>
                <div className="math-check-row">
                  <div className="math-check-question">
                    {question.kind === "count" ? (
                      <CountPictures question={question} small />
                    ) : (
                      <span className="math-check-draw">畫出 {question.target} 個圈圈</span>
                    )}
                  </div>
                  <div className="math-check-answer">
                    <span className="math-check-label">孩子寫的</span>
                    <div className="math-check-ink">
                      {strokes.length ? <InkPreview strokes={strokes} /> : <span>沒有作答</span>}
                    </div>
                    {question.kind === "draw" && strokes.length > 0 && (
                      <small>畫了 {strokes.length} 筆</small>
                    )}
                  </div>
                  <div className="math-check-key">
                    <span className="math-check-label">答案</span>
                    <strong>{question.target}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="math-check-toggle"
                  aria-pressed={pending}
                  onClick={() => toggle(index)}
                >
                  {pending ? "✓ 需要補強" : "需要補強"}
                </button>
              </article>
            );
          })}
          <button
            type="button"
            className="primary-button math-check-finish"
            onClick={() => {
              recordMathRound(round);
              clearMathRound();
              setFinished(round);
              setRound(null);
            }}
          >
            檢查完成
          </button>
        </section>
      </main>
    );
  }

  const question = round.questions[round.index];
  const strokes = round.ink[round.index] ?? [];
  const last = round.index === round.questions.length - 1;
  const setInk = (next: InkStroke[]) =>
    setRound((current) =>
      current ? { ...current, ink: { ...current.ink, [current.index]: next } } : current,
    );
  return (
    <main className="math-shell">
      {header(
        `${lesson.number} · ${sectionLabel(question)}`,
        `第 ${round.index + 1} 題 / ${round.questions.length}`,
      )}
      <section className={`math-question is-${question.kind}`}>
        <MathPrompt id={mathPromptId(question)} onPlay={() => play(question)} />
        {question.kind === "count" ? (
          <div className="math-count">
            <CountPictures
              question={question}
              marked={marked}
              onToggle={(index) =>
                setMarked((current) => {
                  const next = new Set(current);
                  if (next.has(index)) next.delete(index);
                  else next.add(index);
                  return next;
                })
              }
            />
            <InkSquare
              scope={`math:${round.createdAt}:${round.index}`}
              initial={strokes}
              onChange={setInk}
              label="寫數字"
            />
          </div>
        ) : (
          <div className="math-draw">
            <div className="math-draw-target" aria-hidden="true">
              <strong>{question.target}</strong>
              <span>畫出{chineseNumber(question.target)}個</span>
            </div>
            <InkSquare
              scope={`math:${round.createdAt}:${round.index}`}
              initial={strokes}
              onChange={setInk}
              label={`畫出 ${question.target} 個圈圈`}
              plain
            >
              <StrokeNumbers strokes={strokes} />
            </InkSquare>
          </div>
        )}
        <nav className="math-nav" aria-label="題目">
          <button
            type="button"
            disabled={round.index === 0}
            onClick={() => goTo(round, round.index - 1)}
          >
            上一題
          </button>
          {last ? (
            <button
              type="button"
              className="is-primary"
              onClick={() => {
                stopPlayback();
                setRound({
                  ...round,
                  phase: "check",
                  // Unanswered questions start marked; the parent can clear any mark.
                  needsPractice: round.questions
                    .map((_, index) => index)
                    .filter((index) => !isAnswered(round, index)),
                });
              }}
            >
              寫完了，請家長檢查
            </button>
          ) : (
            <button
              type="button"
              className="is-primary"
              onClick={() => goTo(round, round.index + 1)}
            >
              下一題
            </button>
          )}
        </nav>
      </section>
    </main>
  );
}

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowCounterClockwise,
  CheckCircle,
  SpeakerHigh,
  X,
  XCircle,
} from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import type { InkStroke } from "../types";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import { clipOf, useSay } from "./clip-voice";
import { MathHeader, MathResult } from "../math/MathChrome";
import { mathPromptUrl, mathPrompts } from "../math/math-audio";
import { HanziWords } from "./HanziChrome";
import { fromSquare, judgeStroke, screenMedian, type Point } from "./stroke-match";
import {
  basicStrokes,
  buildStrokeRound,
  strokeNamed,
  strokePages,
  strokePrompts,
  strokeReading,
  type StrokePage,
  type StrokeQuestion,
} from "./basic-strokes";
import strokeData from "./strokes.json";
import exampleData from "./stroke-examples.json";
import "../../styles/lazy/hanzi.css";

type Glyph = { strokes: string[]; medians: number[][][] };
const glyphs: Record<string, Glyph> = { ...strokeData, ...exampleData };

/** The outline's points (control points too, which is close enough for a box), y down. */
const outlinePoints = (path: string): Point[] => {
  const numbers = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const points: Point[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2)
    points.push({ x: numbers[i], y: 900 - numbers[i + 1] });
  return points;
};

/**
 * One stroke of a basic stroke's example character, moved to the middle of the 1024 box and
 * grown to about `size` (but not past `most` times, so a 點 stays a 點).
 */
function strokeShape(name: string, size: number, most: number) {
  const { character, strokes } = strokeNamed(name).find;
  const glyph = glyphs[character];
  const path = glyph.strokes[strokes[0]];
  const points = outlinePoints(path);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min(most, size / Math.max(x1 - x0, y1 - y0));
  const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
  const place = ({ x, y }: Point): Point => ({
    x: 512 + (x - cx) * scale,
    y: 512 + (y - cy) * scale,
  });
  return {
    path,
    /** From the data's coordinates (y up from 900) to the box. */
    transform: `translate(512 512) scale(${scale}) translate(${-cx} ${-cy}) matrix(1 0 0 -1 0 900)`,
    median: screenMedian(glyph.medians[strokes[0]]).map(place),
  };
}

/** A basic stroke drawn alone in its box. */
function StrokeShape({ name, className }: { name: string; className?: string }) {
  const shape = strokeShape(name, 700, 2.4);
  return (
    <svg className={`stroke-shape ${className ?? ""}`} viewBox="0 0 1024 1024" aria-hidden="true">
      <path d={shape.path} transform={shape.transform} />
    </svg>
  );
}

/** A stroke's name in 國字注音. */
function StrokeName({ name }: { name: string }) {
  return <HanziWords text={name} />;
}

const nameClip = (name: string) => ({ text: name, readings: strokeReading(name) });

/**
 * 認識國字基本筆畫's page: a card for each of the book's four pages, then every stroke to tap
 * and hear, as the book shows them.
 */
export function StrokeLessonPage({
  app,
}: {
  app: Pick<AppController, "startHanziStrokes" | "speak">;
}) {
  const say = useSay(app);
  return (
    <section className="page-section lesson-page math-lesson-page hanzi-lesson-page stroke-lesson-page">
      <div className="lesson-heading">
        <div>
          <span className="eyebrow">
            <HanziWords text="先學筆畫" />
          </span>
          <h1 className="lesson-title">
            <HanziWords text="認識國字基本筆畫" />
          </h1>
        </div>
      </div>
      <div className="mode-grid stroke-pages">
        {strokePages.map((page) => {
          const strokes = basicStrokes.filter((stroke) => stroke.page === page);
          return (
            <button
              key={page}
              className="mode-card listen-mode stroke-page-card"
              type="button"
              aria-label={`課本第 ${page} 頁，${strokes.map((stroke) => stroke.name).join("、")}`}
              onClick={() => app.startHanziStrokes(page)}
            >
              <span className="stroke-page-shapes" aria-hidden="true">
                {strokes.map((stroke) => (
                  <StrokeShape key={stroke.name} name={stroke.name} />
                ))}
              </span>
              <span className="lesson-mode-copy">
                <small>
                  <HanziWords text="課本第" /> {page} <HanziWords text="頁" />
                </small>
                <strong>
                  {strokes.length} <HanziWords text="種筆畫" />
                </strong>
              </span>
              <span className="lesson-mode-cta">
                <HanziWords text="開始" /> <ArrowRight size={19} weight="bold" aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
      <div className="math-lesson-parts hanzi-lesson-parts stroke-chart">
        <h2>
          <HanziWords text="筆畫表" />
        </h2>
        <p className="hanzi-parts-note">
          <HanziWords text="點一點，聽一聽" />
        </p>
        <div className="stroke-chart-grid">
          {basicStrokes.map((stroke) => (
            <button
              key={stroke.name}
              type="button"
              className="stroke-chart-card"
              aria-label={stroke.name}
              onClick={() => say([nameClip(stroke.name)])}
            >
              <StrokeShape name={stroke.name} />
              <span className="stroke-chart-name">
                <StrokeName name={stroke.name} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

type StrokeApp = Pick<
  AppController,
  "hanziStrokePage" | "navigate" | "speak" | "stopPlayback" | "awardStamp"
>;

const correctDelay = 1300;
const retryDelay = 900;

/** One page's round: 描一描 each stroke, then 聽名稱找筆畫 and 在字裡找筆畫. */
export function StrokeScreen({ app }: { app: StrokeApp }) {
  const page = app.hanziStrokePage;
  const [round, setRound] = useState(() => buildStrokeRound(page));
  const [index, setIndex] = useState(0);
  /** Questions that took more than one try. */
  const [missed, setMissed] = useState<Set<number>>(() => new Set());
  const [finished, setFinished] = useState(false);
  const leave = () => {
    app.stopPlayback();
    app.navigate("hanzi-lesson");
  };
  const question = round[index];
  const next = () => {
    if (index + 1 < round.length) {
      setIndex(index + 1);
      return;
    }
    app.awardStamp({
      kind: "practice",
      subject: "zhuyin",
      detail: `第一冊 基本筆畫 第 ${page} 頁`,
      needsPractice: missed.size,
    });
    setFinished(true);
  };
  return (
    <main className="math-shell hanzi-shell stroke-shell">
      <MathHeader
        title={`基本筆畫 · 第 ${page} 頁`}
        detail={finished ? undefined : `第 ${index + 1} 題 / ${round.length}`}
        onLeave={leave}
      />
      {finished ? (
        <MathResult
          title="筆畫練習完成！"
          note={missed.size ? `有 ${missed.size} 題多試了幾次。` : "每一題都一次就做對了！"}
          onAgain={() => {
            setRound(buildStrokeRound(page));
            setIndex(0);
            setMissed(new Set());
            setFinished(false);
          }}
          onLeave={leave}
        />
      ) : (
        <StrokeQuestionView
          key={`${index}:${question.kind}:${question.stroke}`}
          question={question}
          app={app}
          onMiss={() => setMissed((current) => new Set(current).add(index))}
          onDone={next}
        />
      )}
    </main>
  );
}

function StrokeQuestionView({
  question,
  app,
  onMiss,
  onDone,
}: {
  question: StrokeQuestion;
  app: StrokeApp;
  onMiss: () => void;
  onDone: () => void;
}) {
  const say = useSay(app);
  const prompt = strokePrompts[question.kind];
  const ask = () => say([prompt, nameClip(question.stroke)]);
  // Until the clips are recorded, the parent reads the question.
  const voiced = Boolean(clipOf(prompt) ?? clipOf(nameClip(question.stroke)));
  const askOnce = useEffectEvent(ask);
  useEffect(() => {
    askOnce();
  }, []);
  const feedbackVoice = (kind: "correct" | "retry") =>
    app.speak(mathPrompts[kind], { url: mathPromptUrl(kind), onError: () => {} });
  return (
    <section className={`hanzi-practice stroke-question is-${question.kind}`}>
      <div className="hanzi-prompt stroke-prompt">
        <button
          type="button"
          className="hanzi-say"
          onClick={ask}
          disabled={!voiced}
          aria-label="再聽一次"
        >
          <SpeakerHigh size={30} weight="fill" aria-hidden="true" />
        </button>
        <p className="stroke-prompt-text">
          <HanziWords text={prompt.text} />
          <strong>
            <StrokeName name={question.stroke} />
          </strong>
        </p>
      </div>
      {question.kind === "trace" ? (
        <TraceStroke
          name={question.stroke}
          onMiss={onMiss}
          onRight={() => feedbackVoice("correct")}
          onDone={onDone}
        />
      ) : (
        <TapStroke question={question} onMiss={onMiss} voice={feedbackVoice} onDone={onDone} />
      )}
    </section>
  );
}

/** 描一描: the stroke pale with where it starts and which way it goes; the child traces it. */
function TraceStroke({
  name,
  onMiss,
  onRight,
  onDone,
}: {
  name: string;
  onMiss: () => void;
  onRight: () => void;
  onDone: () => void;
}) {
  const id = useId().replace(/:/g, "");
  const shape = strokeShape(name, 640, 1.7);
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState(false);
  const [mark, setMark] = useState<{ x: number; y: number; key: number }>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const latest = useRef<InkStroke[]>([]);
  const timer = useRef<number | null>(null);
  const ink = useInkCanvas({
    scope: `${name}:${attempt}`,
    mounted: true,
    enabled: !done,
    count: 1,
    getCanvas: () => canvasRef.current,
    onChange: (_, strokes) => {
      latest.current = strokes;
      if (timer.current !== null) window.clearTimeout(timer.current);
      // A pen that skips comes back within 120 ms and continues the same stroke.
      timer.current = window.setTimeout(judge, 150);
    },
  });
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  function judge() {
    timer.current = null;
    if (ink.activeStrokeRef.current) return;
    const written = latest.current.at(-1);
    if (!written?.length) return;
    if (judgeStroke(written.map(fromSquare), [shape.median], 0, 1.3) === "match") {
      setDone(true);
      setMark(undefined);
      onRight();
      return;
    }
    onMiss();
    const end = written.at(-1)!;
    setMark((last) => ({ x: end.x, y: end.y, key: (last?.key ?? 0) + 1 }));
    timer.current = window.setTimeout(() => {
      timer.current = null;
      ink.reset();
      latest.current = [];
    }, 700);
  }
  const start = shape.median[0];
  const median = `M ${shape.median.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
  return (
    <>
      <div className={`hanzi-square stroke-trace${done ? " is-done" : ""}`}>
        <svg className="hanzi-grid" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M 50 0 V 100 M 0 50 H 100" />
        </svg>
        <svg
          className={`hanzi-glyph${done ? " is-finished" : ""}`}
          viewBox="0 0 1024 1024"
          aria-hidden="true"
        >
          <defs>
            <marker
              id={`${id}-arrow`}
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="hanzi-arrow-head" />
            </marker>
          </defs>
          <path
            d={shape.path}
            transform={shape.transform}
            className={done ? "hanzi-ink" : "hanzi-model is-trace is-next"}
          />
          {!done && (
            <>
              <path d={median} className="hanzi-hint-path" markerEnd={`url(#${id}-arrow)`} />
              <g className="hanzi-start">
                <circle cx={start.x} cy={start.y} r="42" />
              </g>
            </>
          )}
        </svg>
        <canvas
          key={attempt}
          ref={canvasRef}
          className="hanzi-canvas"
          aria-label={`描「${name}」`}
          onPointerDown={ink.begin}
          onPointerMove={ink.move}
          onPointerUp={ink.end}
          onPointerCancel={ink.end}
        />
        {mark && (
          <span
            key={mark.key}
            className="hanzi-mark"
            style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
            aria-hidden="true"
          >
            <X size={34} weight="bold" />
          </span>
        )}
      </div>
      <p className="hanzi-feedback" role="status">
        {done ? <HanziWords text="描對了" /> : mark ? <HanziWords text="再試一次" /> : ""}
      </p>
      {done && (
        <div className="hanzi-next">
          <button
            type="button"
            className="hanzi-again"
            onClick={() => {
              ink.reset();
              latest.current = [];
              setDone(false);
              setAttempt(attempt + 1);
            }}
          >
            <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" />
            <HanziWords text="再描一次" />
          </button>
          <button type="button" className="hanzi-go-next" onClick={onDone}>
            <HanziWords text="下一題" />
            <ArrowRight size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}

/** Distance from a point to a polyline. */
function distanceToPath(point: Point, path: Point[]) {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const [a, b] = [path[i - 1], path[i]];
    const [dx, dy] = [b.x - a.x, b.y - a.y];
    const t = Math.max(
      0,
      Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
    );
    best = Math.min(best, Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy));
  }
  return best;
}

/**
 * 聽名稱找筆畫 (the stroke among four) and 在字裡找筆畫 (the stroke in a character): checked at
 * once and retried until right, like 辨音.
 */
function TapStroke({
  question,
  onMiss,
  voice,
  onDone,
}: {
  question: Exclude<StrokeQuestion, { kind: "trace" }>;
  onMiss: () => void;
  voice: (kind: "correct" | "retry") => void;
  onDone: () => void;
}) {
  const [feedback, setFeedback] = useState<{ kind: "correct" | "retry"; pick: number } | null>(
    null,
  );
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  const answer = (pick: number, right: boolean) => {
    if (feedback) return;
    if (right) {
      setFeedback({ kind: "correct", pick });
      voice("correct");
      timer.current = window.setTimeout(onDone, correctDelay);
      return;
    }
    onMiss();
    setFeedback({ kind: "retry", pick });
    voice("retry");
    timer.current = window.setTimeout(() => setFeedback(null), retryDelay);
  };
  const state = (pick: number) =>
    feedback?.pick === pick ? (feedback.kind === "correct" ? " is-correct" : " is-wrong") : "";
  return (
    <div className="stroke-stage">
      {question.kind === "pick" ? (
        <div className="stroke-choices">
          {question.choices.map((name, i) => (
            <button
              key={name}
              type="button"
              className={`stroke-choice${state(i)}`}
              aria-label={`第 ${i + 1} 個筆畫`}
              onClick={() => answer(i, name === question.stroke)}
            >
              <StrokeShape name={name} />
            </button>
          ))}
        </div>
      ) : (
        <FindInCharacter name={question.stroke} state={state} onAnswer={answer} />
      )}
      <span className="visually-hidden" role="status">
        {feedback?.kind === "correct" ? "答對了！" : feedback ? "再想想看" : ""}
      </span>
      {feedback && (
        <div className={`math-feedback is-${feedback.kind}`} aria-hidden="true">
          {feedback.kind === "correct" ? (
            <CheckCircle size={120} weight="fill" />
          ) : (
            <XCircle size={100} weight="fill" />
          )}
          <span>{feedback.kind === "correct" ? "答對了！" : "再想想看"}</span>
        </div>
      )}
    </div>
  );
}

/** The example character big; a tap picks the stroke nearest to it. */
function FindInCharacter({
  name,
  state,
  onAnswer,
}: {
  name: string;
  state: (stroke: number) => string;
  onAnswer: (stroke: number, right: boolean) => void;
}) {
  const { character, strokes: targets } = strokeNamed(name).find;
  const glyph = glyphs[character];
  const medians = glyph.medians.map(screenMedian);
  return (
    <div className="hanzi-square stroke-find">
      <svg className="hanzi-grid" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M 50 0 V 100 M 0 50 H 100" />
      </svg>
      <svg
        className="hanzi-glyph stroke-find-glyph"
        viewBox="0 0 1024 1024"
        role="img"
        aria-label={`「${character}」，點出${name}`}
        onPointerDown={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const at = {
            x: ((event.clientX - box.left) / box.width) * 1024,
            y: ((event.clientY - box.top) / box.height) * 1024,
          };
          const distances = medians.map((median) => distanceToPath(at, median));
          const nearest = distances.indexOf(Math.min(...distances));
          // A tap far from every stroke is not an answer.
          if (distances[nearest] > 150) return;
          onAnswer(nearest, targets.includes(nearest));
        }}
      >
        <g transform="matrix(1 0 0 -1 0 900)">
          {glyph.strokes.map((path, i) => (
            <path key={i} d={path} className={`stroke-find-part${state(i)}`} />
          ))}
        </g>
      </svg>
    </div>
  );
}

export type { StrokePage };

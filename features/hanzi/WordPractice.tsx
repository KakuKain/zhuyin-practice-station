import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from "react";
import {
  ArrowCounterClockwise,
  ArrowRight,
  CheckCircle,
  SpeakerHigh,
  X,
} from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import type { InkStroke } from "../types";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import { ZhuyinStack } from "../../components/Zhuyin";
import { registeredAudioUrl } from "../../lib/audio/audio-registry";
import { answerCells, type AnswerCell, type DictationWord } from "./book1-words";
import { cellSplit } from "./dictation";
import { HanziGlyph, HanziWords, characterStrokes } from "./HanziChrome";
import { fromSquare, judgeStroke, screenMedian, type StrokeVerdict } from "./stroke-match";
import { chime } from "./chime";

type WordApp = Pick<AppController, "speak">;
type Stage = "watch" | "trace" | "blank" | "done";
const stages: { stage: Stage; name: string }[] = [
  { stage: "watch", name: "看一看" },
  { stage: "trace", name: "描一描" },
  { stage: "blank", name: "寫一寫" },
];

/** A 語詞 as the sheet writes it: taught 生字 in 國字注音, the rest in 注音. */
export function WordAnswer({ cells }: { cells: AnswerCell[] }) {
  return (
    <span className="hanzi-word-answer">
      {cells.map((cell, i) =>
        cell.write === "國字" ? (
          <HanziWords key={i} text={cell.character} />
        ) : cell.write === "注音" ? (
          <span key={i} className="hanzi-word-zhuyin">
            <ZhuyinStack text={cell.reading} />
          </span>
        ) : (
          <span key={i}>{cell.character}</span>
        ),
      )}
    </span>
  );
}

/**
 * One 語詞, like the homework that writes each one twice: seen and heard, traced over the
 * pale 國字 and 注音, then written in empty cells. Every stroke of a 國字 is judged as the pen
 * lifts; the 注音 is the child's to copy.
 */
export function WordPractice({
  word,
  lessonId,
  app,
  onFinish,
  onAgain,
  onNext,
  next,
}: {
  word: DictationWord;
  lessonId: number;
  app: WordApp;
  onFinish: (hinted: boolean) => void;
  onAgain: () => void;
  onNext: () => void;
  next: string;
}) {
  const cells = answerCells(word, lessonId);
  const [stage, setStage] = useState<Stage>("watch");
  const [ready, setReady] = useState(false);
  const hinted = useRef(false);
  const reading = word.readings.replaceAll(" ", "|");
  const hasClip = registeredAudioUrl(word.text, reading) !== null;
  const say = () => {
    if (hasClip) app.speak(word.text, { pronunciation: reading, onError: () => {} });
  };
  const sayOnce = useEffectEvent(say);
  useEffect(() => {
    sayOnce();
  }, [word.text]);
  const order = stages.findIndex((item) => item.stage === stage);
  const advance = () => {
    setReady(false);
    if (stage === "watch") setStage("trace");
    else if (stage === "trace") setStage("blank");
    else if (stage === "blank") {
      setStage("done");
      onFinish(hinted.current);
    }
  };
  return (
    <section className="hanzi-practice hanzi-word-practice">
      <div className="hanzi-prompt">
        <button
          type="button"
          className="hanzi-say"
          onClick={say}
          disabled={!hasClip}
          aria-label="聽這個語詞"
        >
          <SpeakerHigh size={30} weight="fill" aria-hidden="true" />
        </button>
        <p className="hanzi-character">
          <WordAnswer cells={cells} />
        </p>
        <ol className="hanzi-steps" aria-label="步驟">
          {stages.map((item, i) => (
            <li
              key={item.stage}
              className={
                item.stage === stage ? "is-current" : i < order || stage === "done" ? "is-done" : ""
              }
              aria-current={item.stage === stage ? "step" : undefined}
            >
              <HanziWords text={item.name} />
            </li>
          ))}
        </ol>
      </div>
      <WordCells
        key={stage === "done" ? "blank" : stage}
        cells={cells}
        step={stage === "done" ? "blank" : stage}
        finished={stage === "done"}
        onStart={() => stage === "watch" && advance()}
        onProgress={(allDone, helped) => {
          hinted.current ||= helped;
          setReady(allDone);
        }}
      />
      {stage === "done" ? (
        <div className="hanzi-next">
          <button type="button" className="hanzi-again" onClick={onAgain}>
            <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" />
            <HanziWords text="再寫一次" />
          </button>
          <button
            type="button"
            className="hanzi-go-next"
            onClick={onNext}
            aria-label={`下一個語詞：${next}`}
          >
            <HanziWords text="下一個語詞" />
            <ArrowRight size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="hanzi-next">
          <button
            type="button"
            className="hanzi-go-next"
            onClick={advance}
            disabled={stage !== "watch" && !ready}
          >
            <HanziWords
              text={stage === "watch" ? "開始描" : stage === "trace" ? "描好了" : "寫好了"}
            />
            <ArrowRight size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

/** Where a cell's point is, in the 田字格's 0–100 square, or null in the 注音 strip. */
const toSquare = (stroke: InkStroke) => {
  const x = stroke.reduce((sum, point) => sum + point.x, 0) / stroke.length;
  return x < cellSplit
    ? stroke.map((point) =>
        fromSquare({ x: (point.x * 100) / cellSplit, y: (point.y * 100) / cellSplit }),
      )
    : null;
};
const leniency = { watch: 1, trace: 1, blank: 1.3 };

/**
 * A 語詞's cells: one square canvas each, its top three quarters shown (the 田字格 and its 注音
 * strip). Tracing shows the 國字 and 注音 pale; a 國字's strokes are judged in order, a wrong one
 * gets a ✗ and is taken back, two misses show where it starts. 注音 is never judged.
 */
function WordCells({
  cells,
  step,
  finished,
  onStart,
  onProgress,
}: {
  cells: AnswerCell[];
  step: Exclude<Stage, "done">;
  finished: boolean;
  onStart: () => void;
  onProgress: (allDone: boolean, hinted: boolean) => void;
}) {
  const totals = cells.map((cell) =>
    cell.write === "國字" ? (characterStrokes[cell.character]?.medians.length ?? 0) : 0,
  );
  const [done, setDone] = useState(() => totals.map((total) => (finished ? total : 0)));
  const [misses, setMisses] = useState(() => cells.map(() => 0));
  const [marks, setMarks] = useState<
    ({ x: number; y: number; verdict: StrokeVerdict; key: number } | undefined)[]
  >(() => cells.map(() => undefined));
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const latest = useRef<InkStroke[][]>(cells.map(() => []));
  const judged = useRef<number[]>(cells.map(() => 0));
  const timers = useRef<(number | null)[]>(cells.map(() => null));
  const progress = useRef({ done: done.slice(), misses: cells.map(() => 0), hinted: false });
  const ink = useInkCanvas({
    scope: `${cells.map((cell) => cell.character).join("")}:${step}`,
    mounted: true,
    enabled: !finished && step !== "watch",
    count: cells.length,
    getCanvas: (i) => canvases.current[i] ?? null,
    onChange: (i, strokes) => {
      latest.current[i] = strokes;
      if (cells[i].write !== "國字") return;
      const timer = timers.current[i];
      if (timer !== null) window.clearTimeout(timer);
      // Judged once the pen has stayed up past the 120 ms a skipping pen needs to come back.
      timers.current[i] = window.setTimeout(() => judge(i), 150);
    },
  });
  useEffect(
    () => () => {
      for (const timer of timers.current) if (timer !== null) window.clearTimeout(timer);
    },
    [],
  );
  const report = useEffectEvent(() =>
    onProgress(
      totals.every((total, i) => progress.current.done[i] >= total),
      progress.current.hinted,
    ),
  );
  useEffect(() => {
    report();
  }, [done]);

  function judge(i: number) {
    timers.current[i] = null;
    if (ink.activeStrokeRef.current) return;
    const strokes = latest.current[i].slice(judged.current[i]);
    judged.current[i] = latest.current[i].length;
    const medians = characterStrokes[cells[i].character].medians.map(screenMedian);
    let written = progress.current.done[i];
    let missed = progress.current.misses[i];
    let wrong: InkStroke | undefined;
    for (const stroke of strokes) {
      const points = stroke.length ? toSquare(stroke) : null;
      // 注音 in the strip is the child's own; only the 田字格 is judged.
      if (!points || written >= medians.length) continue;
      const verdict = judgeStroke(points, medians, written, leniency[step]);
      if (verdict === "match") {
        written += 1;
        missed = 0;
        wrong = undefined;
      } else {
        missed += 1;
        if (missed >= 2) progress.current.hinted = true;
        wrong = stroke;
        const end = stroke.at(-1)!;
        setMarks((current) =>
          current.map((mark, k) =>
            k === i ? { x: end.x, y: (end.y * 100) / cellSplit, verdict, key: Date.now() } : mark,
          ),
        );
      }
    }
    progress.current.done[i] = written;
    progress.current.misses[i] = missed;
    setDone(progress.current.done.slice());
    setMisses(progress.current.misses.slice());
    if (wrong) {
      chime("miss");
      // The wrong stroke is taken back once it is the last on the canvas and nothing waits.
      window.setTimeout(() => {
        if (
          !ink.activeStrokeRef.current &&
          latest.current[i].length === judged.current[i] &&
          latest.current[i].at(-1) === wrong
        ) {
          ink.undo(i);
          judged.current[i] -= 1;
          latest.current[i] = latest.current[i].slice(0, -1);
        }
      }, 450);
    } else {
      setMarks((current) => current.map((mark, k) => (k === i ? undefined : mark)));
      chime(written === medians.length ? "done" : "stroke");
    }
  }

  return (
    <div
      className="hanzi-dictation-cells hanzi-word-cells"
      style={{ "--cells": cells.length } as CSSProperties}
    >
      {cells.map((cell, i) => {
        const mark = marks[i];
        const complete = totals[i] > 0 && done[i] >= totals[i];
        return (
          <div className={`hanzi-cell${complete ? " is-complete" : ""}`} key={i}>
            <svg className="hanzi-cell-guides" viewBox="0 0 100 75" aria-hidden="true">
              <rect x="0.5" y="0.5" width="74" height="74" />
              <path d="M 37.5 0 V 75 M 0 37.5 H 75" className="is-dashed" />
              {cell.write !== "標點" && (
                <rect x="75" y="0.5" width="24.5" height="74" className="is-strip" />
              )}
            </svg>
            {cell.write === "國字" && (
              <span className="hanzi-cell-model">
                <HanziGlyph
                  character={cell.character}
                  model={step === "blank" ? "none" : "trace"}
                  done={done[i]}
                  next={!finished && !complete && (step === "trace" || misses[i] >= 2)}
                  hint={!finished && !complete && misses[i] >= 2}
                  demo={null}
                  finished={false}
                  inked={false}
                />
              </span>
            )}
            {step !== "blank" && cell.write !== "標點" && (
              <span
                className={`hanzi-cell-zhuyin-model${cell.write === "注音" ? " is-in-square" : ""}`}
                aria-hidden="true"
              >
                <ZhuyinStack text={cell.reading} />
              </span>
            )}
            {step !== "blank" && cell.write === "標點" && (
              <span className="hanzi-cell-mark-model" aria-hidden="true">
                {cell.character}
              </span>
            )}
            <canvas
              ref={(element) => {
                canvases.current[i] = element;
              }}
              data-word-index={i}
              className="hanzi-cell-canvas"
              aria-label={`第 ${i + 1} 個字`}
              onPointerDown={(event) => {
                if (step === "watch") onStart();
                else ink.begin(event);
              }}
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
                <X size={28} weight="bold" />
              </span>
            )}
            {complete && (
              <CheckCircle className="hanzi-cell-done" size={24} weight="fill" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}

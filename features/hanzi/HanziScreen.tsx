import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ArrowCounterClockwise, SpeakerHigh, X } from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import type { InkStroke } from "../types";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import { registeredAudioUrl } from "../../lib/audio/audio-registry";
import { taskKeys } from "../rewards/stamp-book";
import { MathHeader, MathResult } from "../math/MathChrome";
import { book1Facts, book1LessonLabel, book1Lessons, book1Readings } from "./book1-characters";
import { HanziGlyph, HanziWords, characterStrokes } from "./HanziChrome";
import { buildHanziRound, recordHanziRound, type StrokeLevel } from "./hanzi-round";
import { fromSquare, judgeStroke, screenMedian, type StrokeVerdict } from "./stroke-match";
import { chime } from "./chime";
import "../../styles/lazy/hanzi.css";

type HanziApp = Pick<
  AppController,
  "hanziLessonId" | "hanziPractice" | "navigate" | "speak" | "stopPlayback" | "awardStamp"
>;

/**
 * 筆順 practice: a round of the lesson's 生字 (or the one tapped on the lesson page), each
 * written stroke by stroke in a 田字格. A stroke out of order or off its path gets a small red ✗;
 * twice in a row shows where it starts and which way it goes, three times draws it once.
 */
export function HanziScreen({ app }: { app: HanziApp }) {
  const lesson = book1Lessons.find((item) => item.id === app.hanziLessonId) ?? book1Lessons[1];
  const { level, character } = app.hanziPractice;
  const [round, setRound] = useState(() => ({
    id: Date.now(),
    characters: character ? [character] : buildHanziRound(lesson.id),
  }));
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<{ character: string; hinted: boolean }[]>([]);
  const finished = results.length === round.characters.length;
  const label = book1LessonLabel(lesson);

  const finishCharacter = (hinted: boolean) => {
    const next = [...results, { character: round.characters[index], hinted }];
    setResults(next);
    if (next.length < round.characters.length) {
      setIndex(index + 1);
      return;
    }
    recordHanziRound(next);
    app.awardStamp({
      kind: "practice",
      subject: "zhuyin",
      detail: `第一冊 ${label} 筆順`,
      taskKey: taskKeys.hanzi(lesson.id),
      needsPractice: next.filter((item) => item.hinted).length,
    });
  };
  const again = () => {
    setRound({
      id: Date.now(),
      characters: character ? [character] : buildHanziRound(lesson.id),
    });
    setIndex(0);
    setResults([]);
  };
  const leave = () => {
    app.stopPlayback();
    app.navigate("hanzi-lesson");
  };
  const hinted = results.filter((item) => item.hinted).map((item) => item.character);
  return (
    <main className="math-shell hanzi-shell">
      <MathHeader
        title={`${label} · 筆順`}
        detail={finished ? undefined : `第 ${index + 1} 個字 / ${round.characters.length}`}
        onLeave={leave}
      />
      {finished ? (
        <MathResult
          title="寫完了！"
          note={
            hinted.length
              ? `每一筆都照順序寫好了。「${hinted.join("、")}」用了提示，下次會再出現。`
              : "每一筆都照順序寫好了，沒有用提示。"
          }
          onAgain={again}
          onLeave={leave}
        />
      ) : (
        <StrokePad
          key={`${round.id}:${index}`}
          character={round.characters[index]}
          level={level}
          app={app}
          onDone={finishCharacter}
        />
      )}
    </main>
  );
}

/** A little more room when the model is fainter or gone. */
const leniency: Record<StrokeLevel, number> = { trace: 1, faint: 1.15, blank: 1.3 };

function StrokePad({
  character,
  level,
  app,
  onDone,
}: {
  character: string;
  level: StrokeLevel;
  app: HanziApp;
  onDone: (hinted: boolean) => void;
}) {
  const data = characterStrokes[character];
  const medians = data.medians.map(screenMedian);
  const total = medians.length;
  const [done, setDone] = useState(0);
  const [misses, setMisses] = useState(0);
  // A whole demonstration first, unless the child writes it alone.
  const [demo, setDemo] = useState<number[] | null>(() =>
    level === "blank" ? null : medians.map((_, i) => i),
  );
  const [mark, setMark] = useState<{ x: number; y: number; verdict: StrokeVerdict; key: number }>();
  const finished = done === total;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /** The strokes on the canvas, and how many of them were judged already. */
  const latest = useRef<InkStroke[]>([]);
  const judged = useRef(0);
  const timer = useRef<number | null>(null);
  const progress = useRef({ done: 0, misses: 0, hinted: false });
  const ink = useInkCanvas({
    scope: character,
    mounted: true,
    enabled: !finished,
    count: 1,
    getCanvas: () => canvasRef.current,
    onChange: (_, strokes) => {
      latest.current = strokes;
      if (timer.current !== null) window.clearTimeout(timer.current);
      // A pen that skips comes back within 120 ms and continues the same stroke, so a stroke
      // is judged once the pen has stayed up a little longer.
      timer.current = window.setTimeout(judge, 150);
    },
  });

  const hasClip = registeredAudioUrl(character, book1Readings[character]) !== null;
  const say = () => {
    if (hasClip)
      app.speak(character, { pronunciation: book1Readings[character], onError: () => {} });
  };
  const sayOnce = useEffectEvent(say);
  useEffect(() => {
    sayOnce();
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [character]);
  const clearInk = () => {
    ink.reset();
    latest.current = [];
    judged.current = 0;
  };

  function judge() {
    timer.current = null;
    // The child is already writing the next stroke: judge both when it ends.
    if (ink.activeStrokeRef.current) return;
    const strokes = latest.current.slice(judged.current);
    judged.current = latest.current.length;
    let { done: written, misses: missed, hinted: helped } = progress.current;
    let last: { x: number; y: number; verdict: StrokeVerdict } | undefined;
    for (const stroke of strokes) {
      if (written >= total || stroke.length === 0) continue;
      const points = stroke.map(fromSquare);
      const verdict = judgeStroke(points, medians, written, leniency[level]);
      if (verdict === "match") {
        written += 1;
        missed = 0;
        last = undefined;
      } else {
        missed += 1;
        if (missed >= 2) helped = true;
        const end = stroke.at(-1)!;
        last = { x: end.x, y: end.y, verdict };
      }
    }
    progress.current = { done: written, misses: missed, hinted: helped };
    setDone(written);
    setMisses(missed);
    if (missed === 3) setDemo([written]);
    if (last) {
      setMark({ ...last, key: Date.now() });
      chime("miss");
      // The wrong stroke stays a moment beside its ✗, then fades.
      window.setTimeout(() => {
        if (!ink.activeStrokeRef.current) clearInk();
      }, 450);
    } else {
      setMark(undefined);
      clearInk();
      chime(written === total ? "done" : "stroke");
    }
    if (written === total) window.setTimeout(() => onDone(helped), 1300);
  }

  const showNext = level === "trace" || misses >= 2;
  return (
    <section className="hanzi-practice">
      <div className="hanzi-prompt">
        <button
          type="button"
          className="hanzi-say"
          onClick={say}
          disabled={!hasClip}
          aria-label="聽這個字"
        >
          <SpeakerHigh size={30} weight="fill" aria-hidden="true" />
        </button>
        <p className="hanzi-character">
          <HanziWords text={character} />
        </p>
        <p className="hanzi-count">
          {book1Facts[character]?.strokes} <HanziWords text="畫" />
        </p>
        <button
          type="button"
          className="hanzi-replay"
          onClick={() => setDemo(medians.map((_, i) => i))}
        >
          <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" />
          <HanziWords text="再看一次" />
        </button>
      </div>
      <div className="hanzi-square">
        <svg className="hanzi-grid" viewBox="0 0 100 100" aria-hidden="true">
          <rect x="0.5" y="0.5" width="99" height="99" />
          <path d="M 50 0 V 100 M 0 50 H 100" />
        </svg>
        <HanziGlyph
          character={character}
          model={level === "blank" ? "none" : level}
          done={done}
          next={showNext && !demo}
          hint={misses >= 2 && !demo}
          demo={demo}
          onDemoEnd={() => setDemo(null)}
          finished={finished}
        />
        <canvas
          ref={canvasRef}
          className="hanzi-canvas"
          aria-label={`寫「${character}」的第 ${Math.min(done + 1, total)} 筆`}
          onPointerDown={(event) => {
            setDemo(null);
            ink.begin(event);
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
            <X size={34} weight="bold" />
          </span>
        )}
      </div>
      <p className="hanzi-feedback" role="status">
        {finished ? (
          <HanziWords text="寫對了" />
        ) : mark ? (
          <HanziWords text={mark.verdict === "wrong-order" ? "不是這一筆" : "再試一次"} />
        ) : (
          " "
        )}
      </p>
    </section>
  );
}

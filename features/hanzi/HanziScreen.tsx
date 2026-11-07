import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowRight,
  CheckCircle,
  ListBullets,
  SpeakerHigh,
  X,
} from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import type { InkStroke } from "../types";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import { registeredAudioUrl } from "../../lib/audio/audio-registry";
import { taskKeys } from "../rewards/stamp-book";
import { MathHeader } from "../math/MathChrome";
import { book1Facts, book1LessonLabel, book1Lessons, book1Readings } from "./book1-characters";
import { HanziGlyph, HanziWords, characterStrokes } from "./HanziChrome";
import {
  answerCells,
  book1Words,
  callReadings,
  characterCalls,
  type DictationWord,
} from "./book1-words";
import { WordAnswer, WordPractice } from "./WordPractice";
import {
  readHanziRecords,
  recordHanzi,
  recordWordPractice,
  stampAfter,
  type StrokeStep,
} from "./hanzi-round";
import { fromSquare, judgeStroke, screenMedian, type StrokeVerdict } from "./stroke-match";
import { chime } from "./chime";
import "../../styles/lazy/hanzi.css";

type HanziApp = Pick<
  AppController,
  "hanziLessonId" | "hanziStart" | "navigate" | "speak" | "stopPlayback" | "awardStamp"
>;

/**
 * 練習: the lesson's 生字, one at a time, each watched, traced and then written alone, or its
 * 語詞 (WordPractice). The list button picks any of them; a finished one offers 再寫一次 or the
 * next, so the child goes on without leaving.
 */
export function HanziScreen({ app }: { app: HanziApp }) {
  const lesson = book1Lessons.find((item) => item.id === app.hanziLessonId) ?? book1Lessons[1];
  const characters = [...lesson.characters];
  const label = book1LessonLabel(lesson);
  const [records, setRecords] = useState(readHanziRecords);
  const [current, setCurrent] = useState<string | undefined>(app.hanziStart);
  const [listOpen, setListOpen] = useState(!app.hanziStart);
  const words = book1Words[lesson.id] ?? [];
  const [kind, setKind] = useState<"characters" | "words">("characters");
  const [currentWord, setCurrentWord] = useState<number | undefined>();
  // Writing the same 生字 again starts it over.
  const [attempt, setAttempt] = useState(0);
  const [finishedHere, setFinishedHere] = useState<string[]>([]);
  const stamped = useRef(false);

  const pick = (character: string) => {
    setCurrent(character);
    setAttempt((value) => value + 1);
    setListOpen(false);
  };
  const finish = (character: string, hinted: boolean) => {
    recordHanzi([{ character, hinted }]);
    setRecords(readHanziRecords());
    const here = finishedHere.includes(character) ? finishedHere : [...finishedHere, character];
    setFinishedHere(here);
    if (!stamped.current && here.length >= Math.min(stampAfter, characters.length)) {
      stamped.current = true;
      app.awardStamp({
        kind: "practice",
        subject: "zhuyin",
        detail: `第一冊 ${label} 生字練習`,
        taskKey: taskKeys.hanzi(lesson.id),
      });
    }
  };
  const leave = () => {
    app.stopPlayback();
    app.navigate("hanzi-lesson");
  };
  const index = current ? characters.indexOf(current) : -1;
  const next = characters[(index + 1) % characters.length];
  const switchKind = (value: "characters" | "words") => {
    if (value === kind) return;
    setKind(value);
    setListOpen(value === "words" ? currentWord === undefined : current === undefined);
  };
  const pickWord = (wordIndex: number) => {
    setCurrentWord(wordIndex);
    setAttempt((value) => value + 1);
    setListOpen(false);
  };
  const shown = kind === "words" ? (currentWord ?? -1) + 1 : index + 1;
  const count = kind === "words" ? words.length : characters.length;
  return (
    <main className="math-shell hanzi-shell">
      <MathHeader title={`${label} · 練習`} onLeave={leave} />
      <div className="hanzi-toolbar">
        <div className="hanzi-kind" role="group" aria-label="練習的內容">
          <button
            type="button"
            aria-pressed={kind === "characters"}
            onClick={() => switchKind("characters")}
          >
            <HanziWords text="生字" />
          </button>
          <button
            type="button"
            aria-pressed={kind === "words"}
            disabled={!words.length}
            onClick={() => switchKind("words")}
          >
            <HanziWords text="語詞" />
          </button>
        </div>
        <button
          type="button"
          className="hanzi-list-button"
          onClick={() => setListOpen(true)}
          aria-label={kind === "words" ? `語詞清單，${count} 個` : `生字清單，${count} 個字`}
        >
          <ListBullets size={22} weight="bold" aria-hidden="true" />
          <HanziWords text={kind === "words" ? "語詞" : "生字"} />
          <span className="hanzi-list-count">
            {shown || "–"} / {count}
          </span>
        </button>
      </div>
      {kind === "words" && currentWord !== undefined && (
        <WordPractice
          key={`${currentWord}:${attempt}`}
          word={words[currentWord]}
          lessonId={lesson.id}
          app={app}
          onFinish={(hinted) => {
            recordWordPractice(words[currentWord].text, hinted);
            setRecords(readHanziRecords());
          }}
          onAgain={() => setAttempt((value) => value + 1)}
          onNext={() => pickWord((currentWord + 1) % words.length)}
          next={words[(currentWord + 1) % words.length].text}
        />
      )}
      {kind === "words" && listOpen && (
        <WordList
          words={words}
          lessonId={lesson.id}
          current={currentWord}
          practised={(text) => (records.words[text]?.practised ?? 0) > 0}
          hard={(text) => (records.words[text]?.wrong ?? 0) > 0}
          onPick={pickWord}
          onClose={currentWord !== undefined ? () => setListOpen(false) : leave}
        />
      )}
      {kind === "characters" && current && (
        <CharacterPractice
          key={`${current}:${attempt}`}
          character={current}
          app={app}
          onFinish={(hinted) => finish(current, hinted)}
          onAgain={() => setAttempt((value) => value + 1)}
          onNext={() => pick(next)}
          next={next}
        />
      )}
      {kind === "characters" && listOpen && (
        <CharacterList
          characters={characters}
          current={current}
          practised={(character) => (records.characters[character]?.practised ?? 0) > 0}
          hard={(character) => (records.characters[character]?.hard ?? 0) > 0}
          onPick={pick}
          onClose={current ? () => setListOpen(false) : leave}
        />
      )}
    </main>
  );
}

/** The lesson's 生字 to choose from; a check marks the ones written to the end before. */
function CharacterList({
  characters,
  current,
  practised,
  hard,
  onPick,
  onClose,
}: {
  characters: string[];
  current?: string;
  practised: (character: string) => boolean;
  /** Needed hints in 練習, or was written wrong in 聽寫. */
  hard: (character: string) => boolean;
  onPick: (character: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="hanzi-list-backdrop" onClick={onClose}>
      <section
        className="hanzi-list"
        role="dialog"
        aria-modal="true"
        aria-label="選一個字"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2>
            <HanziWords text="選一個字" />
          </h2>
          <button type="button" className="hanzi-list-close" onClick={onClose} aria-label="關閉">
            <X size={24} weight="bold" aria-hidden="true" />
          </button>
        </header>
        <ul className="hanzi-character-cards">
          {characters.map((character) => (
            <li key={character}>
              <button
                type="button"
                className={`hanzi-character-card${character === current ? " is-current" : ""}`}
                onClick={() => onPick(character)}
                aria-label={`練習「${character}」${practised(character) ? "，練過了" : ""}${hard(character) ? "，要再練" : ""}`}
              >
                <span className="hanzi-card-glyph">
                  <HanziGlyph
                    character={character}
                    model="none"
                    done={book1Facts[character]?.strokes ?? 0}
                    next={false}
                    hint={false}
                    demo={null}
                    finished={false}
                  />
                </span>
                <span className="hanzi-card-reading">
                  <HanziWords text={character} />
                </span>
                {practised(character) && (
                  <CheckCircle
                    className="hanzi-card-done"
                    size={24}
                    weight="fill"
                    aria-hidden="true"
                  />
                )}
                {hard(character) && (
                  <span className="hanzi-card-hard">
                    <HanziWords text="再練" />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

type Stage = "watch" | StrokeStep | "done";
const stages: { stage: Stage; name: string }[] = [
  { stage: "watch", name: "看一看" },
  { stage: "trace", name: "描一描" },
  { stage: "blank", name: "寫一寫" },
];

/** One 生字: its demonstration, then traced over the model, then written in an empty square. */
function CharacterPractice({
  character,
  app,
  onFinish,
  onAgain,
  onNext,
  next,
}: {
  character: string;
  app: HanziApp;
  onFinish: (hinted: boolean) => void;
  onAgain: () => void;
  onNext: () => void;
  next: string;
}) {
  const [stage, setStage] = useState<Stage>("watch");
  const [replay, setReplay] = useState(0);
  const hinted = useRef(false);
  // The 生字's call (「拍手的拍」) says which character it is; the 生字 alone, if only that is voiced.
  const call = characterCalls[character];
  const callReading = callReadings(character).replaceAll(" ", "|");
  const clip =
    registeredAudioUrl(call, callReading) !== null
      ? { text: call, pronunciation: callReading }
      : registeredAudioUrl(character, book1Readings[character]) !== null
        ? { text: character, pronunciation: book1Readings[character] }
        : null;
  const hasClip = clip !== null;
  const say = () => {
    if (clip) app.speak(clip.text, { pronunciation: clip.pronunciation, onError: () => {} });
  };
  const sayOnce = useEffectEvent(say);
  useEffect(() => {
    sayOnce();
  }, [character]);
  const order = stages.findIndex((item) => item.stage === stage);
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
          onClick={() => setReplay((value) => value + 1)}
        >
          <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" />
          <HanziWords text="再看一次" />
        </button>
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
      <StrokeBox
        key={stage === "done" ? "blank" : stage}
        character={character}
        step={stage === "trace" ? "trace" : stage === "watch" ? "watch" : "blank"}
        replay={replay}
        finished={stage === "done"}
        onDemoEnd={() => {
          if (stage === "watch") setStage("trace");
        }}
        onStart={() => {
          if (stage === "watch") setStage("trace");
        }}
        onComplete={(helped) => {
          hinted.current ||= helped;
          if (stage === "trace") setStage("blank");
          else {
            setStage("done");
            onFinish(hinted.current);
          }
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
            aria-label={`下一個字：${next}`}
          >
            <HanziWords text="下一個字" />
            <ArrowRight size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </section>
  );
}

/** A little more room in the empty square. */
const leniency = { watch: 1, trace: 1, blank: 1.3 };

/**
 * The 田字格: the model as the step shows it, and a canvas whose every stroke is judged as the
 * pen lifts. A stroke out of order or off its path gets a small red ✗; two misses in a row show
 * where it starts and which way it goes, three draw it once.
 */
function StrokeBox({
  character,
  step,
  replay,
  finished: shownFinished,
  onDemoEnd,
  onStart,
  onComplete,
}: {
  character: string;
  step: "watch" | StrokeStep;
  replay: number;
  finished: boolean;
  onDemoEnd: () => void;
  onStart: () => void;
  onComplete: (hinted: boolean) => void;
}) {
  const data = characterStrokes[character];
  const medians = data.medians.map(screenMedian);
  const total = medians.length;
  const [done, setDone] = useState(shownFinished ? total : 0);
  const [misses, setMisses] = useState(0);
  const allStrokes = medians.map((_, i) => i);
  const [demo, setDemo] = useState<number[] | null>(step === "watch" ? allStrokes : null);
  const [shownReplay, setShownReplay] = useState(replay);
  if (shownReplay !== replay) {
    setShownReplay(replay);
    setDemo(allStrokes);
  }
  const [mark, setMark] = useState<{ x: number; y: number; verdict: StrokeVerdict; key: number }>();
  const finished = done === total;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /** The strokes on the canvas, and how many of them were judged already. */
  const latest = useRef<InkStroke[]>([]);
  const judged = useRef(0);
  const timer = useRef<number | null>(null);
  const progress = useRef({ done: 0, misses: 0, hinted: false });
  const ink = useInkCanvas({
    scope: `${character}:${step}`,
    mounted: true,
    enabled: !finished && step !== "watch",
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
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
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
      const verdict = judgeStroke(stroke.map(fromSquare), medians, written, leniency[step]);
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
      // The wrong stroke stays a moment beside its ✗, then fades; not while the next stroke is
      // being written or waits to be judged, since that judging clears it.
      window.setTimeout(() => {
        if (!ink.activeStrokeRef.current && latest.current.length === judged.current) clearInk();
      }, 450);
    } else {
      setMark(undefined);
      clearInk();
      chime(written === total ? "done" : "stroke");
    }
    if (written === total) window.setTimeout(() => onComplete(helped), 900);
  }

  const model = step === "blank" ? "none" : "trace";
  return (
    <>
      <div className={`hanzi-square is-${step}`}>
        <svg className="hanzi-grid" viewBox="0 0 100 100" aria-hidden="true">
          <rect x="0.5" y="0.5" width="99" height="99" />
          <path d="M 50 0 V 100 M 0 50 H 100" />
        </svg>
        <HanziGlyph
          character={character}
          model={model}
          done={done}
          next={(step === "trace" || misses >= 2) && !demo}
          hint={misses >= 2 && !demo}
          demo={demo}
          onDemoEnd={() => {
            setDemo(null);
            onDemoEnd();
          }}
          finished={finished}
        />
        <canvas
          ref={canvasRef}
          className="hanzi-canvas"
          aria-label={`寫「${character}」的第 ${Math.min(done + 1, total)} 筆`}
          onPointerDown={(event) => {
            setDemo(null);
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
    </>
  );
}

/** The lesson's 語詞, as the sheet writes them; 練過了 and 再練 marked as for 生字. */
function WordList({
  words,
  lessonId,
  current,
  practised,
  hard,
  onPick,
  onClose,
}: {
  words: DictationWord[];
  lessonId: number;
  current?: number;
  practised: (text: string) => boolean;
  hard: (text: string) => boolean;
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="hanzi-list-backdrop" onClick={onClose}>
      <section
        className="hanzi-list"
        role="dialog"
        aria-modal="true"
        aria-label="選一個語詞"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2>
            <HanziWords text="選一個語詞" />
          </h2>
          <button type="button" className="hanzi-list-close" onClick={onClose} aria-label="關閉">
            <X size={24} weight="bold" aria-hidden="true" />
          </button>
        </header>
        <ul className="hanzi-word-cards">
          {words.map((word, index) => (
            <li key={word.text}>
              <button
                type="button"
                className={`hanzi-word-card${index === current ? " is-current" : ""}`}
                onClick={() => onPick(index)}
                aria-label={`練習「${word.text}」${practised(word.text) ? "，練過了" : ""}${hard(word.text) ? "，要再練" : ""}`}
              >
                <WordAnswer cells={answerCells(word, lessonId)} />
                {practised(word.text) && (
                  <CheckCircle
                    className="hanzi-card-done"
                    size={22}
                    weight="fill"
                    aria-hidden="true"
                  />
                )}
                {hard(word.text) && (
                  <span className="hanzi-card-hard">
                    <HanziWords text="再練" />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

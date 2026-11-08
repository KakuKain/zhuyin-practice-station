import { Fragment, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, SpeakerHigh } from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import type { InkStroke } from "../types";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import { registeredAudioUrl } from "../../lib/audio/audio-registry";
import { AnnotatedText } from "../../components/AnnotatedText";
import { InkTools } from "../../components/InkTools";
import { taskKeys } from "../rewards/stamp-book";
import { readingVariants } from "../lesson/reading-variants";
import { MathHeader, MathResult } from "../math/MathChrome";
import { book1LessonLabel, book1Lessons } from "./book1-characters";
import { HanziWords } from "./HanziChrome";
import { CellGuides, InkReplay } from "./HanziCells";
import {
  partReadings,
  patternParts,
  sentenceLessons,
  type SentenceQuestion,
} from "./sentence-patterns";
import "../../styles/lazy/hanzi.css";

type SentenceApp = Pick<
  AppController,
  "hanziLessonId" | "navigate" | "speak" | "stopPlayback" | "awardStamp"
>;

/** Text in 國字注音 with the readings given for it. */
function Reading({ text, readings }: { text: string; readings: string }) {
  return <AnnotatedText text={text} variants={readingVariants(text, readings)} />;
}

const exampleReading = (question: SentenceQuestion) =>
  question.exampleReadings.replaceAll(" ", "|");
const hasClip = (question: SentenceQuestion) =>
  registeredAudioUrl(question.example, exampleReading(question)) !== null;

/** How many cells the blanks of a question have. */
const cellCount = (question: SentenceQuestion) =>
  patternParts(question.pattern).reduce(
    (sum, part) => sum + (part.kind === "blank" ? part.cells : 0),
    0,
  );

/**
 * 照樣造句: each question plays one of the book's example sentences and shows it, then its
 * pattern with blanks in 作業簿 cells (a 田字格 and a 注音 strip each). The child fills the
 * blanks; the parent marks each sentence at the end, since any sensible words are right.
 */
export function SentenceScreen({ app }: { app: SentenceApp }) {
  const lesson = book1Lessons.find((item) => item.id === app.hanziLessonId) ?? book1Lessons[1];
  const label = book1LessonLabel(lesson);
  const questions = sentenceLessons[lesson.id]?.questions ?? [];
  const [index, setIndex] = useState(0);
  const [ink, setInk] = useState<InkStroke[][][]>(() => questions.map(() => []));
  const [phase, setPhase] = useState<"write" | "check" | "done">("write");
  const [wrong, setWrong] = useState(0);
  const leave = () => {
    app.stopPlayback();
    app.navigate("hanzi-lesson");
  };
  return (
    <main className="math-shell hanzi-shell">
      <MathHeader
        title={`${label} · 照樣造句`}
        detail={phase === "write" ? `第 ${index + 1} 題 / ${questions.length}` : undefined}
        onLeave={leave}
      />
      {phase === "write" && questions[index] && (
        <SentenceWriting
          key={index}
          question={questions[index]}
          initial={ink[index]}
          app={app}
          onInk={(cell, strokes) =>
            setInk((current) =>
              current.map((cells, q) =>
                q === index ? Object.assign([...cells], { [cell]: strokes }) : cells,
              ),
            )
          }
          first={index === 0}
          last={index === questions.length - 1}
          onBack={() => setIndex(index - 1)}
          onNext={() => (index === questions.length - 1 ? setPhase("check") : setIndex(index + 1))}
        />
      )}
      {phase === "check" && (
        <SentenceCheck
          questions={questions}
          ink={ink}
          onBack={() => setPhase("write")}
          onDone={(marks) => {
            const missed = marks.filter((right) => !right).length;
            app.awardStamp({
              kind: "practice",
              subject: "zhuyin",
              detail: `第一冊 ${label} 照樣造句`,
              taskKey: taskKeys.hanzi(lesson.id),
              needsPractice: missed,
            });
            setWrong(missed);
            setPhase("done");
          }}
        />
      )}
      {phase === "done" && (
        <MathResult
          title="照樣造句完成！"
          note={wrong ? `有 ${wrong} 句可以再想一想。` : "每一句都寫得很好！"}
          onAgain={() => {
            setInk(questions.map(() => []));
            setIndex(0);
            setPhase("write");
          }}
          onLeave={leave}
        />
      )}
    </main>
  );
}

/** The book's example, heard and shown in 國字注音. */
function Example({ question, app }: { question: SentenceQuestion; app: SentenceApp }) {
  const play = () => {
    if (hasClip(question))
      app.speak(question.example, {
        pronunciation: exampleReading(question),
        onError: () => {},
      });
  };
  const playOnce = useEffectEvent(play);
  useEffect(() => {
    playOnce();
  }, [question.example]);
  return (
    <div className="hanzi-prompt hanzi-example">
      <button
        type="button"
        className="hanzi-say"
        onClick={play}
        disabled={!hasClip(question)}
        aria-label="聽例句"
      >
        <SpeakerHigh size={30} weight="fill" aria-hidden="true" />
      </button>
      <span className="hanzi-example-label">
        <HanziWords text="例句" />
      </span>
      <p className="hanzi-example-text">
        <Reading text={question.shown ?? question.example} readings={question.exampleReadings} />
      </p>
    </div>
  );
}

function SentenceWriting({
  question,
  initial,
  app,
  onInk,
  first,
  last,
  onBack,
  onNext,
}: {
  question: SentenceQuestion;
  initial: InkStroke[][];
  app: SentenceApp;
  onInk: (cell: number, strokes: InkStroke[]) => void;
  first: boolean;
  last: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const [active, setActive] = useState(0);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const ink = useInkCanvas({
    scope: question.pattern + question.example,
    mounted: true,
    enabled: true,
    count: cellCount(question),
    getCanvas: (i) => canvases.current[i] ?? null,
    readInitial: (i) => initial[i] ?? [],
    onChange: onInk,
  });
  return (
    <section className="hanzi-dictation hanzi-sentence">
      <Example question={question} app={app} />
      <Pattern
        question={question}
        renderCell={(cell) => (
          <div className={`hanzi-cell${active === cell ? " is-active" : ""}`}>
            <CellGuides mark={false} />
            <canvas
              ref={(element) => {
                canvases.current[cell] = element;
              }}
              data-word-index={cell}
              className="hanzi-cell-canvas"
              aria-label={`第 ${cell + 1} 格`}
              onPointerDown={(event) => {
                setActive(cell);
                ink.begin(event);
              }}
              onPointerMove={ink.move}
              onPointerUp={ink.end}
              onPointerCancel={ink.end}
            />
          </div>
        )}
      />
      <InkTools
        erasing={ink.eraserCell === active}
        hasInk={ink.ink[active] ?? false}
        canUndo={ink.undoAvailable[active] ?? false}
        cellLabel={`第 ${active + 1} 格`}
        onEraser={() => ink.toggleEraser(active)}
        onUndo={() => ink.undo(active)}
        onClear={() => ink.clear(active)}
      />
      <div className="hanzi-dictation-nav">
        <button type="button" className="hanzi-again" onClick={onBack} disabled={first}>
          <ArrowLeft size={20} weight="bold" aria-hidden="true" />
          <HanziWords text="上一題" />
        </button>
        <button type="button" className="hanzi-go-next" onClick={onNext}>
          <HanziWords text={last ? "寫好了" : "下一題"} />
          <ArrowRight size={20} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

/** The pattern: its words in 國字注音, each blank its label over its cells. */
function Pattern({
  question,
  renderCell,
}: {
  question: SentenceQuestion;
  renderCell: (cell: number) => ReactNode;
}) {
  const parts = patternParts(question.pattern);
  const readings = partReadings(question);
  let cell = 0;
  return (
    <div className="hanzi-pattern">
      {parts.map((part, i) => {
        if (part.kind === "text")
          return (
            <span key={i} className="hanzi-pattern-text">
              <Reading text={part.text} readings={readings[i]} />
            </span>
          );
        // Flat, so a long blank can run on into the next column.
        const cells = Array.from({ length: part.cells }, () => cell++);
        return (
          <Fragment key={i}>
            {part.label && (
              <span className="hanzi-pattern-label">
                <Reading text={part.label} readings={readings[i]} />
              </span>
            )}
            {cells.map((index) => (
              <Fragment key={index}>{renderCell(index)}</Fragment>
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}

/** The parent's check: each sentence with the child's writing in its blanks, marked 對 or 錯. */
function SentenceCheck({
  questions,
  ink,
  onBack,
  onDone,
}: {
  questions: SentenceQuestion[];
  ink: InkStroke[][][];
  onBack: () => void;
  onDone: (marks: boolean[]) => void;
}) {
  const [marks, setMarks] = useState<(boolean | null)[]>(() => questions.map(() => null));
  const ready = marks.every((value) => value !== null);
  return (
    <section className="hanzi-check">
      <p className="hanzi-check-intro">
        請家長看看每一句：空格裡的詞通順、合理就算對（教過的字寫國字，其他寫注音）。
      </p>
      <ol className="hanzi-check-list">
        {questions.map((question, i) => (
          <li key={i} className="hanzi-check-item hanzi-sentence-check">
            <span className="hanzi-check-number">{i + 1}</span>
            <Pattern
              question={question}
              renderCell={(cell) => (
                <span className="hanzi-check-ink">
                  <CellGuides mark={false} />
                  <InkReplay strokes={ink[i]?.[cell] ?? []} play={false} />
                </span>
              )}
            />
            <div className="hanzi-check-marks">
              <div className="hanzi-check-mark" role="group" aria-label={`第 ${i + 1} 句`}>
                {[true, false].map((option) => (
                  <button
                    type="button"
                    key={String(option)}
                    aria-pressed={marks[i] === option}
                    className={option ? "is-right" : "is-wrong"}
                    onClick={() =>
                      setMarks((current) => current.map((v, z) => (z === i ? option : v)))
                    }
                  >
                    {option ? "對" : "錯"}
                  </button>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="hanzi-dictation-nav">
        <button type="button" className="hanzi-again" onClick={onBack}>
          <ArrowLeft size={20} weight="bold" aria-hidden="true" />
          回去改
        </button>
        <button
          type="button"
          className="hanzi-go-next"
          disabled={!ready}
          onClick={() => onDone(marks.map(Boolean))}
        >
          {ready ? "完成" : "還有句子沒勾"}
        </button>
      </div>
    </section>
  );
}

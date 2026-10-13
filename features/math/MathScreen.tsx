import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { AppController } from "../usePracticeApp";
import type { InkStroke } from "../types";
import { InkPreview } from "../../components/AppChrome";
import {
  clearMathRound,
  filledCells,
  frameCells,
  isAnswered,
  workCells,
  newMathRound,
  readMathRound,
  recordMathRound,
  writeMathRound,
  type MathQuestion,
  type MathRound,
} from "./math-round";
import { chineseNumber, mathPromptId, mathPromptUrl, mathPrompts } from "./math-audio";
import { taskKeys } from "../rewards/stamp-book";
import { mathLessons, type MathLesson } from "./math-lessons";
import { MathHeader, MathPrompt, MathResult } from "./MathChrome";
import { CountPictures, JoinPictures } from "./MathPictures";
import { AdditionWork, DrawFrame, FramePreview, InkSquare } from "./MathInk";
import { BondPreview, BondWork, bondLabel, type BondQuestion } from "./MathBond";

type MathApp = Pick<
  AppController,
  "speak" | "stopPlayback" | "navigate" | "mathLessonId" | "mathStart" | "awardStamp"
>;

const CompareLesson = lazy(() =>
  Promise.all([import("./CompareLesson"), import("../../styles/lazy/math-compare.css")]).then(
    ([module]) => ({ default: module.CompareLesson }),
  ),
);

const sectionLabels: Record<MathQuestion["kind"], string> = {
  count: "數一數",
  draw: "畫圈圈",
  join: "合在一起",
  add: "畫圈圈算加法",
  split: "分一分",
  combine: "合一合",
  ways: "分分看",
};

/** How the result and the parent name a question: 「數一數 7」, 「3＋4」 or 「7 分成 3 和 ？」. */
const questionName = (question: MathQuestion) =>
  isBond(question)
    ? bondLabel(question)
    : "parts" in question
      ? question.parts.join("＋")
      : `${sectionLabels[question.kind]} ${question.target}`;

const isBond = (question: MathQuestion): question is BondQuestion =>
  question.kind === "split" || question.kind === "combine" || question.kind === "ways";

/** 「畫了 6 格」 for the parent, and in red how many too many or too few. */
function DrawnCount({ drawn, target }: { drawn: number; target: number }) {
  return (
    <>
      畫了 {drawn} 格
      {drawn !== target && (
        <strong className="math-check-over">
          ，{drawn > target ? "多" : "少"}畫 {Math.abs(drawn - target)} 格
        </strong>
      )}
    </>
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
  return <WritingLesson app={app} lesson={lesson} />;
}

/**
 * 第一課 認識 1～10 and 第三課 加法: the child writes and draws, then the parent checks the
 * round. Each lesson keeps its own unfinished round.
 */
function WritingLesson({ app, lesson }: { app: MathApp; lesson: MathLesson }) {
  // The lesson page chose to continue the saved round or start a new one.
  const [round, setRound] = useState<MathRound | null>(
    () => (app.mathStart === "continue" && readMathRound(lesson.id)) || newMathRound(lesson.id),
  );
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

  // The first question is read out as the round opens, as tapping 開始練習 unlocked audio.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !round || round.phase === "check") return;
    opened.current = true;
    play(round.questions[round.index]);
  });

  const goTo = (current: MathRound, index: number) => {
    setMarked(new Set());
    setRound({ ...current, index });
    play(current.questions[index]);
  };
  const leave = () => {
    stopPlayback();
    app.navigate("math-lesson");
  };

  const header = (title: string, detail?: string) => (
    <MathHeader title={title} detail={detail} onLeave={leave} />
  );

  if (finished || !round) {
    const done = finished ?? newMathRound(lesson.id);
    const needs = done.needsPractice.map((index) => done.questions[index]);
    return (
      <main className="math-shell is-result">
        {header(`數學${lesson.number} · ${lesson.title}`)}
        <MathResult
          title="這一課練完了！"
          note={
            needs.length
              ? `有 ${needs.length} 題要再練習：${needs.map(questionName).join("、")}`
              : `${done.questions.length} 題全部都會了！`
          }
          onAgain={() => {
            setFinished(null);
            goTo(newMathRound(lesson.id), 0);
          }}
          onLeave={leave}
        />
      </main>
    );
  }

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
          <h2>請家長一起檢查</h2>
          <p>對照答案，把還不會的題目標成「需要補強」。也可以看看孩子哪些數字還不熟。</p>
          {round.questions.map((question, index) => {
            const strokes = round.ink[index] ?? [];
            const circles = round.work[index] ?? [];
            const pending = round.needsPractice.includes(index);
            return (
              <article className="math-check-card" key={index}>
                <h2>
                  第 {index + 1} 題 · {sectionLabels[question.kind]}
                </h2>
                <div className="math-check-row">
                  <div className="math-check-question">
                    {question.kind === "count" ? (
                      <CountPictures question={question} small />
                    ) : question.kind === "join" ? (
                      <JoinPictures question={question} small />
                    ) : isBond(question) ? (
                      <span className="math-check-draw">{bondLabel(question)}</span>
                    ) : question.kind === "add" ? (
                      <div className="math-check-add">
                        <span className="math-check-draw">{question.parts.join(" ＋ ")}</span>
                        <div className="math-check-circles">
                          {question.parts.map((count, side) => (
                            <figure key={side}>
                              <FramePreview
                                cells={circles}
                                start={side * frameCells}
                                target={count}
                              />
                              <figcaption>
                                {count} 個，
                                <DrawnCount
                                  drawn={filledCells(circles, side * frameCells)}
                                  target={count}
                                />
                              </figcaption>
                            </figure>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="math-check-draw">畫出 {question.target} 個圈圈</span>
                    )}
                  </div>
                  <div className="math-check-answer">
                    <span className="math-check-label">
                      {question.kind === "draw" ? "孩子畫的" : "孩子寫的"}
                    </span>
                    {isBond(question) ? (
                      <BondPreview question={question} answer={strokes} cells={circles} />
                    ) : question.kind === "draw" && circles.length ? (
                      <>
                        <FramePreview cells={circles} target={question.target} />
                        <small>
                          <DrawnCount drawn={filledCells(circles)} target={question.target} />
                        </small>
                      </>
                    ) : (
                      <>
                        {/* 畫圈圈 drawn before 十格框 shows as it was drawn. */}
                        <div className="math-check-ink">
                          {strokes.length ? (
                            <InkPreview strokes={strokes} />
                          ) : (
                            <span>沒有作答</span>
                          )}
                        </div>
                        {question.kind === "draw" && strokes.length > 0 && (
                          <small>畫了 {strokes.length} 筆</small>
                        )}
                      </>
                    )}
                  </div>
                  <div className="math-check-key">
                    <span className="math-check-label">答案</span>
                    {question.kind === "ways" ? (
                      // Any two numbers that make the total are right.
                      <small className="math-check-ways">
                        兩個數合起來是 {question.target} 就對
                      </small>
                    ) : (
                      <strong>
                        {question.kind === "split" ? question.parts[1] : question.target}
                      </strong>
                    )}
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
              app.awardStamp({
                kind: "practice",
                subject: "math",
                detail: `數學${lesson.number} ${lesson.title}`,
                taskKey: taskKeys.math(lesson.id),
                needsPractice: round.needsPractice.length,
              });
              clearMathRound(lesson.id);
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
  const setWorkCell = (cell: number, next: InkStroke[]) =>
    setRound((current) => {
      if (!current) return current;
      const size = workCells(current.questions[current.index]);
      const cells = Array.from(
        { length: size },
        (_, index) => current.work[current.index]?.[index] ?? [],
      );
      cells[cell] = next;
      return { ...current, work: { ...current.work, [current.index]: cells } };
    });
  const toggleMark = (index: number) =>
    setMarked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  const scope = `math:${round.createdAt}:${round.index}`;
  return (
    <main className="math-shell">
      {header(
        `${lesson.number} · ${sectionLabels[question.kind]}`,
        `第 ${round.index + 1} 題 / ${round.questions.length}`,
      )}
      <section className={`math-question is-${question.kind}`}>
        <MathPrompt id={mathPromptId(question)} onPlay={() => play(question)} />
        {question.kind === "count" ? (
          <div className="math-count">
            <CountPictures question={question} marked={marked} onToggle={toggleMark} />
            <InkSquare scope={scope} initial={strokes} onChange={setInk} label="寫數字" />
          </div>
        ) : question.kind === "join" ? (
          <div className="math-count math-join">
            <JoinPictures question={question} marked={marked} onToggle={toggleMark} />
            <InkSquare scope={scope} initial={strokes} onChange={setInk} label="寫答案" />
          </div>
        ) : isBond(question) ? (
          <div className="math-bond-question">
            {question.kind === "combine" ? (
              <JoinPictures question={question} marked={marked} onToggle={toggleMark} />
            ) : (
              <CountPictures question={question} marked={marked} onToggle={toggleMark} />
            )}
            <BondWork
              scope={scope}
              question={question}
              answer={strokes}
              cells={round.work[round.index] ?? []}
              onAnswer={setInk}
              onCell={setWorkCell}
            />
          </div>
        ) : question.kind === "add" ? (
          <AdditionWork
            scope={scope}
            parts={question.parts}
            cells={round.work[round.index] ?? []}
            answer={strokes}
            onCell={setWorkCell}
            onAnswer={setInk}
          />
        ) : (
          <div className="math-draw">
            <div className="math-draw-target" aria-hidden="true">
              <strong>{question.target}</strong>
              <span>畫出{chineseNumber(question.target)}個</span>
            </div>
            <DrawFrame
              scope={scope}
              target={question.target}
              cells={round.work[round.index] ?? []}
              onCell={setWorkCell}
            />
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

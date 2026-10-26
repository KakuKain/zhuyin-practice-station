import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import type { InkStroke } from "../types";
import { InkPreview } from "../../components/AppChrome";
import { InkStatus, InkTools } from "../../components/InkTools";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import { taskKeys } from "../rewards/stamp-book";
import { MathHeader, MathResult } from "../math/MathChrome";
import { mathPromptUrl, mathPrompts } from "../math/math-audio";
import { englishLessons, writingTips, type EnglishLesson } from "./english-lessons";
import {
  clearWriteRound,
  isWritten,
  newEnglishQuestions,
  newWriteRound,
  readWriteRound,
  recordEnglishResult,
  squaresOf,
  tapAnswer,
  tapClips,
  tapInAnyOrder,
  tapPromptId,
  tapSection,
  tapTopic,
  writeAnswer,
  writeClips,
  writePromptId,
  writeSection,
  writeTopic,
  writeWriteRound,
  type EnglishWriteRound,
  type TapQuestion,
  type WriteQuestion,
} from "./english-round";
import {
  DialogueScene,
  EnglishPrompt,
  EnglishWords,
  FourLines,
  LetterGlyph,
  LetterPair,
  WordLetters,
  WordPicture,
  useEnglishVoice,
} from "./EnglishChrome";
import "../../styles/lazy/english.css";

type EnglishApp = Pick<
  AppController,
  "speak" | "stopPlayback" | "navigate" | "englishLessonId" | "englishPractice" | "awardStamp"
>;

const correctDelay = 1300;
const retryDelay = 900;

export function EnglishScreen({ app }: { app: EnglishApp }) {
  const lesson =
    englishLessons.find((item) => item.id === app.englishLessonId) ?? englishLessons[0];
  return app.englishPractice.mode === "tap" ? (
    <TapLesson app={app} lesson={lesson} />
  ) : (
    <WriteLesson app={app} lesson={lesson} />
  );
}

/** 認一認: every answer is a tap, checked at once and tried again until right, like 辨音. */
function TapLesson({ app, lesson }: { app: EnglishApp; lesson: EnglishLesson }) {
  const [round, setRound] = useState(() => ({
    id: Date.now(),
    questions: newEnglishQuestions(lesson.id, "tap"),
  }));
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState<{ total: number; topics: string[] } | null>(null);
  const missed = useRef(new Set<number>());
  const voice = useEnglishVoice(app);
  const { speak } = app;
  const play = useCallback(
    (question: TapQuestion) =>
      voice(
        [`prompt-${tapPromptId(question)}`, ...tapClips(question)],
        question.kind === "word-order" ? 800 : 450,
      ),
    [voice],
  );
  const say = useCallback(
    (id: "correct" | "retry") => speak(mathPrompts[id], { url: mathPromptUrl(id) }),
    [speak],
  );

  // The first question is read out as the round opens, right after the tap on 認一認.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    play(round.questions[0]);
  }, [round, play]);

  const leave = () => {
    app.stopPlayback();
    app.navigate("english-lesson");
  };
  const title = `英語${lesson.number} · ${lesson.title}`;
  if (finished)
    return (
      <main className="math-shell english-shell is-result">
        <MathHeader title={title} onLeave={leave} />
        <MathResult
          title="認一認練完了！"
          note={
            finished.topics.length
              ? `這幾題多試了一次才答對，可以再練習看看：${finished.topics.join("、")}`
              : `${finished.total} 題都完成了，每一題第一次就答對了！`
          }
          onAgain={() => {
            const questions = newEnglishQuestions(lesson.id, "tap");
            missed.current = new Set();
            setFinished(null);
            setIndex(0);
            setRound({ id: Date.now(), questions });
            play(questions[0]);
          }}
          onLeave={leave}
        />
      </main>
    );

  const question = round.questions[index];
  const next = () => {
    const following = index + 1;
    if (following < round.questions.length) {
      setIndex(following);
      play(round.questions[following]);
      return;
    }
    const topics = [...missed.current]
      .sort((a, b) => a - b)
      .map((item) => tapTopic(round.questions[item]));
    recordEnglishResult({
      lessonId: lesson.id,
      mode: "tap",
      total: round.questions.length,
      needsPractice: topics,
    });
    app.awardStamp({
      kind: "practice",
      subject: "english",
      detail: `英語${lesson.number} 認一認`,
      taskKey: taskKeys.english(lesson.id, "tap"),
      needsPractice: topics.length,
    });
    setFinished({ total: round.questions.length, topics });
  };
  return (
    <main className="math-shell english-shell">
      <MathHeader
        title={`${lesson.number} · ${tapSection(question)}`}
        detail={`第 ${index + 1} 題 / ${round.questions.length}`}
        onLeave={leave}
      />
      <TapQuestionView
        key={`${round.id}:${index}`}
        question={question}
        onPlay={() => play(question)}
        say={say}
        onMiss={() => missed.current.add(index)}
        onDone={next}
      />
    </main>
  );
}

type Feedback = { kind: "correct" | "retry"; pick: number } | null;

const choiceState = (index: number, picks: number[], feedback: Feedback) =>
  feedback?.pick === index
    ? ` is-${feedback.kind === "correct" ? "correct" : "wrong"}`
    : picks.includes(index)
      ? " is-picked"
      : "";

function TapQuestionView({
  question,
  onPlay,
  say,
  onMiss,
  onDone,
}: {
  question: TapQuestion;
  onPlay: () => void;
  say: (id: "correct" | "retry") => void;
  onMiss: () => void;
  onDone: () => void;
}) {
  const [picks, setPicks] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  const answer = tapAnswer(question);
  const anyOrder = tapInAnyOrder(question);
  const pick = (choice: number) => {
    if (feedback || picks.includes(choice)) return;
    if (anyOrder ? answer.includes(choice) : choice === answer[picks.length]) {
      const chosen = [...picks, choice];
      setPicks(chosen);
      if (chosen.length < answer.length) return;
      setFeedback({ kind: "correct", pick: choice });
      say("correct");
      timer.current = window.setTimeout(onDone, correctDelay);
      return;
    }
    onMiss();
    setFeedback({ kind: "retry", pick: choice });
    say("retry");
    timer.current = window.setTimeout(() => setFeedback(null), retryDelay);
  };
  const state = (index: number) => choiceState(index, picks, feedback);

  return (
    <section className={`compare-question english-question is-${question.kind}`}>
      <EnglishPrompt id={tapPromptId(question)} onPlay={onPlay} />
      <TapStage question={question} state={state} picks={picks} onPick={pick} />
      <span className="visually-hidden" role="status">
        {feedback?.kind === "correct" ? "答對了！" : feedback ? "再想想看" : ""}
      </span>
      {feedback && (
        <div className={`english-feedback is-${feedback.kind}`} aria-hidden="true">
          {feedback.kind === "correct" ? (
            <CheckCircle size={120} weight="fill" />
          ) : (
            <XCircle size={100} weight="fill" />
          )}
          <span>{feedback.kind === "correct" ? "答對了！" : "再想想看"}</span>
        </div>
      )}
    </section>
  );
}

/** What to tap for each kind of question. */
function TapStage({
  question,
  state,
  picks,
  onPick,
}: {
  question: TapQuestion;
  state: (index: number) => string;
  picks: number[];
  onPick: (index: number) => void;
}) {
  switch (question.kind) {
    case "hear-letter":
      return (
        <div className="english-choices is-letters" role="group" aria-label="字母">
          {question.choices.map((choice, index) => (
            <button
              type="button"
              key={index}
              className={`english-choice${state(index)}`}
              aria-label={choice}
              onClick={() => onPick(index)}
            >
              <LetterGlyph letter={choice} />
            </button>
          ))}
        </div>
      );
    case "match-case":
      return (
        <div className="english-match">
          <span
            className="english-given"
            aria-label={`題目：${question.to === "lower" ? question.letter.toUpperCase() : question.letter}`}
          >
            <LetterGlyph
              letter={question.to === "lower" ? question.letter.toUpperCase() : question.letter}
            />
          </span>
          <div className="english-choices is-letters" role="group" aria-label="字母">
            {question.choices.map((choice, index) => (
              <button
                type="button"
                key={index}
                className={`english-choice${state(index)}`}
                aria-label={choice}
                onClick={() => onPick(index)}
              >
                <LetterGlyph letter={choice} />
              </button>
            ))}
          </div>
        </div>
      );
    case "find-all":
      return (
        <div className="english-match">
          <span className="english-given" aria-label={`題目：${question.letter.toUpperCase()}`}>
            <LetterGlyph letter={question.letter.toUpperCase()} />
          </span>
          <div className="english-choices is-grid" role="group" aria-label="小寫字母">
            {question.grid.map((letter, index) => (
              <button
                type="button"
                key={index}
                className={`english-choice${state(index)}`}
                aria-label={letter}
                onClick={() => onPick(index)}
              >
                <LetterGlyph letter={letter} />
              </button>
            ))}
          </div>
        </div>
      );
    case "hear-initial":
    case "see-initial":
      return (
        <div className="english-match">
          {question.kind === "see-initial" && (
            <span className="english-given is-picture">
              <WordPicture word={question.word} />
            </span>
          )}
          <div className="english-choices is-pairs" role="group" aria-label="字母">
            {question.choices.map((letter, index) => (
              <button
                type="button"
                key={index}
                className={`english-choice${state(index)}`}
                aria-label={`${letter.toUpperCase()}${letter}`}
                onClick={() => onPick(index)}
              >
                <LetterPair letter={letter} />
              </button>
            ))}
          </div>
        </div>
      );
    case "hear-word":
    case "word-order": {
      const pictures = question.kind === "hear-word" ? question.choices : question.pictures;
      return (
        <div
          className="english-choices is-pictures"
          style={{ "--count": pictures.length } as CSSProperties}
          role="group"
          aria-label="圖片"
        >
          {pictures.map((word, index) => (
            <button
              type="button"
              key={index}
              className={`english-choice${state(index)}`}
              aria-label={word}
              onClick={() => onPick(index)}
            >
              <WordPicture word={word} />
              {question.kind === "word-order" && picks.includes(index) && (
                <span className="english-order" aria-hidden="true">
                  {picks.indexOf(index) + 1}
                </span>
              )}
            </button>
          ))}
        </div>
      );
    }
    case "dialogue":
      return (
        <div className="english-choices is-scenes" role="group" aria-label="情形">
          {question.choices.map((id, index) => (
            <button
              type="button"
              key={index}
              className={`english-choice${state(index)}`}
              aria-label={`第 ${index + 1} 張圖`}
              onClick={() => onPick(index)}
            >
              <DialogueScene id={id} />
            </button>
          ))}
        </div>
      );
  }
}

/**
 * Squares on four lines, sharing one pen (only one writes at a time); each has its own eraser,
 * undo and clear above it.
 */
function LetterSquares({
  scope,
  cells,
  names,
  labels,
  traces,
  onCell,
}: {
  scope: string;
  cells: InkStroke[][];
  /** What each square is called, for screen readers. */
  names: string[];
  /** What shows above each square: 大寫 or 小寫 in 國字注音, or the blank's number. */
  labels: ReactNode[];
  /** The letter to trace in each square, if any. */
  traces?: (string | null)[];
  onCell: (index: number, strokes: InkStroke[]) => void;
}) {
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const ink = useInkCanvas({
    scope,
    mounted: true,
    enabled: true,
    count: names.length,
    getCanvas: (index) => canvases.current[index] ?? null,
    readInitial: (index) => cells[index] ?? [],
    onChange: onCell,
  });
  return (
    <div className="english-squares" style={{ "--count": names.length } as CSSProperties}>
      {names.map((name, index) => (
        <div className="english-square" key={index}>
          <span className="english-square-label">{labels[index]}</span>
          <InkTools
            compact
            cellLabel={name}
            erasing={ink.eraserCell === index}
            hasInk={Boolean(ink.ink[index])}
            canUndo={Boolean(ink.undoAvailable[index])}
            onEraser={() => ink.toggleEraser(index)}
            onUndo={() => ink.undo(index)}
            onClear={() => ink.clear(index)}
          />
          <div className="canvas-paper english-paper">
            <FourLines />
            {traces?.[index] && <LetterGlyph letter={traces[index]!} square trace />}
            <canvas
              ref={(element) => {
                canvases.current[index] = element;
              }}
              data-word-index={index}
              className={ink.eraserCell === index ? "is-erasing" : undefined}
              onPointerDown={ink.begin}
              onPointerMove={ink.move}
              onPointerUp={ink.end}
              onPointerCancel={ink.end}
              onLostPointerCapture={ink.end}
              aria-label={name}
            />
          </div>
        </div>
      ))}
      <InkStatus message={ink.notice} />
    </div>
  );
}

/** A written square as the parent sees it: the child's strokes on the four lines. */
function SquarePreview({ strokes }: { strokes: InkStroke[] }) {
  return (
    <span className="english-preview">
      <FourLines />
      {strokes.length ? <InkPreview strokes={strokes} /> : <span>沒有作答</span>}
    </span>
  );
}

/** The model answer on the same four lines. */
function AnswerPreview({ letter }: { letter: string }) {
  return (
    <span className="english-preview is-answer">
      <FourLines />
      <LetterGlyph letter={letter} square />
    </span>
  );
}

/** 寫一寫: written on four lines, saved as it goes, then checked by the parent like 默寫. */
function WriteLesson({ app, lesson }: { app: EnglishApp; lesson: EnglishLesson }) {
  const [round, setRound] = useState<EnglishWriteRound | null>(
    () =>
      (app.englishPractice.start === "continue" && readWriteRound(lesson.id)) ||
      newWriteRound(lesson.id),
  );
  const [finished, setFinished] = useState<EnglishWriteRound | null>(null);
  const voice = useEnglishVoice(app);
  const play = useCallback(
    (question: WriteQuestion) =>
      voice([`prompt-${writePromptId(question)}`, ...writeClips(question)]),
    [voice],
  );

  useEffect(() => {
    if (round) writeWriteRound({ ...round, savedAt: Date.now() });
  }, [round]);

  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !round || round.phase === "check") return;
    opened.current = true;
    play(round.questions[round.index]);
  });

  const goTo = (current: EnglishWriteRound, index: number) => {
    setRound({ ...current, index });
    play(current.questions[index]);
  };
  const leave = () => {
    app.stopPlayback();
    app.navigate("english-lesson");
  };
  const header = (title: string, detail?: string) => (
    <MathHeader title={title} detail={detail} onLeave={leave} />
  );

  if (finished || !round) {
    const done = finished ?? newWriteRound(lesson.id);
    const needs = done.needsPractice.map((index) => writeTopic(done.questions[index]));
    return (
      <main className="math-shell english-shell is-result">
        {header(`英語${lesson.number} · ${lesson.title}`)}
        <MathResult
          title="寫一寫練完了！"
          note={
            needs.length
              ? `有 ${needs.length} 題要再練習：${needs.join("、")}`
              : `${done.questions.length} 題全部都會了！`
          }
          onAgain={() => {
            setFinished(null);
            goTo(newWriteRound(lesson.id), 0);
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
      <main className="math-shell english-shell is-check">
        {header(`英語${lesson.number} · 家長檢查`)}
        <section className="math-check english-check">
          <h2>請家長一起檢查</h2>
          <p>
            對照右邊的寫法，看看字母有沒有站在正確的線上、大小寫有沒有分清楚，把還不會的題目標成「需要補強」。
          </p>
          {round.questions.map((question, index) => {
            const cells = round.work[index] ?? [];
            const answer = writeAnswer(question);
            const pending = round.needsPractice.includes(index);
            const tips = [...new Set(answer.map((letter) => writingTips[letter]).filter(Boolean))];
            return (
              <article className="math-check-card english-check-card" key={index}>
                <h2>
                  第 {index + 1} 題 · {writeSection(question)}：{writeTopic(question)}
                </h2>
                {question.kind === "write-initial" && (
                  <div className="english-check-word">
                    <WordPicture word={question.word} />
                    <WordLetters word={question.word} />
                  </div>
                )}
                <div className="english-check-row">
                  {answer.map((letter, square) => (
                    <figure key={square}>
                      <SquarePreview strokes={cells[square] ?? []} />
                      <AnswerPreview letter={letter} />
                      <figcaption>
                        孩子寫的 · 答案 <strong>{letter}</strong>
                      </figcaption>
                    </figure>
                  ))}
                </div>
                {tips.map((tip) => (
                  <p className="english-tip" key={tip}>
                    {tip}
                  </p>
                ))}
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
              recordEnglishResult({
                lessonId: lesson.id,
                mode: "write",
                total: round.questions.length,
                needsPractice: round.needsPractice.map((index) =>
                  writeTopic(round.questions[index]),
                ),
              });
              app.awardStamp({
                kind: "practice",
                subject: "english",
                detail: `英語${lesson.number} 寫一寫`,
                taskKey: taskKeys.english(lesson.id, "write"),
                needsPractice: round.needsPractice.length,
              });
              clearWriteRound(lesson.id);
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
  const last = round.index === round.questions.length - 1;
  const setCell = (cell: number, next: InkStroke[]) =>
    setRound((current) => {
      if (!current) return current;
      const cells = Array.from(
        { length: squaresOf(current.questions[current.index]) },
        (_, index) => current.work[current.index]?.[index] ?? [],
      );
      cells[cell] = next;
      return { ...current, work: { ...current.work, [current.index]: cells } };
    });
  const scope = `english:${round.createdAt}:${round.index}`;
  const cells = round.work[round.index] ?? [];
  const caseLabel = (letterCase: "upper" | "lower") => (
    <EnglishWords text={letterCase === "upper" ? "大寫" : "小寫"} />
  );
  return (
    <main className="math-shell english-shell">
      {header(
        `${lesson.number} · ${writeSection(question)}`,
        `第 ${round.index + 1} 題 / ${round.questions.length}`,
      )}
      <section className={`math-question english-question is-${question.kind}`}>
        <EnglishPrompt id={writePromptId(question)} onPlay={() => play(question)} />
        {question.kind === "trace" ? (
          <LetterSquares
            scope={scope}
            cells={cells}
            names={["描大寫", "描小寫"]}
            labels={[caseLabel("upper"), caseLabel("lower")]}
            traces={[question.letter.toUpperCase(), question.letter]}
            onCell={setCell}
          />
        ) : question.kind === "write-letter" ? (
          <div className="english-single">
            <LetterSquares
              scope={scope}
              cells={cells}
              names={[question.case === "upper" ? "寫大寫" : "寫小寫"]}
              labels={[caseLabel(question.case)]}
              onCell={setCell}
            />
          </div>
        ) : question.kind === "write-initial" ? (
          <div className="english-initial">
            <div className="english-initial-word">
              <WordPicture word={question.word} />
              <WordLetters word={question.word} blanks={[0]} />
            </div>
            <div className="english-single">
              <LetterSquares
                scope={scope}
                cells={cells}
                names={["寫第一個字母"]}
                labels={[null]}
                onCell={setCell}
              />
            </div>
          </div>
        ) : (
          <div className="english-missing">
            {/* The row as the workbook prints it; each blank shows what was written below. */}
            <div
              className="english-row"
              style={{ "--count": question.row.length } as CSSProperties}
            >
              {question.row.map((letter, index) => {
                const blank = question.blanks.indexOf(index);
                return (
                  <span
                    className={`english-row-letter${blank >= 0 ? " is-blank" : ""}`}
                    key={index}
                  >
                    <FourLines />
                    {blank >= 0 ? (
                      <>
                        <InkPreview strokes={cells[blank] ?? []} />
                        <span className="english-row-number">{blank + 1}</span>
                      </>
                    ) : (
                      <LetterGlyph
                        letter={question.case === "upper" ? letter.toUpperCase() : letter}
                        square
                      />
                    )}
                  </span>
                );
              })}
            </div>
            <LetterSquares
              scope={scope}
              cells={cells}
              names={question.blanks.map((_, blank) => `第 ${blank + 1} 個空格`)}
              labels={question.blanks.map((_, blank) => (
                <span className="english-row-number" key={blank}>
                  {blank + 1}
                </span>
              ))}
              onCell={setCell}
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
                app.stopPlayback();
                setRound({
                  ...round,
                  phase: "check",
                  // Unwritten questions start marked; the parent can clear any mark.
                  needsPractice: round.questions
                    .map((_, index) => index)
                    .filter((index) => !isWritten(round, index)),
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

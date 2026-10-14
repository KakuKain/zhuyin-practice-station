import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Carrot, CheckCircle, HandPointing, Rabbit, XCircle } from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import { isPalmContact } from "../../lib/ink/gesture";
import { MathHeader, MathPrompt, MathResult } from "./MathChrome";
import { mathPromptUrl, mathPrompts } from "./math-audio";
import { taskKeys } from "../rewards/stamp-book";
import type { MathLesson } from "./math-lessons";
import { recordMathResult } from "./math-round";
import {
  buildSequenceRound,
  inAnyOrder,
  isSequenceQuestion,
  sequenceAnswer,
  sequencePromptId,
  sequenceSection,
  sequenceTopic,
  type SequenceQuestion,
} from "./sequence-round";
import { SequenceStage, choiceState, type Feedback } from "./SequenceViews";
import {
  answerOf,
  buildCompareRound,
  kidPicture,
  kidStretches,
  comparePromptIds,
  compareTopic,
  ground,
  needsLining,
  palette,
  routePoints,
  snapDistance,
  startLine,
  type Bar,
  type CompareQuestion,
  type LineShape,
} from "./compare-round";

type CompareApp = Pick<AppController, "speak" | "stopPlayback" | "navigate" | "awardStamp">;
type BarQuestion = Extract<CompareQuestion, { kind: "compare" }>;
/** A question answered by tapping: 第二課 比長短's, or 第三課 排順序、比多少's. */
type TapQuestion = CompareQuestion | SequenceQuestion;

/** Each tapped lesson's round, by lesson id. */
const tapRounds: Record<number, () => TapQuestion[]> = {
  2: buildCompareRound,
  7: buildSequenceRound,
};

const correctDelay = 1300;
const retryDelay = 900;

const sectionOf = (question: TapQuestion) =>
  isSequenceQuestion(question)
    ? sequenceSection(question)
    : question.kind === "compare"
      ? question.measure === "length"
        ? "比長短"
        : "比高矮"
      : question.kind === "thickness"
        ? "比厚薄"
        : "直線和曲線";

const topicOf = (question: TapQuestion) =>
  isSequenceQuestion(question) ? sequenceTopic(question) : compareTopic(question);

/** The instructions read aloud: first how to line things up (比長短 only), then what to answer. */
const promptsOf = (question: TapQuestion): { lineUp?: string; ask: string } =>
  isSequenceQuestion(question) ? { ask: sequencePromptId(question) } : comparePromptIds(question);

const firstPrompt = (question: TapQuestion) => {
  const ids = promptsOf(question);
  return ids.lineUp ?? ids.ask;
};

/**
 * The lessons answered by tapping, 第二課 比長短 and 第三課 排順序、比多少: checked at once and
 * tried again until right.
 */
export function CompareLesson({ app, lesson }: { app: CompareApp; lesson: MathLesson }) {
  const buildRound = tapRounds[lesson.id] ?? buildCompareRound;
  const [round, setRound] = useState<{ id: number; questions: TapQuestion[] } | null>(() => ({
    id: Date.now(),
    questions: buildRound(),
  }));
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState<{ total: number; topics: string[] } | null>(null);
  const missed = useRef(new Set<number>());
  const { speak, stopPlayback } = app;
  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const say = useCallback(
    (id: string) => speak(mathPrompts[id], { url: mathPromptUrl(id) }),
    [speak],
  );
  // The first instruction plays as the round opens, right after the tap on 開始練習.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !round) return;
    opened.current = true;
    say(firstPrompt(round.questions[0]));
  }, [round, say]);

  const leave = () => {
    stopPlayback();
    app.navigate("math-lesson");
  };
  const again = () => {
    const questions = buildRound();
    missed.current = new Set();
    setFinished(null);
    setIndex(0);
    setRound({ id: Date.now(), questions });
    say(firstPrompt(questions[0]));
  };

  if (finished || !round)
    return (
      <main className="math-shell is-result">
        <MathHeader title={`數學${lesson.number} · ${lesson.title}`} onLeave={leave} />
        <MathResult
          title="這一課練完了！"
          note={
            finished?.topics.length
              ? `這幾題多試了一次才答對，可以再練習看看：${finished.topics.join("、")}`
              : `${finished?.total ?? 0} 題都完成了，每一題第一次就答對了！`
          }
          onAgain={again}
          onLeave={leave}
        />
      </main>
    );

  const question = round.questions[index];
  const next = () => {
    const following = index + 1;
    if (following < round.questions.length) {
      setIndex(following);
      say(firstPrompt(round.questions[following]));
      return;
    }
    const topics = [...missed.current]
      .sort((a, b) => a - b)
      .map((item) => topicOf(round.questions[item]));
    recordMathResult({
      lessonId: lesson.id,
      total: round.questions.length,
      needsPractice: topics.map((kind) => ({ kind })),
    });
    app.awardStamp({
      kind: "practice",
      subject: "math",
      detail: `數學${lesson.number} ${lesson.title}`,
      taskKey: taskKeys.math(lesson.id),
      needsPractice: topics.length,
    });
    setFinished({ total: round.questions.length, topics });
    setRound(null);
  };
  return (
    <main className="math-shell">
      <MathHeader
        title={`${lesson.number} · ${sectionOf(question)}`}
        detail={`第 ${index + 1} 題 / ${round.questions.length}`}
        onLeave={leave}
      />
      <QuestionView
        key={`${round.id}:${index}`}
        question={question}
        say={say}
        onMiss={() => missed.current.add(index)}
        onDone={next}
      />
    </main>
  );
}

function QuestionView({
  question,
  say,
  onMiss,
  onDone,
}: {
  question: TapQuestion;
  say: (id: string) => void;
  onMiss: () => void;
  onDone: () => void;
}) {
  const ids = promptsOf(question);
  const [lining, setLining] = useState(
    () => !isSequenceQuestion(question) && needsLining(question),
  );
  const [picks, setPicks] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  const promptId = lining && ids.lineUp ? ids.lineUp : ids.ask;
  const answer = isSequenceQuestion(question) ? sequenceAnswer(question) : answerOf(question);

  // 「點三個」 takes the three in any order; 從小到大 must go in order.
  const anyOrder = isSequenceQuestion(question) && inAnyOrder(question);
  const pick = (choice: number) => {
    if (feedback || lining || picks.includes(choice)) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
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

  return (
    <section className={`compare-question is-${question.kind}`}>
      <MathPrompt id={promptId} onPlay={() => say(promptId)} />
      {isSequenceQuestion(question) ? (
        <SequenceStage question={question} picks={picks} feedback={feedback} onPick={pick} />
      ) : question.kind === "compare" ? (
        <BarStage
          question={question}
          lining={lining}
          onLinedUp={() => {
            setLining(false);
            say(ids.ask);
          }}
          picks={picks}
          feedback={feedback}
          onPick={pick}
        />
      ) : question.kind === "thickness" ? (
        <BookShelf question={question} feedback={feedback} onPick={pick} />
      ) : question.kind === "line" ? (
        <LineChoices question={question} feedback={feedback} onPick={pick} />
      ) : (
        <RouteMap question={question} feedback={feedback} onPick={pick} />
      )}
      {/* Mounted before any answer so screen readers announce each change. */}
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
    </section>
  );
}

/** 比厚薄: two books standing on a shelf, the same height, so only their thickness differs. */
function BookShelf({
  question,
  feedback,
  onPick,
}: {
  question: Extract<CompareQuestion, { kind: "thickness" }>;
  feedback: Feedback;
  onPick: (index: number) => void;
}) {
  return (
    <div className="compare-shelf" role="group" aria-label="書架上的兩本書">
      <div className="compare-books">
        {question.books.map((book, index) => {
          const { color, name } = palette[book.color];
          return (
            <button
              type="button"
              key={index}
              className={`compare-book${choiceState(index, [], feedback)}`}
              style={{ width: `${book.size}%`, "--book": color } as CSSProperties}
              aria-label={`${name}的書`}
              onClick={() => onPick(index)}
            >
              <span className="compare-book-band" aria-hidden="true" />
              <span className="compare-book-label" aria-hidden="true" />
              <span className="compare-book-band" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div className="compare-shelf-board" aria-hidden="true" />
    </div>
  );
}

function Pencil({ color }: { color: string }) {
  return (
    <span className="pencil" style={{ "--pencil": color } as CSSProperties} aria-hidden="true">
      <span className="pencil-eraser" />
      <span className="pencil-band" />
      <span className="pencil-body" />
      <svg className="pencil-tip" viewBox="0 0 28 24" preserveAspectRatio="none">
        <path d="M0 0 L28 12 L0 24 Z" fill="#f3cf9c" />
        <path d="M18 7.7 L28 12 L18 16.3 Z" fill="#3a3a3a" />
      </svg>
    </span>
  );
}

/** A child's drawn shape once its body grows or shrinks by `stretch`. */
const kidShape = (shade: number, stretch: number) => {
  const { width, height, body } = kidPicture(shade);
  const [top, bottom] = body.map((at) => at * height);
  return { width, height, top, bottom, total: top + (bottom - top) * stretch + (height - bottom) };
};

/**
 * A watercolor child in the shirt of the palette colour. The head and the shoes keep their
 * size; only the part from below the chin to the socks grows or shrinks, the way classmates of
 * different heights differ. Each part overlaps the next by a pixel, so no seam shows.
 */
function Child({ shade, stretch }: { shade: number; stretch: number }) {
  const { width, height, top, bottom, total } = kidShape(shade, stretch);
  const src = `course-art/kid-${palette[shade].kid}.webp`;
  const middle = (bottom - top) * stretch;
  const part = (at: number, size: number, from: number, to: number) => (
    <svg
      x={0}
      y={at}
      width={width}
      height={size}
      viewBox={`0 ${from} ${width} ${to - from}`}
      preserveAspectRatio="none"
    >
      <image href={src} width={width} height={height} />
    </svg>
  );
  return (
    <svg
      className="compare-kid"
      viewBox={`0 0 ${width} ${total}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {part(top + middle - 1, height - bottom + 1, bottom - 1, height)}
      {part(top - 1, middle + 2, top - 1, bottom + 1)}
      {part(0, top + 1, 0, top + 1)}
    </svg>
  );
}

type Drag = { pointer: number; index: number; x: number; y: number; from: number; moved: boolean };

/**
 * Pencils lie along the start line; children stand on the ground. Anything out of line is
 * dragged into place first (a tap slides it there too); only then can the child answer.
 */
function BarStage({
  question,
  lining,
  onLinedUp,
  picks,
  feedback,
  onPick,
}: {
  question: BarQuestion;
  lining: boolean;
  onLinedUp: () => void;
  picks: number[];
  feedback: Feedback;
  onPick: (index: number) => void;
}) {
  const { bars, measure } = question;
  const length = measure === "length";
  const stageRef = useRef<HTMLDivElement>(null);
  const [offsets, setOffsetState] = useState(() => bars.map((bar) => bar.offset));
  const offsetsRef = useRef(offsets);
  const drag = useRef<Drag | null>(null);
  const skipClick = useRef(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);

  const setOffsets = (next: number[]) => {
    offsetsRef.current = next;
    setOffsetState(next);
    if (lining && next.every((offset) => offset === 0)) onLinedUp();
  };
  const settle = (index: number, value: number) =>
    setOffsets(offsetsRef.current.map((offset, item) => (item === index ? value : offset)));
  const farthest = (bar: Bar) => (length ? 100 - startLine - bar.size - 1 : ground - bar.size - 3);

  const begin = (index: number) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    skipClick.current = false;
    if (!lining || offsetsRef.current[index] === 0 || drag.current || isPalmContact(event)) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The window still ends the drag through lostpointercapture or pointerup on the button.
    }
    drag.current = {
      pointer: event.pointerId,
      index,
      x: event.clientX,
      y: event.clientY,
      from: offsetsRef.current[index],
      moved: false,
    };
    setDragging(index);
    setTouched(true);
  };
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    const stage = stageRef.current;
    if (!current || current.pointer !== event.pointerId || !stage) return;
    const box = stage.getBoundingClientRect();
    const shift = length
      ? ((event.clientX - current.x) / box.width) * 100
      : ((current.y - event.clientY) / box.height) * 100;
    if (Math.abs(shift) > 1.5) current.moved = true;
    const value = Math.min(Math.max(current.from + shift, 0), farthest(bars[current.index]));
    offsetsRef.current = offsetsRef.current.map((offset, item) =>
      item === current.index ? value : offset,
    );
    setOffsetState(offsetsRef.current);
  };
  const end = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(null);
    skipClick.current = current.moved;
    const value = offsetsRef.current[current.index];
    settle(current.index, value <= snapDistance ? 0 : value);
  };
  const click = (index: number) => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    if (!lining) return onPick(index);
    if (offsetsRef.current[index] > 0) {
      setTouched(true);
      settle(index, 0);
    }
  };

  // 比高矮: both children at one scale, so their heads are the same size.
  const stretches = length ? bars.map(() => 1) : kidStretches(bars);
  const rows = [30, 70];
  const slots = [32, 68];
  const hintIndex = lining && !touched && dragging === null ? offsets.findIndex((o) => o > 0) : -1;
  const hint =
    hintIndex < 0
      ? null
      : length
        ? {
            x0: startLine + offsets[hintIndex] + bars[hintIndex].size * 0.4,
            x1: startLine + bars[hintIndex].size * 0.4,
            y0: rows[hintIndex],
            y1: rows[hintIndex],
          }
        : {
            x0: slots[hintIndex],
            x1: slots[hintIndex],
            y0: ground - offsets[hintIndex] - bars[hintIndex].size * 0.45,
            y1: ground - bars[hintIndex].size * 0.45,
          };

  return (
    <div ref={stageRef} className={`compare-stage is-${measure}`}>
      {length ? (
        <div className="compare-start-line" style={{ left: `${startLine}%` }}>
          <span>起點</span>
        </div>
      ) : (
        <>
          <div className="compare-ground" style={{ top: `${ground}%` }} />
          {bars.map(
            (bar, index) =>
              bar.offset > 0 && (
                <div
                  key={index}
                  className={`compare-box${offsets[index] === 0 ? " is-empty" : ""}`}
                  style={{
                    left: `${slots[index]}%`,
                    bottom: `${100 - ground}%`,
                    height: `${bar.offset}%`,
                  }}
                />
              ),
          )}
        </>
      )}
      {bars.map((bar, index) => {
        const { color, name } = palette[bar.color];
        const movable = lining && offsets[index] > 0;
        const lined = bar.offset > 0 && offsets[index] === 0;
        return (
          <button
            type="button"
            key={index}
            className={`compare-item is-${length ? "pencil" : "child"}${movable ? " is-movable" : ""}${dragging === index ? " is-dragging" : ""}${lined ? " is-lined" : ""}${choiceState(index, picks, feedback)}`}
            style={
              length
                ? {
                    left: `${startLine + offsets[index]}%`,
                    width: `${bar.size}%`,
                    top: `${rows[index]}%`,
                  }
                : {
                    left: `${slots[index]}%`,
                    bottom: `${100 - ground + offsets[index]}%`,
                    height: `${bar.size}%`,
                    aspectRatio: `${kidShape(bar.color, stretches[index]).width} / ${kidShape(bar.color, stretches[index]).total}`,
                  }
            }
            aria-label={length ? `${name}的鉛筆` : `穿${name}衣服的小朋友`}
            onPointerDown={begin(index)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onLostPointerCapture={end}
            onClick={() => click(index)}
          >
            {length ? (
              <Pencil color={color} />
            ) : (
              <Child shade={bar.color} stretch={stretches[index]} />
            )}
          </button>
        );
      })}
      {hint && (
        <span
          className="compare-hint"
          aria-hidden="true"
          style={
            {
              "--hint-x0": `${hint.x0}%`,
              "--hint-x1": `${hint.x1}%`,
              "--hint-y0": `${hint.y0}%`,
              "--hint-y1": `${hint.y1}%`,
            } as CSSProperties
          }
        >
          <HandPointing size={48} weight="fill" />
        </span>
      )}
    </div>
  );
}

const linePaths: Record<LineShape, string> = {
  straight: "M16 50 L84 50",
  arc: "M16 66 Q50 2 84 66",
  wave: "M12 50 C24 20 38 20 50 50 S76 80 88 50",
  "s-curve": "M24 82 C22 38 78 62 76 18",
  hook: "M22 26 C66 6 92 58 50 80",
};

function LineChoices({
  question,
  feedback,
  onPick,
}: {
  question: Extract<CompareQuestion, { kind: "line" }>;
  feedback: Feedback;
  onPick: (index: number) => void;
}) {
  return (
    <div className="compare-lines">
      {question.lines.map((line, index) => (
        <button
          type="button"
          key={index}
          className={choiceState(index, [], feedback).trim() || undefined}
          aria-label={`第 ${index + 1} 條線`}
          onClick={() => onPick(index)}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path d={linePaths[line.shape]} transform={`rotate(${line.angle} 50 50)`} />
          </svg>
        </button>
      ))}
    </div>
  );
}

/** The rabbit on the left, the carrot on the right, and three roads to tap. */
function RouteMap({
  question,
  feedback,
  onPick,
}: {
  question: Extract<CompareQuestion, { kind: "route" }>;
  feedback: Feedback;
  onPick: (index: number) => void;
}) {
  return (
    <div className="compare-route">
      <svg viewBox="0 0 160 100">
        {question.routes.map((route, index) => {
          const points = routePoints(question, route.shape);
          const d = `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L")}`;
          const [mx, my] = points[Math.floor(points.length / 2)];
          const { color, name } = palette[route.color];
          return (
            <g
              key={index}
              role="button"
              tabIndex={0}
              aria-label={`${name}的路`}
              className={choiceState(index, [], feedback).trim() || undefined}
              onClick={() => onPick(index)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onPick(index);
              }}
            >
              <path d={d} className="route-hit" />
              <path d={d} className="route-line" stroke={color} />
              <circle cx={mx} cy={my} r="5.5" fill={color} className="route-flag" />
            </g>
          );
        })}
      </svg>
      <span
        className="route-end"
        role="img"
        aria-label="小兔子"
        style={{ left: "7.5%", top: `${question.from}%` }}
      >
        <Rabbit weight="fill" aria-hidden="true" />
      </span>
      <span
        className="route-end"
        role="img"
        aria-label="紅蘿蔔"
        style={{ left: "92.5%", top: `${question.to}%` }}
      >
        <Carrot weight="fill" aria-hidden="true" />
      </span>
    </div>
  );
}

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
import { MathHeader, MathPrompt, MathStartButton } from "./MathChrome";
import { mathPromptUrl, mathPrompts } from "./math-audio";
import type { MathLesson } from "./math-lessons";
import { recordMathResult } from "./math-round";
import {
  answerOf,
  buildCompareRound,
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
type BarQuestion = Extract<CompareQuestion, { kind: "compare" | "order" }>;
type Feedback = { kind: "correct" | "retry"; pick: number } | null;

const correctDelay = 1300;
const retryDelay = 900;

const sectionOf = (question: CompareQuestion) =>
  question.kind === "compare"
    ? question.measure === "length"
      ? "比長短"
      : "比高矮"
    : question.kind === "order"
      ? "排順序"
      : question.kind === "line"
        ? "直線和曲線"
        : "哪條路最近";

const firstPrompt = (question: CompareQuestion) => {
  const ids = comparePromptIds(question);
  return ids.lineUp ?? ids.ask;
};

/** 第二課 比一比: tap to answer, checked at once and tried again until right. */
export function CompareLesson({ app, lesson }: { app: CompareApp; lesson: MathLesson }) {
  const [round, setRound] = useState<{ id: number; questions: CompareQuestion[] } | null>(null);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState<{ total: number; topics: string[] } | null>(null);
  const missed = useRef(new Set<number>());
  const { speak, stopPlayback } = app;
  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const say = useCallback(
    (id: string) => speak(mathPrompts[id], { url: mathPromptUrl(id) }),
    [speak],
  );
  const leave = () => {
    stopPlayback();
    app.navigate("courses");
  };
  // Started from a tap, so the first instruction plays even where audio needs a gesture.
  const start = () => {
    const questions = buildCompareRound();
    missed.current = new Set();
    setFinished(null);
    setIndex(0);
    setRound({ id: Date.now(), questions });
    say(firstPrompt(questions[0]));
  };
  const title = `${lesson.number} · ${lesson.title}`;

  if (finished)
    return (
      <main className="math-shell">
        <MathHeader title={title} onLeave={leave} />
        <section className="math-result">
          <h1>練習完成！</h1>
          <p>
            {finished.total} 題都完成了
            {finished.topics.length ? "。" : "，每一題第一次就答對了！"}
          </p>
          {finished.topics.length > 0 && (
            <p className="compare-result-topics">
              這幾題多試了一次才答對，可以再練習看看：{finished.topics.join("、")}
            </p>
          )}
          <div className="math-actions">
            <button type="button" className="primary-button" onClick={start}>
              再練一次
            </button>
            <button type="button" className="secondary-button" onClick={leave}>
              回到課程
            </button>
          </div>
        </section>
      </main>
    );

  if (!round)
    return (
      <main className="math-shell">
        <MathHeader title={title} onLeave={leave} />
        <section className="math-ready">
          <h1>{lesson.title}</h1>
          <p>{lesson.round}</p>
          <MathStartButton onStart={start} />
        </section>
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
      .map((item) => compareTopic(round.questions[item]));
    recordMathResult({
      lessonId: lesson.id,
      total: round.questions.length,
      needsPractice: topics.map((kind) => ({ kind })),
    });
    app.awardStamp({
      kind: "practice",
      subject: "math",
      detail: `數學${lesson.number} ${lesson.title}`,
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
  question: CompareQuestion;
  say: (id: string) => void;
  onMiss: () => void;
  onDone: () => void;
}) {
  const ids = comparePromptIds(question);
  const [lining, setLining] = useState(() => needsLining(question));
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
  const answer = answerOf(question);

  const pick = (choice: number) => {
    if (feedback || lining || picks.includes(choice)) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    if (choice === answer[picks.length]) {
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
      {question.kind === "compare" || question.kind === "order" ? (
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

const choiceState = (index: number, picks: number[], feedback: Feedback) =>
  feedback?.pick === index
    ? ` is-${feedback.kind === "correct" ? "correct" : "wrong"}`
    : picks.includes(index)
      ? " is-picked"
      : "";

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

function Child({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <rect x="3" y="28" width="7" height="25" rx="3.5" fill={color} />
      <rect x="30" y="28" width="7" height="25" rx="3.5" fill={color} />
      <circle cx="6.5" cy="55" r="3.5" fill="#f5cfae" />
      <circle cx="33.5" cy="55" r="3.5" fill="#f5cfae" />
      <rect x="11" y="58" width="8" height="37" rx="3" fill="#3d4f6b" />
      <rect x="21" y="58" width="8" height="37" rx="3" fill="#3d4f6b" />
      <rect x="9" y="25" width="22" height="37" rx="8" fill={color} />
      <ellipse cx="14" cy="96.5" rx="6" ry="3.5" fill="#2b2b2b" />
      <ellipse cx="26" cy="96.5" rx="6" ry="3.5" fill="#2b2b2b" />
      <circle cx="20" cy="13" r="11" fill="#f5cfae" />
      <path d="M9 13 C9 3 31 3 31 13 C27 8 13 8 9 13 Z" fill="#3b2a20" />
      <circle cx="16" cy="14" r="1.4" fill="#2b2b2b" />
      <circle cx="24" cy="14" r="1.4" fill="#2b2b2b" />
      <path
        d="M16.5 18.5 Q20 21 23.5 18.5"
        stroke="#c0605a"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
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

  const rows = bars.length === 2 ? [30, 70] : [20, 50, 80];
  const slots = bars.length === 2 ? [32, 68] : [20, 50, 80];
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
    <div
      ref={stageRef}
      className={`compare-stage is-${measure}${bars.length === 3 ? " is-three" : ""}`}
    >
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
        const order = picks.indexOf(index);
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
            {length ? <Pencil color={color} /> : <Child color={color} />}
            {question.kind === "order" && order >= 0 && (
              <span className="compare-pick-number" aria-hidden="true">
                {order + 1}
              </span>
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

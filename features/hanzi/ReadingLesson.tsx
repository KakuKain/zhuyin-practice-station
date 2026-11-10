import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ArrowRight, BookOpenText, CheckCircle, SpeakerHigh, XCircle } from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import { AnnotatedText } from "../../components/AnnotatedText";
import { ProgressiveImage } from "../../components/ProgressiveImage";
import { MathHeader, MathResult } from "../math/MathChrome";
import { mathPromptUrl, mathPrompts } from "../math/math-audio";
import { readingVariants } from "../lesson/reading-variants";
import { HanziWords } from "./HanziChrome";
import { clipOf, useSay, type Said } from "./clip-voice";
import {
  buildReadingRound,
  orderPrompt,
  paintedReading,
  readingScenes,
  readingThings,
  type ReadingQuestion,
  type ReadingStep,
} from "./reading-lesson";
import "../../styles/lazy/hanzi.css";

/** A sentence in 國字注音 with its own readings. */
function Reading({ said }: { said: Said }) {
  return <AnnotatedText text={said.text} variants={readingVariants(said.text, said.readings)} />;
}

/** A scene or thing's watercolor once painted; until then its words on a card. */
function Picture({ art, said }: { art: string; said: Said }) {
  return paintedReading.includes(art) ? (
    <ProgressiveImage className="reading-picture" src={`course-art/reading/${art}.webp`} alt="" />
  ) : (
    <span className="reading-picture is-words">
      <Reading said={said} />
    </span>
  );
}

/**
 * 閱讀階梯「擁抱」's page: read the story in the book first (pp. 74–79), then practise here.
 */
export function ReadingLessonPage({ app }: { app: Pick<AppController, "startHanziReading"> }) {
  return (
    <section className="page-section lesson-page math-lesson-page hanzi-lesson-page reading-lesson-page">
      <div className="lesson-heading">
        <div>
          <span className="eyebrow">
            <HanziWords text="閱讀階梯" />
          </span>
          <h1 className="lesson-title">
            <HanziWords text="擁抱" />
          </h1>
        </div>
        <ProgressiveImage
          className="lesson-heading-art"
          src={`course-art/${paintedReading.includes("hug") ? "reading/hug" : "book1-cover"}.webp`}
          alt=""
        />
      </div>
      <p className="reading-first">
        <BookOpenText size={26} weight="duotone" aria-hidden="true" />
        <span>
          <HanziWords text="先讀課本的故事" /> <small>（第 74～79 頁）</small>
        </span>
      </p>
      <div className="mode-grid is-single">
        <button
          className="mode-card listen-mode"
          type="button"
          aria-label="開始練習，排一排和回答問題"
          onClick={() => app.startHanziReading()}
        >
          <span className="mode-icon" aria-hidden="true">
            <BookOpenText size={28} weight="duotone" />
          </span>
          <span className="lesson-mode-copy">
            <small>
              <HanziWords text="排一排" />・<HanziWords text="回答問題" />
            </small>
            <strong>
              <HanziWords text="開始練習" />
            </strong>
          </span>
          <span className="lesson-mode-cta">
            <HanziWords text="開始" /> <ArrowRight size={19} weight="bold" aria-hidden="true" />
          </span>
        </button>
      </div>
    </section>
  );
}

type ReadingApp = Pick<AppController, "navigate" | "speak" | "stopPlayback" | "awardStamp">;

const correctDelay = 1300;
const retryDelay = 900;

/** A round: 排一排 the scenes, then questions answered by a tap and retried until right. */
export function ReadingScreen({ app }: { app: ReadingApp }) {
  const [round, setRound] = useState(() => buildReadingRound());
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState<Set<number>>(() => new Set());
  const [finished, setFinished] = useState(false);
  const leave = () => {
    app.stopPlayback();
    app.navigate("hanzi-lesson");
  };
  const next = () => {
    if (index + 1 < round.length) {
      setIndex(index + 1);
      return;
    }
    app.awardStamp({
      kind: "practice",
      subject: "zhuyin",
      detail: "第一冊 閱讀階梯 擁抱",
      needsPractice: missed.size,
    });
    setFinished(true);
  };
  return (
    <main className="math-shell hanzi-shell reading-shell">
      <MathHeader
        title="閱讀階梯 · 擁抱"
        detail={finished ? undefined : `第 ${index + 1} 題 / ${round.length}`}
        onLeave={leave}
      />
      {finished ? (
        <MathResult
          title="閱讀練習完成！"
          note={missed.size ? `有 ${missed.size} 題多試了幾次。` : "每一題都一次就答對了！"}
          onAgain={() => {
            setRound(buildReadingRound());
            setIndex(0);
            setMissed(new Set());
            setFinished(false);
          }}
          onLeave={leave}
        />
      ) : (
        <ReadingStepView
          key={index}
          step={round[index]}
          app={app}
          onMiss={() => setMissed((current) => new Set(current).add(index))}
          onDone={next}
        />
      )}
    </main>
  );
}

function ReadingStepView({
  step,
  app,
  onMiss,
  onDone,
}: {
  step: ReadingStep;
  app: ReadingApp;
  onMiss: () => void;
  onDone: () => void;
}) {
  const say = useSay(app);
  const prompt = step.kind === "order" ? orderPrompt : step.question;
  const ask = () => say([prompt]);
  const askOnce = useEffectEvent(ask);
  useEffect(() => {
    askOnce();
  }, []);
  const [feedback, setFeedback] = useState<{ kind: "correct" | "retry"; pick: number } | null>(
    null,
  );
  /** 排一排's scenes tapped in the right order so far. */
  const [placed, setPlaced] = useState<number[]>([]);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  const voice = (kind: "correct" | "retry") =>
    app.speak(mathPrompts[kind], { url: mathPromptUrl(kind), onError: () => {} });
  const answer = (pick: number, right: boolean, done: boolean) => {
    if (feedback) return;
    if (!right) {
      onMiss();
      setFeedback({ kind: "retry", pick });
      voice("retry");
      timer.current = window.setTimeout(() => setFeedback(null), retryDelay);
      return;
    }
    if (!done) return;
    setFeedback({ kind: "correct", pick });
    voice("correct");
    timer.current = window.setTimeout(onDone, correctDelay);
  };
  const state = (pick: number) =>
    feedback?.pick === pick ? (feedback.kind === "correct" ? " is-correct" : " is-wrong") : "";

  return (
    <section className={`hanzi-practice reading-question is-${step.kind}`}>
      <div className="hanzi-prompt reading-prompt">
        <button
          type="button"
          className="hanzi-say"
          onClick={ask}
          disabled={!clipOf(prompt)}
          aria-label="再聽一次"
        >
          <SpeakerHigh size={30} weight="fill" aria-hidden="true" />
        </button>
        <p className="reading-prompt-text">
          <Reading said={prompt} />
        </p>
      </div>
      <div className="stroke-stage reading-stage">
        {step.kind === "order" ? (
          <div className="reading-scenes">
            {step.scenes.map((scene) => {
              const at = placed.indexOf(scene);
              return (
                <button
                  key={scene}
                  type="button"
                  className={`reading-scene${at >= 0 ? " is-placed" : ""}${state(scene)}`}
                  aria-label={readingScenes[scene].text}
                  onClick={() => {
                    if (at >= 0) return;
                    // The next scene in the story is the earliest one not placed yet.
                    const expected = [...step.scenes]
                      .sort((a, b) => a - b)
                      .find((s) => !placed.includes(s));
                    const right = scene === expected;
                    if (right) setPlaced([...placed, scene]);
                    answer(scene, right, right && placed.length + 1 === step.scenes.length);
                  }}
                >
                  <Picture art={readingScenes[scene].art} said={readingScenes[scene]} />
                  {at >= 0 && <span className="reading-scene-number">{at + 1}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <Choices
            question={step.question}
            order={step.order}
            state={state}
            say={say}
            onPick={(i) => answer(i, i === 0, true)}
          />
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
    </section>
  );
}

/** A question's three answers: pictures, or sentences each with its own speaker. */
function Choices({
  question,
  order,
  state,
  say,
  onPick,
}: {
  question: ReadingQuestion;
  order: number[];
  state: (pick: number) => string;
  say: (parts: Said[]) => void;
  onPick: (choice: number) => void;
}) {
  if ("pictures" in question)
    return (
      <div className="reading-choices is-pictures">
        {order.map((i) => {
          const thing = question.pictures[i];
          return (
            <button
              key={thing}
              type="button"
              className={`reading-choice${state(i)}`}
              aria-label={readingThings[thing].text}
              onClick={() => onPick(i)}
            >
              <Picture art={thing} said={readingThings[thing]} />
            </button>
          );
        })}
      </div>
    );
  return (
    <div className="reading-choices is-sentences">
      {order.map((i) => {
        const sentence = question.sentences[i];
        return (
          <div key={sentence.text} className={`reading-sentence${state(i)}`}>
            <button
              type="button"
              className="reading-sentence-say"
              onClick={() => say([sentence])}
              disabled={!clipOf(sentence)}
              aria-label={`聽：${sentence.text}`}
            >
              <SpeakerHigh size={24} weight="fill" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="reading-sentence-pick"
              aria-label={sentence.text}
              onClick={() => onPick(i)}
            >
              <Reading said={sentence} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

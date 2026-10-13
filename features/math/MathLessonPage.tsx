import { useState } from "react";
import { ArrowRight, Play, PlayCircle } from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import { ProgressiveImage } from "../../components/ProgressiveImage";
import { mathLessons } from "./math-lessons";
import { MathWords as Words } from "./MathChrome";
import { readMathRound } from "./math-round";

/**
 * A math lesson's page, drawn like a 注音 lesson's: its number and title over the watercolor
 * picture, a card to start (or continue) the practice, and what the lesson practises.
 */
export function MathLessonPage({
  app,
}: {
  app: Pick<AppController, "mathLessonId" | "startMathPractice">;
}) {
  const lesson = mathLessons.find((item) => item.id === app.mathLessonId) ?? mathLessons[0];
  // Tapped lessons are not saved mid-round, so they always start afresh.
  const [saved] = useState(() => (lesson.practice === "tap" ? null : readMathRound(lesson.id)));
  return (
    <section className="page-section lesson-page math-lesson-page">
      <div className="lesson-heading">
        <div>
          <span className="eyebrow">
            <Words text="數學" />
            <Words text={lesson.number} />
          </span>
          <h1 className="lesson-title">
            <Words text={lesson.title} />
          </h1>
        </div>
        <ProgressiveImage
          className="lesson-heading-art"
          src={`course-art/${lesson.art}.webp`}
          alt=""
        />
      </div>
      <div className={`mode-grid${saved ? "" : " is-single"}`}>
        {saved && (
          <button
            className="mode-card fill-mode"
            type="button"
            aria-label="繼續上次的練習"
            onClick={() => app.startMathPractice("continue")}
          >
            <span className="mode-icon" aria-hidden="true">
              <PlayCircle size={28} weight="duotone" />
            </span>
            <span className="lesson-mode-copy">
              <small>
                <Words text="第" /> {saved.index + 1} <Words text="題" />
              </small>
              <strong>
                <Words text="繼續練習" />
              </strong>
            </span>
            <span className="lesson-mode-cta">
              <Words text="繼續" /> <ArrowRight size={19} weight="bold" aria-hidden="true" />
            </span>
          </button>
        )}
        <button
          className={`mode-card ${saved ? "listen-mode" : "fill-mode"}`}
          type="button"
          aria-label={saved ? "從頭開始練習" : "開始練習"}
          onClick={() => app.startMathPractice("new")}
        >
          <span className="mode-icon" aria-hidden="true">
            <Play size={28} weight="duotone" />
          </span>
          <span className="lesson-mode-copy">
            <small>
              {lesson.questions} <Words text="題" />
            </small>
            <strong>
              <Words text={saved ? "從頭開始" : "開始練習"} />
            </strong>
          </span>
          <span className="lesson-mode-cta">
            <Words text="開始" /> <ArrowRight size={19} weight="bold" aria-hidden="true" />
          </span>
        </button>
      </div>
      <div className="math-lesson-parts">
        <h2>
          <Words text="這一課" />
        </h2>
        <ul>
          {lesson.parts.map((part) => (
            <li key={part}>
              <Words text={part} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

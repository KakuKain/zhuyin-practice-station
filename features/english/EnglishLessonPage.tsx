import { useState } from "react";
import { ArrowRight, HandPointing, PencilLine, PlayCircle } from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import { ProgressiveImage } from "../../components/ProgressiveImage";
import { englishLessons } from "./english-lessons";
import { readWriteRound, roundLength } from "./english-round";
import {
  DialogueScene,
  EnglishWords as Words,
  LetterPair,
  WordLetters,
  WordPicture,
  useEnglishVoice,
} from "./EnglishChrome";
import "../../styles/lazy/english.css";

/**
 * An English lesson's page, drawn like a 注音 lesson's: its number and unit name over the
 * watercolor picture, the two practices (認一認 taps, 寫一寫 on four lines, which can be continued)
 * and the lesson's letters, key words and dialogues, each a tap away from being heard.
 */
export function EnglishLessonPage({
  app,
}: {
  app: Pick<AppController, "englishLessonId" | "startEnglishPractice" | "speak" | "stopPlayback">;
}) {
  const lesson =
    englishLessons.find((item) => item.id === app.englishLessonId) ?? englishLessons[0];
  const [saved] = useState(() => readWriteRound(lesson.id));
  const play = useEnglishVoice(app);
  const keyWords = lesson.letters.map(
    (letter) => lesson.words.find((word) => word.startsWith(letter)) ?? "",
  );
  return (
    <section className="page-section lesson-page math-lesson-page english-lesson-page">
      <div className="lesson-heading">
        <div>
          <span className="eyebrow">
            <Words text="英語" />
            <Words text={lesson.number} />
          </span>
          <h1 className="lesson-title english-lesson-title">{lesson.title}</h1>
        </div>
        <ProgressiveImage
          className="lesson-heading-art"
          src={`course-art/${lesson.art}.webp`}
          alt=""
        />
      </div>
      <div className="mode-grid english-modes">
        <button
          className="mode-card listen-mode"
          type="button"
          aria-label="認一認，點選練習"
          onClick={() => app.startEnglishPractice("tap")}
        >
          <span className="mode-icon" aria-hidden="true">
            <HandPointing size={28} weight="duotone" />
          </span>
          <span className="lesson-mode-copy">
            <small>
              {roundLength(lesson.id, "tap")} <Words text="題" />
            </small>
            <strong>
              <Words text="認一認" />
            </strong>
          </span>
          <span className="lesson-mode-cta">
            <Words text="開始" /> <ArrowRight size={19} weight="bold" aria-hidden="true" />
          </span>
        </button>
        {saved && (
          <button
            className="mode-card fill-mode"
            type="button"
            aria-label="繼續寫一寫"
            onClick={() => app.startEnglishPractice("write", "continue")}
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
          className="mode-card fill-mode"
          type="button"
          aria-label={saved ? "寫一寫，從頭開始" : "寫一寫，手寫練習"}
          onClick={() => app.startEnglishPractice("write")}
        >
          <span className="mode-icon" aria-hidden="true">
            <PencilLine size={28} weight="duotone" />
          </span>
          <span className="lesson-mode-copy">
            <small>
              {roundLength(lesson.id, "write")} <Words text="題" />
            </small>
            <strong>
              <Words text="寫一寫" />
            </strong>
          </span>
          <span className="lesson-mode-cta">
            <Words text={saved ? "從頭開始" : "開始"} />{" "}
            <ArrowRight size={19} weight="bold" aria-hidden="true" />
          </span>
        </button>
      </div>
      <div className="math-lesson-parts english-lesson-parts">
        <h2>
          <Words text="這一課" />
        </h2>
        <ul className="english-letter-cards">
          {lesson.letters.map((letter, index) => (
            <li key={letter}>
              <button
                type="button"
                className="english-letter-card"
                aria-label={`聽 ${letter.toUpperCase()}，${keyWords[index]}`}
                onClick={() => play([`letter-${letter}`, `word-${keyWords[index]}`], 600)}
              >
                <LetterPair letter={letter} />
                <WordPicture word={keyWords[index]} />
                <WordLetters word={keyWords[index]} />
              </button>
            </li>
          ))}
        </ul>
        <h2>
          <Words text="對話" />
        </h2>
        <ul className="english-dialogue-cards">
          {lesson.dialogues.map((id) => (
            <li key={id}>
              <button
                type="button"
                className="english-dialogue-card"
                aria-label="聽這段對話"
                onClick={() => play([`dialogue-${id}`])}
              >
                <DialogueScene id={id} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

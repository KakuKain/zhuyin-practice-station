import { ArrowRight, Eye, PencilLine, PencilSimple } from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import { book1Facts, book1Lessons } from "./book1-characters";
import { HanziGlyph, HanziWords } from "./HanziChrome";
import { roundSize, type StrokeLevel } from "./hanzi-round";
import "../../styles/lazy/hanzi.css";

const levels: { level: StrokeLevel; name: string; icon: typeof Eye; aria: string }[] = [
  {
    level: "trace",
    name: "描一描",
    icon: PencilSimple,
    aria: "描一描，照著淡淡的字和起筆的號碼寫",
  },
  { level: "faint", name: "看著寫", icon: Eye, aria: "看著寫，字更淡，沒有號碼" },
  { level: "blank", name: "自己寫", icon: PencilLine, aria: "自己寫，空白的格子" },
];

/**
 * A 第一冊 lesson's page: its number and title, the three ways to practise 筆順 (each a round of
 * the lesson's 生字), and every 生字 of the lesson, each a tap away from being practised alone.
 */
export function HanziLessonPage({
  app,
}: {
  app: Pick<AppController, "hanziLessonId" | "startHanziPractice">;
}) {
  const lesson = book1Lessons.find((item) => item.id === app.hanziLessonId) ?? book1Lessons[1];
  const count = Math.min(roundSize, lesson.characters.length);
  return (
    <section className="page-section lesson-page math-lesson-page hanzi-lesson-page">
      <div className="lesson-heading">
        <div>
          <span className="eyebrow">
            <HanziWords text="第一冊" />
            <HanziWords text={lesson.number} />
          </span>
          <h1 className="lesson-title">
            <HanziWords text={lesson.title} />
          </h1>
        </div>
      </div>
      <div className="mode-grid hanzi-modes">
        {levels.map(({ level, name, icon: Icon, aria }) => (
          <button
            key={level}
            className={`mode-card ${level === "trace" ? "listen-mode" : "fill-mode"}`}
            type="button"
            aria-label={`${aria}，${count} 個字`}
            onClick={() => app.startHanziPractice(level)}
          >
            <span className="mode-icon" aria-hidden="true">
              <Icon size={28} weight="duotone" />
            </span>
            <span className="lesson-mode-copy">
              <small>
                {count} <HanziWords text="個字" />
              </small>
              <strong>
                <HanziWords text={name} />
              </strong>
            </span>
            <span className="lesson-mode-cta">
              <HanziWords text="開始" /> <ArrowRight size={19} weight="bold" aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
      <div className="math-lesson-parts hanzi-lesson-parts">
        <h2>
          <HanziWords text="這一課的生字" />
        </h2>
        <p className="hanzi-parts-note">
          <HanziWords text="點一個字寫寫看" />
        </p>
        <ul className="hanzi-character-cards">
          {[...lesson.characters].map((character) => (
            <li key={character}>
              <button
                type="button"
                className="hanzi-character-card"
                aria-label={`描一描「${character}」，${book1Facts[character]?.strokes} 畫`}
                onClick={() => app.startHanziPractice("trace", character)}
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
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

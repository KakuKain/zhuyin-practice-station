import { useState } from "react";
import { ArrowRight, CheckCircle, Ear, PencilSimple, TextAa } from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import { book1Facts, book1Lessons } from "./book1-characters";
import { HanziGlyph, HanziWords } from "./HanziChrome";
import { readHanziRecords } from "./hanzi-round";
import "../../styles/lazy/hanzi.css";

/**
 * A 第一冊 lesson's page: its number and title, its three practices (練習, 聽寫 and 照樣造句,
 * which is being made) and every 生字, each a tap away from 練習 on that 生字. A check
 * marks the 生字 written to the end before.
 */
export function HanziLessonPage({
  app,
}: {
  app: Pick<AppController, "hanziLessonId" | "startHanziPractice" | "startHanziDictation">;
}) {
  const lesson = book1Lessons.find((item) => item.id === app.hanziLessonId) ?? book1Lessons[1];
  const [records] = useState(readHanziRecords);
  const practised = (character: string) => (records.characters[character]?.practised ?? 0) > 0;
  const characters = [...lesson.characters];
  return (
    <section className="page-section lesson-page math-lesson-page hanzi-lesson-page">
      <div className="lesson-heading">
        <div>
          <span className="eyebrow">
            <HanziWords text={lesson.number} />
          </span>
          <h1 className="lesson-title">
            <HanziWords text={lesson.title} />
          </h1>
        </div>
      </div>
      <div className="mode-grid hanzi-modes">
        <button
          className="mode-card listen-mode"
          type="button"
          aria-label={`練習，${characters.length} 個生字`}
          onClick={() => app.startHanziPractice()}
        >
          <span className="mode-icon" aria-hidden="true">
            <PencilSimple size={28} weight="duotone" />
          </span>
          <span className="lesson-mode-copy">
            <small>
              {characters.length} <HanziWords text="個生字" />
            </small>
            <strong>
              <HanziWords text="練習" />
            </strong>
          </span>
          <span className="lesson-mode-cta">
            <HanziWords text="開始" /> <ArrowRight size={19} weight="bold" aria-hidden="true" />
          </span>
        </button>
        <button
          className="mode-card fill-mode"
          type="button"
          aria-label="聽寫，只聽聲音寫國字注音"
          onClick={() => app.startHanziDictation()}
        >
          <span className="mode-icon" aria-hidden="true">
            <Ear size={28} weight="duotone" />
          </span>
          <span className="lesson-mode-copy">
            <small>
              <HanziWords text="只考生字" />・<HanziWords text="全部語詞" />
            </small>
            <strong>
              <HanziWords text="聽寫" />
            </strong>
          </span>
          <span className="lesson-mode-cta">
            <HanziWords text="開始" /> <ArrowRight size={19} weight="bold" aria-hidden="true" />
          </span>
        </button>
        <button
          className="mode-card fill-mode is-coming"
          type="button"
          disabled
          aria-label="照樣造句，製作中"
        >
          <span className="mode-icon" aria-hidden="true">
            <TextAa size={28} weight="duotone" />
          </span>
          <span className="lesson-mode-copy">
            <small>
              <HanziWords text="製作中" />
            </small>
            <strong>
              <HanziWords text="照樣造句" />
            </strong>
          </span>
        </button>
      </div>
      <div className="math-lesson-parts hanzi-lesson-parts">
        <h2>
          <HanziWords text="這一課的生字" />
        </h2>
        <p className="hanzi-parts-note">
          <HanziWords text="點一個字寫寫看" />
        </p>
        <ul className="hanzi-character-cards">
          {characters.map((character) => (
            <li key={character}>
              <button
                type="button"
                className="hanzi-character-card"
                aria-label={`練習「${character}」，${book1Facts[character]?.strokes} 畫${practised(character) ? "，練過了" : ""}`}
                onClick={() => app.startHanziPractice(character)}
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
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

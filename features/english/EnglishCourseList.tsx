import { ArrowRight } from "@phosphor-icons/react";
import { ProgressiveImage } from "../../components/ProgressiveImage";
import { cardThumb } from "../../components/card-thumbs";
import { englishCourse } from "./english-lessons";
import { EnglishWords as Words, LetterPair } from "./EnglishChrome";
import "../../styles/lazy/english.css";

/**
 * 英語 lessons, drawn like the 注音 and 數學 journeys: the lesson's number in 國字注音, the unit's
 * English name and its letters (Aa Bb Cc) beside a picture. Units not made yet are 製作中.
 */
export function EnglishCourseList({ onOpen }: { onOpen: (id: number) => void }) {
  return (
    <div className="math-terms">
      <section className="math-term" aria-labelledby="english-term">
        <h2 className="math-term-title" id="english-term">
          <Words text="上學期" />
        </h2>
        <div className="journey-list math-journey english-journey">
          {englishCourse.map((lesson, index) => (
            <div className={`journey-step journey-step-${index % 3}`} key={lesson.id}>
              <span className="journey-station" aria-hidden="true">
                {index === 0 && (
                  <ProgressiveImage
                    className="journey-flag-scene"
                    src="course-art/course-flag-grass-v1.webp"
                    alt=""
                  />
                )}
                {/* A unit's number; reviews are 複, as on the 注音 list. */}
                {lesson.number.startsWith("第")
                  ? englishCourse.slice(0, index + 1).filter((item) => item.number.startsWith("第"))
                      .length
                  : "複"}
              </span>
              <button
                className={`journey-card${lesson.ready ? "" : " is-coming"}`}
                type="button"
                disabled={!lesson.ready}
                onClick={() => onOpen(lesson.id)}
                aria-label={`英語${lesson.number}，${lesson.title}${lesson.ready ? "" : "，製作中"}`}
              >
                <span className="journey-card-copy">
                  <small>
                    <Words text={lesson.number} />
                  </small>
                  <strong className="english-card-title">{lesson.title}</strong>
                  <span className="english-card-letters" aria-hidden="true">
                    {lesson.letters.slice(0, 4).map((letter) => (
                      <LetterPair key={letter} letter={letter} />
                    ))}
                    {lesson.letters.length > 4 && <span className="english-card-more">…</span>}
                  </span>
                  {!lesson.ready && <em>製作中</em>}
                </span>
                {lesson.ready && (
                  <ProgressiveImage
                    className="journey-art"
                    src={`course-art/${lesson.art}.webp`}
                    thumb={cardThumb(`course-art/${lesson.art}.webp`)}
                    alt=""
                    aria-hidden="true"
                  />
                )}
                {lesson.ready && (
                  <span className="journey-arrow" aria-hidden="true">
                    <ArrowRight size={23} weight="bold" />
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

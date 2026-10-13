import { ArrowRight } from "@phosphor-icons/react";
import { ProgressiveImage } from "../../components/ProgressiveImage";
import { mathCourse, mathTerms } from "./math-lessons";
import { MathWords as Words } from "./MathChrome";

/**
 * 數學 lessons, drawn like the 注音 journey: number and title in 國字注音 beside a picture,
 * 上學期 then 下學期. Lessons not made yet are listed as 製作中, as the textbook lists them.
 */
export function MathCourseList({ onOpen }: { onOpen: (id: number) => void }) {
  return (
    <div className="math-terms">
      {mathTerms.map(({ term, name }, termIndex) => (
        <section className="math-term" key={term} aria-labelledby={`math-term-${term}`}>
          <h2 className="math-term-title" id={`math-term-${term}`}>
            <Words text={name} />
          </h2>
          <div className="journey-list math-journey">
            {mathCourse
              .filter((lesson) => lesson.term === term)
              .map((lesson, index) => (
                <div className={`journey-step journey-step-${index % 3}`} key={lesson.id}>
                  <span className="journey-station" aria-hidden="true">
                    {termIndex === 0 && index === 0 && (
                      <ProgressiveImage
                        className="journey-flag-scene"
                        src="course-art/course-flag-grass-v1.webp"
                        alt=""
                      />
                    )}
                    {/* Its place in the textbook, which is not always its id. */}
                    {index + 1}
                  </span>
                  <button
                    className={`journey-card${lesson.ready ? "" : " is-coming"}`}
                    type="button"
                    disabled={!lesson.ready}
                    onClick={() => onOpen(lesson.id)}
                    aria-label={`數學${term === "上" ? "" : name}${lesson.number}，${lesson.title}${lesson.ready ? "" : "，製作中"}`}
                  >
                    <span className="journey-card-copy">
                      <small>
                        <Words text={lesson.number} />
                      </small>
                      <strong>
                        <Words text={lesson.title} />
                      </strong>
                      {!lesson.ready && <em>製作中</em>}
                    </span>
                    {lesson.ready && (
                      <ProgressiveImage
                        className="journey-art"
                        src={`course-art/${lesson.art}.webp`}
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
      ))}
    </div>
  );
}

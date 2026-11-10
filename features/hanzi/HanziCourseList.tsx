import { ArrowRight } from "@phosphor-icons/react";
import { ProgressiveImage } from "../../components/ProgressiveImage";
import { book1Lessons } from "./book1-characters";
import { HanziWords } from "./HanziChrome";
import "../../styles/lazy/hanzi.css";

/**
 * 第一冊's lessons, drawn like the 注音 journey: the lesson's number and title in 國字注音 and
 * its watercolor (about 400 px, cut from one sheet, so small enough to need no thumbnail).
 */
export function HanziCourseList({ onOpen }: { onOpen: (id: number) => void }) {
  return (
    <div className="journey-list hanzi-journey">
      {book1Lessons.map((lesson, index) => (
        <div className={`journey-step journey-step-${index % 3}`} key={lesson.id}>
          <span className="journey-station" aria-hidden="true">
            {index === 0 && (
              <ProgressiveImage
                className="journey-flag-scene"
                src="course-art/course-flag-grass-v1.webp"
                alt=""
              />
            )}
            {lesson.id === 0 ? "字" : lesson.id}
          </span>
          <button
            className="journey-card"
            type="button"
            onClick={() => onOpen(lesson.id)}
            aria-label={`${lesson.id === 0 ? "" : `${lesson.number}，`}${lesson.title}，${lesson.characters.length} 個生字`}
          >
            <span className="journey-card-copy">
              <small>
                <HanziWords text={lesson.number} />
              </small>
              <strong>
                <HanziWords text={lesson.title} />
              </strong>
            </span>
            <ProgressiveImage
              className="journey-art"
              src={`course-art/${lesson.art}.webp`}
              alt=""
              aria-hidden="true"
            />
            <span className="journey-arrow" aria-hidden="true">
              <ArrowRight size={23} weight="bold" />
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}

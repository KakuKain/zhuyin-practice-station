import { ArrowRight } from "@phosphor-icons/react";
import { mathLessons } from "./math-lessons";

/** 數學 lessons, drawn like the 注音 journey so both subjects feel the same. */
export function MathCourseList({ onOpen }: { onOpen: (id: number) => void }) {
  return (
    <div className="journey-list math-journey">
      {mathLessons.map((lesson, index) => (
        <div className={`journey-step journey-step-${index % 3}`} key={lesson.id}>
          <span className="journey-station" aria-hidden="true">
            {lesson.id}
          </span>
          <button
            className={`journey-card${lesson.ready ? "" : " is-coming"}`}
            type="button"
            disabled={!lesson.ready}
            onClick={() => onOpen(lesson.id)}
            aria-label={`數學${lesson.number}，${lesson.title}${lesson.ready ? "" : "，製作中"}`}
          >
            <span className="journey-card-copy">
              <small>{lesson.number}</small>
              <strong>{lesson.title}</strong>
              {!lesson.ready && <em>製作中</em>}
            </span>
            <span className="journey-arrow" aria-hidden="true">
              <ArrowRight size={23} weight="bold" />
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}

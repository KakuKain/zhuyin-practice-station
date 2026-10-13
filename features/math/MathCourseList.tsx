import { ArrowRight } from "@phosphor-icons/react";
import { AnnotatedText } from "../../components/AnnotatedText";
import { ProgressiveImage } from "../../components/ProgressiveImage";
import { mathLessons, mathWord } from "./math-lessons";

function Words({ text }: { text: string }) {
  const word = mathWord(text);
  return <AnnotatedText text={word.text} variants={word.variants} />;
}

/** 數學 lessons, drawn like the 注音 journey: number and title in 國字注音 beside a picture. */
export function MathCourseList({ onOpen }: { onOpen: (id: number) => void }) {
  return (
    <div className="journey-list math-journey">
      {mathLessons.map((lesson, index) => (
        <div className={`journey-step journey-step-${index % 3}`} key={lesson.id}>
          <span className="journey-station" aria-hidden="true">
            {index === 0 && (
              <ProgressiveImage
                className="journey-flag-scene"
                src="course-art/course-flag-grass-v1.webp"
                alt=""
              />
            )}
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
              <small>
                <Words text={lesson.number} />
              </small>
              <strong>
                <Words text={lesson.title} />
              </strong>
              {!lesson.ready && <em>製作中</em>}
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

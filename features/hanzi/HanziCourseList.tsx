import { ArrowRight } from "@phosphor-icons/react";
import { ProgressiveImage } from "../../components/ProgressiveImage";
import { book1Lessons } from "./book1-characters";
import { strokesLessonId } from "./basic-strokes";
import { paintedReading, readingLessonId } from "./reading-lesson";
import { HanziWords } from "./HanziChrome";
import "../../styles/lazy/hanzi.css";

/**
 * 第一冊's lessons after 認識國字基本筆畫 (the book's first pages), drawn like the 注音 journey: the lesson's number and title in 國字注音 and
 * its watercolor (about 400 px, cut from one sheet, so small enough to need no thumbnail).
 */
export function HanziCourseList({ onOpen }: { onOpen: (id: number) => void }) {
  return (
    <div className="journey-list hanzi-journey">
      <div className="journey-step journey-step-0">
        <span className="journey-station" aria-hidden="true">
          <ProgressiveImage
            className="journey-flag-scene"
            src="course-art/course-flag-grass-v1.webp"
            alt=""
          />
          筆
        </span>
        <button
          className="journey-card"
          type="button"
          onClick={() => onOpen(strokesLessonId)}
          aria-label="認識國字基本筆畫，28 種筆畫"
        >
          <span className="journey-card-copy">
            <small>
              <HanziWords text="先學筆畫" />
            </small>
            <strong>
              <HanziWords text="認識國字基本筆畫" />
            </strong>
          </span>
          <ProgressiveImage
            className="journey-art"
            src="course-art/book1-strokes.webp"
            alt=""
            aria-hidden="true"
          />
          <span className="journey-arrow" aria-hidden="true">
            <ArrowRight size={23} weight="bold" />
          </span>
        </button>
      </div>
      {book1Lessons.map((lesson, index) => (
        <div className={`journey-step journey-step-${(index + 1) % 3}`} key={lesson.id}>
          <span className="journey-station" aria-hidden="true">
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
      <div className="journey-step journey-step-2">
        <span className="journey-station" aria-hidden="true">
          讀
        </span>
        <button
          className="journey-card"
          type="button"
          onClick={() => onOpen(readingLessonId)}
          aria-label="閱讀階梯，擁抱"
        >
          <span className="journey-card-copy">
            <small>
              <HanziWords text="閱讀階梯" />
            </small>
            <strong>
              <HanziWords text="擁抱" />
            </strong>
          </span>
          <ProgressiveImage
            className="journey-art"
            src={`course-art/${paintedReading.includes("hug") ? "reading/hug" : "book1-cover"}.webp`}
            alt=""
            aria-hidden="true"
          />
          <span className="journey-arrow" aria-hidden="true">
            <ArrowRight size={23} weight="bold" />
          </span>
        </button>
      </div>
    </div>
  );
}

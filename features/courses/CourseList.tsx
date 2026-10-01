"use client";

import type { AppController } from "../usePracticeApp";
import { courseArtwork, lessonNumerals, lessons } from "./course-data";
import { ArrowRight } from "@phosphor-icons/react";
import { AnnotatedText } from "../../components/AnnotatedText";
import { lessonTitleVariants } from "../lesson/annotated-text";

export function CourseList({ app }: { app: Pick<AppController, "openLesson" | "practiceState"> }) {
  const { openLesson, practiceState } = app;
  return (
    <section className="page-section course-journey">
      <div className="journey-heading">
        <div className="journey-heading-copy">
          <h1>選擇課程</h1>
          <p>跟著注音，一步一步探索吧！</p>
        </div>
        <img src="/course-art/course-journey-hero-v2.webp" alt="" aria-hidden="true" />
      </div>
      <div className="journey-list">
        {lessons.map((item, index) => {
          const isRecent = practiceState.recentLesson === index;
          return (
            <div
              className={`journey-step journey-step-${index % 3}`}
              key={item.title}
              id={`course-lesson-${index + 1}`}
            >
              <span className="journey-station" aria-hidden="true">
                {index === 0 && (
                  <img
                    className="journey-flag-scene"
                    src="/course-art/course-flag-grass-v1.webp"
                    alt=""
                  />
                )}
                {index + 1}
              </span>
              <button
                className="journey-card"
                type="button"
                onClick={() => openLesson(index)}
                aria-label={`第${lessonNumerals[index]}課，${item.title}${isRecent ? "，上次練習" : ""}`}
              >
                <span className="journey-card-copy">
                  <small>
                    <AnnotatedText text={`第${lessonNumerals[index]}課`} />
                  </small>
                  <strong>
                    <AnnotatedText text={item.title} variants={lessonTitleVariants[index]} />
                  </strong>
                  {isRecent && <em>上次練習</em>}
                </span>
                <img
                  className="journey-art"
                  src={`/course-art/${courseArtwork[index]}-watercolor.webp`}
                  alt=""
                  aria-hidden="true"
                  loading={index > 3 ? "lazy" : "eager"}
                />
                <span className="journey-arrow" aria-hidden="true">
                  <ArrowRight size={23} weight="bold" />
                </span>
              </button>
            </div>
          );
        })}
      </div>
      <div className="journey-footer" aria-hidden="true">
        <img src="/course-art/course-journey-footer-sign-v2.webp" alt="" />
      </div>
    </section>
  );
}

"use client";

import { PageHeading } from "../../components/PageHeading";
import type { AppController } from "../usePracticeApp";
import { builtinMaterialId } from "./materials";
import { ArrowRight } from "@phosphor-icons/react";
import { AnnotatedText } from "../../components/AnnotatedText";
import { lessonTitleGroups, lessonTitleVariants } from "../lesson/annotated-text";

export function CourseList({
  app,
}: {
  app: Pick<
    AppController,
    "openLesson" | "practiceState" | "catalog" | "materialsState" | "setMorePanel" | "setView"
  >;
}) {
  const { openLesson, practiceState } = app;
  const material = app.materialsState.materials.find(
    (item) => item.id === app.materialsState.activeId,
  );
  const lessons =
    app.materialsState.activeId === builtinMaterialId
      ? app.catalog.filter((item) => !item.custom)
      : app.catalog.filter(
          (item) =>
            !item.archived && material?.lessons.some((lesson) => lesson.index === item.index),
        );
  return (
    <section className="page-section course-journey">
      <PageHeading
        title="選擇課程"
        description="跟著注音，一步一步探索吧！"
        artwork="/course-art/course-journey-hero-v2.webp"
      />
      {lessons.length === 0 && (
        <p className="material-note">
          這組教材目前沒有顯示中的課次。請到「更多 → 教材與題庫」加入字詞，或復原封存課次。
        </p>
      )}
      <div className="journey-list">
        {lessons.map((item, index) => {
          const isRecent = practiceState.recentLesson === item.index;
          return (
            <div
              className={`journey-step journey-step-${index % 3}${item.listeningOnly ? " is-review-step" : ""}`}
              key={item.index}
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
                {item.listeningOnly ? "複" : item.custom ? index + 1 : item.index + 1}
              </span>
              <button
                className={`journey-card${item.custom ? " is-custom-material" : ""}`}
                type="button"
                onClick={() => openLesson(item.index)}
                aria-label={`${item.listeningOnly ? `${item.title}，${item.reviewRange}聽寫` : `第${item.number}課，${item.title}`}${isRecent ? "，最近開啟" : ""}`}
              >
                <span className="journey-card-copy">
                  <small>
                    <AnnotatedText
                      text={item.listeningOnly ? `${item.reviewRange}聽寫` : `第${item.number}課`}
                    />
                  </small>
                  <strong>
                    <AnnotatedText
                      text={item.title}
                      variants={lessonTitleVariants[item.index]}
                      groups={lessonTitleGroups[item.index]}
                    />
                  </strong>
                  {isRecent && <em>最近開啟</em>}
                </span>
                {item.artwork && (
                  <img
                    className="journey-art"
                    src={`/course-art/${item.artwork}-watercolor.webp`}
                    alt=""
                    aria-hidden="true"
                    loading={index > 3 ? "lazy" : "eager"}
                  />
                )}
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

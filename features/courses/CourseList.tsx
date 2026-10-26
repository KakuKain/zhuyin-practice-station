import { lazy, Suspense } from "react";
import { ProgressiveImage } from "../../components/ProgressiveImage";
import { cardThumb } from "../../components/card-thumbs";
import { Loading } from "../../components/Loading";
import { useChildProfiles } from "../../lib/storage/child-profiles";
import { ChildGreeting, childLabel } from "../../components/ChildPicker";
import { RewardDock } from "../rewards/RewardDock";
import { taskDestination } from "../rewards/daily-tasks";

import { PageHeading } from "../../components/PageHeading";
import type { AppController } from "../usePracticeApp";
import { builtinMaterialId } from "./materials";
import { ArrowRight } from "@phosphor-icons/react";
import { AnnotatedText } from "../../components/AnnotatedText";
import { lessonTitleGroups, lessonTitleVariants } from "../lesson/annotated-text";

// 數學's list loads when a child picks 數學 (and in the background once the course list is up).
const MathCourseList = lazy(() =>
  import("../math/MathCourseList").then((m) => ({ default: m.MathCourseList })),
);
const EnglishCourseList = lazy(() =>
  import("../english/EnglishCourseList").then((m) => ({ default: m.EnglishCourseList })),
);

export function CourseList({
  app,
}: {
  app: Pick<
    AppController,
    | "openLesson"
    | "openMathLesson"
    | "openEnglishLesson"
    | "practiceState"
    | "catalog"
    | "materialsState"
    | "setMorePanel"
    | "setView"
    | "rewardSettings"
    | "stampBook"
    | "stampProgress"
    | "chooseReward"
    | "dismissStampNews"
    | "navigate"
    | "subject"
    | "setSubject"
  >;
}) {
  const { openLesson, practiceState } = app;
  const profiles = useChildProfiles();
  const child = profiles.children.find((item) => item.id === profiles.activeId);
  const { subject, setSubject } = app;
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
        description={
          subject === "math"
            ? "數一數、比一比，一起玩數學！"
            : subject === "english"
              ? "聽一聽、寫一寫，認識英文字母！"
              : "跟著注音，一步一步探索吧！"
        }
        artwork="course-art/course-journey-hero-v2.webp"
      />
      <ChildGreeting />
      <div className="subject-switch" role="group" aria-label="科目">
        {(
          [
            ["zhuyin", "國語"],
            ["math", "數學"],
            ["english", "英語"],
          ] as const
        ).map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={subject === value}
            onClick={() => setSubject(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {subject === "math" ? (
        <Suspense fallback={<Loading label="正在準備課程…" />}>
          <MathCourseList onOpen={app.openMathLesson} />
        </Suspense>
      ) : subject === "english" ? (
        <Suspense fallback={<Loading label="正在準備課程…" />}>
          <EnglishCourseList onOpen={app.openEnglishLesson} />
        </Suspense>
      ) : (
        <>
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
                      <ProgressiveImage
                        className="journey-flag-scene"
                        src="course-art/course-flag-grass-v1.webp"
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
                          text={
                            item.listeningOnly ? `${item.reviewRange}聽寫` : `第${item.number}課`
                          }
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
                      <ProgressiveImage
                        className="journey-art"
                        src={`course-art/${item.artwork}-watercolor.webp`}
                        thumb={cardThumb(`course-art/${item.artwork}-watercolor.webp`)}
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
        </>
      )}
      <div className="journey-footer" aria-hidden="true">
        <ProgressiveImage src="course-art/course-journey-footer-sign-v2.webp" alt="" />
      </div>
      {app.rewardSettings.enabled && (
        <RewardDock
          name={child && profiles.children.length > 1 ? childLabel(child, profiles) : undefined}
          progress={app.stampProgress}
          book={app.stampBook}
          settings={app.rewardSettings}
          onChoose={app.chooseReward}
          onOpenCard={app.dismissStampNews}
          onGo={(task) => {
            const destination = taskDestination(task.key);
            if (destination.kind === "lesson") openLesson(destination.lessonIndex);
            else if (destination.kind === "math") app.openMathLesson(destination.lessonId);
            else if (destination.kind === "english") app.openEnglishLesson(destination.lessonId);
            // 辨音 and 待補強 are both on the 練習 page.
            else app.navigate("practice");
          }}
        />
      )}
    </section>
  );
}

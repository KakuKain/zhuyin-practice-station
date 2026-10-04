"use client";
import { AnnotatedText } from "./AnnotatedText";
import { useCatalogLesson } from "../features/courses/MaterialContext";
import { lessonTitleGroups, lessonTitleVariants } from "../features/lesson/annotated-text";

/** One pronunciation source for every view of the same lesson. */
export function LessonName({ lessonIndex }: { lessonIndex: number }) {
  const lesson = useCatalogLesson(lessonIndex);
  return (
    <AnnotatedText
      text={lesson.title}
      variants={lessonTitleVariants[lessonIndex]}
      groups={lessonTitleGroups[lessonIndex]}
    />
  );
}

export function LessonLabel({
  lessonIndex,
  hideTitle = false,
}: {
  lessonIndex: number;
  hideTitle?: boolean;
}) {
  const lesson = useCatalogLesson(lessonIndex);
  return (
    <span className="lesson-label">
      <AnnotatedText text={lesson.listeningOnly ? lesson.title : `第${lesson.number}課`} />
      {!hideTitle && !lesson.listeningOnly && (
        <>
          <span aria-hidden="true"> · </span>
          <LessonName lessonIndex={lessonIndex} />
        </>
      )}
    </span>
  );
}

export function LessonTitle({ lessonIndex }: { lessonIndex: number }) {
  return (
    <h1 className="lesson-title">
      <LessonName lessonIndex={lessonIndex} />
    </h1>
  );
}

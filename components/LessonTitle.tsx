import { AnnotatedText } from "./AnnotatedText";
import { lessons, lessonNumerals } from "../features/courses/course-data";
import { lessonTitleGroups, lessonTitleVariants } from "../features/lesson/annotated-text";

/** One pronunciation source for every view of the same lesson. */
export function LessonName({ lessonIndex }: { lessonIndex: number }) {
  return (
    <AnnotatedText
      text={lessons[lessonIndex].title}
      variants={lessonTitleVariants[lessonIndex]}
      groups={lessonTitleGroups[lessonIndex]}
    />
  );
}

export function LessonLabel({ lessonIndex }: { lessonIndex: number }) {
  return (
    <span className="lesson-label">
      <AnnotatedText text={`第${lessonNumerals[lessonIndex]}課`} />
      <span aria-hidden="true"> · </span>
      <LessonName lessonIndex={lessonIndex} />
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

import { ArrowRight, CheckCircle, X } from "@phosphor-icons/react";
import { AnnotatedText } from "../../components/AnnotatedText";
import { mathLessons } from "../math/math-lessons";
import { englishLessons } from "../english/english-lessons";
import { taskKeys, type DailyTask } from "./stamp-book";

export const taskName = (task: DailyTask) =>
  task.place ? `${task.place} ${task.activity}` : task.activity;

/** The watercolor picture and wash of a task's card, by the practice that finishes it. */
function taskLook(task: DailyTask): { art: string; tone: string } {
  if (task.key.endsWith(":fill")) return { art: "blue-watercolor-pencil-v2", tone: "sky" };
  if (task.key.endsWith(":listening")) return { art: "sound-headphone-cat", tone: "leaf" };
  if (task.key === taskKeys.sound) return { art: "sound-complete-cat", tone: "sun" };
  if (task.key === taskKeys.fix) return { art: "teacher-watercolor", tone: "rose" };
  const english = englishLessons.find(
    (lesson) =>
      task.key === taskKeys.english(lesson.id, "tap") ||
      task.key === taskKeys.english(lesson.id, "write"),
  );
  if (english) return { art: english.art, tone: "sky" };
  const math = mathLessons.find((lesson) => task.key === taskKeys.math(lesson.id));
  return { art: math?.art ?? "course-flag-grass-v1", tone: "peach" };
}

const Words = ({ task, text }: { task: DailyTask; text: string }) =>
  task.annotate ? <AnnotatedText text={text} /> : <>{text}</>;

/** What the parent asked for today, in 國字注音, each a tap away; opened from the course list. */
export function TasksDialog({
  tasks,
  onGo,
  onClose,
}: {
  tasks: DailyTask[];
  onGo: (task: DailyTask) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fill-dialog-backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="stamp-dialog today-tasks"
        role="dialog"
        aria-modal="true"
        aria-labelledby="today-tasks-title"
      >
        <header>
          <img className="stamp-sheet-art" src="course-art/course-flag-grass-v1.webp" alt="" />
          <div>
            <h2 id="today-tasks-title">
              <AnnotatedText text="今天的任務" />
            </h2>
            <p>
              <AnnotatedText text="完成任務，就能拿到任務章！" />
            </p>
          </div>
          <button type="button" className="stamp-close" onClick={onClose} aria-label="關閉">
            <X size={22} weight="bold" aria-hidden="true" />
          </button>
        </header>
        <ul>
          {tasks.map((task) => {
            const look = taskLook(task);
            return (
              <li key={task.id} className={`is-${look.tone}${task.doneAt ? " is-done" : ""}`}>
                <img className="today-task-art" src={`course-art/${look.art}.webp`} alt="" />
                <span className="today-task-name">
                  {task.place && (
                    <span className="today-task-place">
                      <Words task={task} text={task.place} />
                    </span>
                  )}
                  <strong>
                    <Words task={task} text={task.activity} />
                  </strong>
                </span>
                {task.doneAt ? (
                  <span className="today-task-done">
                    <CheckCircle size={26} weight="fill" aria-hidden="true" />
                    <AnnotatedText text="完成了" />
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onGo(task)}
                    aria-label={`去做：${taskName(task)}`}
                  >
                    <ArrowRight size={32} weight="bold" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

import { ArrowRight, CheckCircle, X } from "@phosphor-icons/react";
import { AnnotatedText } from "../../components/AnnotatedText";
import type { DailyTask } from "./stamp-book";

export const taskName = (task: DailyTask) =>
  task.place ? `${task.place} ${task.activity}` : task.activity;

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
          <h2 id="today-tasks-title">
            <img src="course-art/course-flag-grass-v1.webp" alt="" />
            <AnnotatedText text="今天的任務" />
          </h2>
          <button type="button" className="stamp-close" onClick={onClose} aria-label="關閉">
            <X size={22} weight="bold" aria-hidden="true" />
          </button>
        </header>
        <ul>
          {tasks.map((task) => (
            <li key={task.id} className={task.doneAt ? "is-done" : undefined}>
              <span className="today-task-name">
                {task.annotate ? <AnnotatedText text={taskName(task)} /> : taskName(task)}
              </span>
              {task.doneAt ? (
                <span className="today-task-done">
                  <CheckCircle size={22} weight="fill" aria-hidden="true" />
                  <AnnotatedText text="完成了" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onGo(task)}
                  aria-label={`去做：${taskName(task)}`}
                >
                  <AnnotatedText text="去做" />
                  <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

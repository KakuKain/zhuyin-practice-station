import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { AnnotatedText } from "../../components/AnnotatedText";
import type { DailyTask } from "./stamp-book";

export const taskName = (task: DailyTask) =>
  task.place ? `${task.place} ${task.activity}` : task.activity;

/** On the course list: what the parent asked for today, in 國字注音, each a tap away. */
export function TodayTasks({
  tasks,
  onGo,
}: {
  tasks: DailyTask[];
  onGo: (task: DailyTask) => void;
}) {
  if (!tasks.length) return null;
  return (
    <section className="today-tasks" aria-labelledby="today-tasks-title">
      <h2 id="today-tasks-title">
        <img src="course-art/course-flag-grass-v1.webp" alt="" />
        <AnnotatedText text="今天的任務" />
      </h2>
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
  );
}

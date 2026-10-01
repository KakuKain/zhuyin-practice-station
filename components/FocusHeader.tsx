import type { ReactNode } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { LessonLabel } from "./LessonTitle";

export function FocusHeader({
  onBack,
  backLabel,
  lessonIndex,
  stage,
  progress,
  status,
  heading = false,
}: {
  onBack: () => void;
  backLabel: string;
  lessonIndex: number;
  stage: string;
  progress?: string;
  status?: ReactNode;
  heading?: boolean;
}) {
  const Title = heading ? "h1" : "div";
  return (
    <header className="practice-focus-header">
      <button type="button" className="focus-header-back" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" />
        <span>{backLabel}</span>
      </button>
      <Title className="focus-header-title" tabIndex={heading ? -1 : undefined}>
        <LessonLabel lessonIndex={lessonIndex} />
        <span className="focus-header-stage">{stage}</span>
        {progress && <span className="focus-header-progress">{progress}</span>}
      </Title>
      {status && <div className="focus-header-status">{status}</div>}
    </header>
  );
}

import { ArrowLeft, Play, SpeakerHigh } from "@phosphor-icons/react";
import { AnnotatedText } from "../../components/AnnotatedText";
import { mathPromptVariants, mathPrompts } from "./math-audio";

/** The header every math lesson shows: back to the course list, the lesson and progress. */
export function MathHeader({
  title,
  detail,
  onLeave,
}: {
  title: string;
  detail?: string;
  onLeave: () => void;
}) {
  return (
    <header className="math-header">
      <button type="button" className="math-back" onClick={onLeave}>
        <ArrowLeft size={20} weight="bold" aria-hidden="true" />
        返回
      </button>
      <div>
        <strong>{title}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </header>
  );
}

/**
 * Every instruction is spoken; the speaker hears it again. The sentence is written in 國字注音,
 * so a child who knows zhuyin can read along.
 */
export function MathPrompt({ id, onPlay }: { id: string; onPlay: () => void }) {
  return (
    <div className="math-prompt">
      <button type="button" className="math-prompt-play" onClick={onPlay} aria-label="再聽一次">
        <SpeakerHigh size={32} weight="fill" aria-hidden="true" />
      </button>
      <p>
        <AnnotatedText text={mathPrompts[id]} variants={mathPromptVariants(id)} />
      </p>
    </div>
  );
}

export function MathStartButton({ onStart }: { onStart: () => void }) {
  return (
    <button type="button" className="math-start" onClick={onStart} aria-label="開始練習">
      <Play size={56} weight="fill" aria-hidden="true" />
      <span>開始</span>
    </button>
  );
}

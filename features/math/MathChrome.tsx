import { ArrowLeft, Play, SpeakerHigh } from "@phosphor-icons/react";

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

/** Every instruction is spoken; the button hears it again and the sentence is there for parents. */
export function MathPrompt({ text, onPlay }: { text: string; onPlay: () => void }) {
  return (
    <div className="math-prompt">
      <button type="button" className="math-prompt-play" onClick={onPlay}>
        <SpeakerHigh size={28} weight="fill" aria-hidden="true" />
        <span>再聽一次</span>
      </button>
      <p>{text}</p>
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

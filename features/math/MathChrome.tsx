import { ArrowLeft, SpeakerHigh } from "@phosphor-icons/react";
import { AnnotatedText } from "../../components/AnnotatedText";
import { mathPromptVariants, mathPrompts } from "./math-audio";
import { mathWord } from "./math-lessons";

/** A math word in 國字注音, with the reading listed in `mathWordReadings`. */
export function MathWords({ text }: { text: string }) {
  const word = mathWord(text);
  return <AnnotatedText text={word.text} variants={word.variants} />;
}

/** The header every math screen shows, like 聽寫's: 返回 to the lesson page, then where the child is. */
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
        <ArrowLeft size={20} aria-hidden="true" />
        <span>返回</span>
      </button>
      <h1>
        <span>{title}</span>
        {detail && <small>{detail}</small>}
      </h1>
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

/** The end of a round, like 辨音's: the cat with its trophy, a word for the parent, and what next. */
export function MathResult({
  title,
  note,
  onAgain,
  onLeave,
}: {
  title: string;
  note: string;
  onAgain: () => void;
  onLeave: () => void;
}) {
  return (
    <section className="math-result">
      <img className="math-result-art" src="course-art/sound-complete-cat.webp" alt="" />
      <h2>{title}</h2>
      <p>{note}</p>
      <div className="math-result-actions">
        <button type="button" className="math-result-again" onClick={onAgain}>
          再練一次
        </button>
        <button type="button" className="math-result-leave" onClick={onLeave}>
          回到這一課
        </button>
      </div>
    </section>
  );
}

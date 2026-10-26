import { useCallback, useEffect, useRef } from "react";
import { SpeakerHigh } from "@phosphor-icons/react";
import { AnnotatedText } from "../../components/AnnotatedText";
import type { AppController } from "../usePracticeApp";
import { englishDialogues, englishWord, englishWords, wordPicture } from "./english-lessons";
import {
  englishClipUrl,
  englishClips,
  englishPromptVariants,
  englishPrompts,
  hasEnglishClip,
} from "./english-audio";
import { letterGap, letterShape } from "./letter-shapes";

/** A Chinese word on the English pages, in 國字注音. */
export function EnglishWords({ text }: { text: string }) {
  const word = englishWord(text);
  return <AnnotatedText text={word.text} variants={word.variants} />;
}

/** The four lines of a writing square, as fractions of its height: top, middle, base, bottom. */
export const fourLines = { top: 11, band: 26 } as const;
const lineY = (line: number) => fourLines.top + line * fourLines.band;

/** The four writing lines in a 0–100 square: top, dashed middle, blue baseline, bottom. */
export function FourLines() {
  return (
    <svg
      className="english-lines"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line x1="0" x2="100" y1={lineY(0)} y2={lineY(0)} className="is-top" />
      <line x1="0" x2="100" y1={lineY(1)} y2={lineY(1)} className="is-middle" />
      <line x1="0" x2="100" y1={lineY(2)} y2={lineY(2)} className="is-base" />
      <line x1="0" x2="100" y1={lineY(3)} y2={lineY(3)} className="is-bottom" />
    </svg>
  );
}

/**
 * A letter drawn from its strokes. On a writing square (`square`), it stands on the square's four
 * lines, centred; `trace` draws it dashed with a blue dot and number where each stroke starts, as
 * the workbook's 描一描 does.
 */
export function LetterGlyph({
  letter,
  square = false,
  trace = false,
  className,
}: {
  letter: string;
  square?: boolean;
  trace?: boolean;
  className?: string;
}) {
  const shape = letterShape(letter);
  if (!shape) return <span className={className}>{letter}</span>;
  const box = square
    ? {
        x: -(100 / fourLines.band - shape.width) / 2,
        y: -fourLines.top / fourLines.band,
        size: 100 / fourLines.band,
      }
    : null;
  const pad = 0.3;
  /** Where each stroke starts: the point after its leading M. */
  const starts = shape.strokes.map(
    (stroke) =>
      stroke
        .slice(1)
        .split(/[ A-Z]/)
        .slice(0, 2)
        .map(Number) as [number, number],
  );
  const viewBox = box
    ? `${box.x} ${box.y} ${box.size} ${box.size}`
    : `${-pad} ${-pad} ${shape.width + 2 * pad} ${3 + 2 * pad}`;
  return (
    <svg
      className={`english-glyph${trace ? " is-trace" : ""}${className ? ` ${className}` : ""}`}
      viewBox={viewBox}
      aria-hidden="true"
    >
      {shape.strokes.map((stroke, index) => (
        <path key={index} d={stroke} />
      ))}
      {trace &&
        starts.map(([x, y], index) => {
          // Strokes that start at one point (A's two legs) spread their numbers apart.
          const same = starts.filter(([sx, sy]) => sx === x && sy === y);
          const place = starts.slice(0, index).filter(([sx, sy]) => sx === x && sy === y).length;
          return (
            <g key={`start-${index}`} className="english-start">
              <circle cx={x} cy={y} r="0.11" />
              {starts.length > 1 && (
                <text x={x + 0.12 + (place - (same.length - 1) / 2) * 0.4} y={y - 0.14}>
                  {index + 1}
                </text>
              )}
            </g>
          );
        })}
    </svg>
  );
}

/**
 * A word written in the lessons' letters, on one line, with blanks where letters are missing
 * (「_pple」). Used beside a writing square and on the parent's check.
 */
export function WordLetters({
  word,
  blanks = [],
  className,
}: {
  word: string;
  blanks?: number[];
  className?: string;
}) {
  const shapes = [...word].map((letter) => letterShape(letter));
  let x = 0;
  const placed = shapes.map((shape) => {
    const at = x;
    x += (shape?.width ?? 0.9) + letterGap;
    return at;
  });
  const width = Math.max(0.5, x - letterGap);
  return (
    <svg
      className={`english-word${className ? ` ${className}` : ""}`}
      viewBox={`-0.2 -0.25 ${width + 0.4} 3.5`}
      role="img"
      aria-label={[...word]
        .map((letter, index) => (blanks.includes(index) ? "空格" : letter))
        .join(" ")}
    >
      {shapes.map((shape, index) =>
        blanks.includes(index) ? (
          <line
            key={index}
            className="english-blank"
            x1={placed[index]}
            x2={placed[index] + (shape?.width ?? 0.9)}
            y1="2.15"
            y2="2.15"
          />
        ) : (
          <g key={index} transform={`translate(${placed[index]} 0)`}>
            {shape?.strokes.map((stroke, part) => (
              <path key={part} d={stroke} />
            ))}
          </g>
        ),
      )}
    </svg>
  );
}

/** A letter and its other case together, as the workbook prints them: Bb. */
export function LetterPair({ letter }: { letter: string }) {
  return (
    <span className="english-pair" aria-label={`${letter.toUpperCase()}${letter}`}>
      <LetterGlyph letter={letter.toUpperCase()} />
      <LetterGlyph letter={letter} />
    </span>
  );
}

/** A word's picture: its watercolor once painted, an emoji until then. */
export function WordPicture({ word, className }: { word: string; className?: string }) {
  const picture = wordPicture(word);
  return picture ? (
    <img className={`english-picture${className ? ` ${className}` : ""}`} src={picture} alt="" />
  ) : (
    <span
      className={`english-picture is-emoji${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {englishWords[word]?.emoji ?? "？"}
    </span>
  );
}

/** A dialogue's scene with its speech bubbles, as the workbook's Listen and Check draws it. */
export function DialogueScene({ id }: { id: string }) {
  const dialogue = englishDialogues[id];
  return (
    <span className="english-scene">
      <span className="english-scene-art" aria-hidden="true">
        {dialogue.scene}
      </span>
      {dialogue.lines.map((line, index) => (
        <span key={index} className={`english-bubble is-${index === 0 ? "first" : "second"}`}>
          {line}
        </span>
      ))}
    </span>
  );
}

type Voice = Pick<AppController, "speak" | "stopPlayback">;

/**
 * Plays an instruction (Chinese) and then its English letters or words, one after another, with
 * a short pause between words. A clip not voiced yet is skipped.
 */
export function useEnglishVoice({ speak, stopPlayback }: Voice) {
  const timer = useRef<number | null>(null);
  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(
    () => () => {
      cancel();
      stopPlayback();
    },
    [cancel, stopPlayback],
  );
  return useCallback(
    (ids: string[], pause = 450) => {
      cancel();
      const queue = ids.filter(hasEnglishClip);
      const next = () => {
        const id = queue.shift();
        if (!id) return;
        const done = () => {
          timer.current = window.setTimeout(next, queue.length ? pause : 0);
        };
        speak(englishClips[id].text, { url: englishClipUrl(id), onEnded: done, onError: done });
      };
      next();
    },
    [cancel, speak],
  );
}

/** The spoken instruction, written in 國字注音, with an icon to hear it again. */
export function EnglishPrompt({ id, onPlay }: { id: string; onPlay: () => void }) {
  return (
    <div className="math-prompt english-prompt">
      <button type="button" className="math-prompt-play" onClick={onPlay} aria-label="再聽一次">
        <SpeakerHigh size={32} weight="fill" aria-hidden="true" />
      </button>
      <p>
        <AnnotatedText text={englishPrompts[id]} variants={englishPromptVariants(id)} />
      </p>
    </div>
  );
}

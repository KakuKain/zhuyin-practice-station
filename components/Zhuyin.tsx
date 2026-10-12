import { combinedRhymeGroups } from "../features/symbols/symbols-data";

const combinedGlyphs = Object.fromEntries(
  combinedRhymeGroups.flatMap((group, groupIndex) =>
    group.cells.map((rhyme, index) => [
      rhyme,
      String.fromCodePoint(0xe100 + [0, 10, 18][groupIndex] + index),
    ]),
  ),
);

import { syllableGlyphs } from "../features/lesson/zhuyin-glyphs";
import { useAnswerFontReady } from "../lib/loading/font-ready";

export function ZhuyinStack({
  text,
  literalSymbol = false,
}: {
  text: string;
  literalSymbol?: boolean;
}) {
  const fontReady = useAnswerFontReady();
  const isSymbol = literalSymbol && /^[\u3105-\u3129]+$/.test(text);
  // Spell the syllable out until the answer font has loaded, never a stand-in Han character.
  const useLiteral = !isSymbol && (!syllableGlyphs[text] || !fontReady);
  const tone = text.match(/[˙ˊˇˋ]/)?.[0];
  const letters = Array.from(text.replace(/[˙ˊˇˋ]/g, ""));
  return (
    <span className="zhuyin-stack" aria-label={text}>
      <span
        className={`zhuyin-glyph ${useLiteral ? "is-literal" : ""} ${isSymbol ? "is-symbol" : ""} ${isSymbol && text.length > 1 ? "is-symbol-combination" : ""}`}
        aria-hidden="true"
      >
        {useLiteral ? (
          <span className="literal-syllable">
            <span className="literal-letters">
              {letters.map((letter, index) => (
                <span key={index}>{letter}</span>
              ))}
            </span>
            {tone && (
              <span className={`literal-tone${tone === "˙" ? " is-neutral" : ""}`}>{tone}</span>
            )}
          </span>
        ) : isSymbol ? (
          (combinedGlyphs[text] ?? text)
        ) : (
          syllableGlyphs[text]
        )}
      </span>
    </span>
  );
}

export function AnswerDisplay({
  answer,
  literalSymbols = false,
}: {
  answer: string;
  literalSymbols?: boolean;
}) {
  return (
    <span
      className={`answer-display ${answer.includes("|") ? "is-word" : ""}`}
      dir={answer.includes("|") ? "rtl" : undefined}
    >
      {answer.split("|").map((syllable, index) => (
        <ZhuyinStack text={syllable} literalSymbol={literalSymbols} key={`${index}-${syllable}`} />
      ))}
    </span>
  );
}

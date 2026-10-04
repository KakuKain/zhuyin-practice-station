"use client";

import { syllableGlyphs } from "../features/lesson/zhuyin-glyphs";

export function ZhuyinStack({
  text,
  literalSymbol = false,
}: {
  text: string;
  literalSymbol?: boolean;
}) {
  const useLiteral = !literalSymbol && !syllableGlyphs[text];
  const tone = text.match(/[˙ˊˇˋ]/)?.[0];
  const letters = Array.from(text.replace(/[˙ˊˇˋ]/g, ""));
  const isSymbol = literalSymbol && /^[\u3105-\u3129]+$/.test(text);
  return (
    <span className="zhuyin-stack" aria-label={text}>
      <span
        className={`zhuyin-glyph ${useLiteral ? "is-literal" : ""} ${text === "˙ㄉㄧ" ? "is-neutral-di" : ""} ${isSymbol ? "is-symbol" : ""} ${isSymbol && text.length > 1 ? "is-symbol-combination" : ""}`}
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
          text
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

"use client";

import { syllableGlyphs } from "../features/lesson/zhuyin-glyphs";

export function ZhuyinStack({
  text,
  literalSymbol = false,
}: {
  text: string;
  literalSymbol?: boolean;
}) {
  const isSymbol = literalSymbol && /^[\u3105-\u3129]+$/.test(text);
  return (
    <span className="zhuyin-stack" aria-label={text}>
      <span
        className={`zhuyin-glyph ${text === "˙ㄉㄧ" ? "is-neutral-di" : ""} ${isSymbol ? "is-symbol" : ""} ${isSymbol && text.length > 1 ? "is-symbol-combination" : ""}`}
        aria-hidden="true"
      >
        {isSymbol ? text : (syllableGlyphs[text] ?? text)}
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

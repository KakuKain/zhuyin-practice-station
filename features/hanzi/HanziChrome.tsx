import { useEffect, useId, useState } from "react";
import { AnnotatedText } from "../../components/AnnotatedText";
import { readingVariants } from "../lesson/reading-variants";
import { book1Readings } from "./book1-characters";
import strokeData from "./strokes.json";

export type CharacterStrokes = {
  strokes: string[];
  medians: number[][][];
  radStrokes: number[];
};
export const characterStrokes = strokeData as Record<string, CharacterStrokes>;

/** One reading per character of every 第一冊 word a child reads, for 國字注音. */
export const hanziWordReadings: Record<string, string> = {
  國語: "ㄍㄨㄛˊ ㄩˇ",
  國字真簡單: "ㄍㄨㄛˊ ㄗˋ ㄓㄣ ㄐㄧㄢˇ ㄉㄢ",
  一到十: "ㄧ ㄉㄠˋ ㄕˊ",
  第一課: "ㄉㄧˋ ㄧ ㄎㄜˋ",
  第二課: "ㄉㄧˋ ㄦˋ ㄎㄜˋ",
  第三課: "ㄉㄧˋ ㄙㄢ ㄎㄜˋ",
  第四課: "ㄉㄧˋ ㄙˋ ㄎㄜˋ",
  第五課: "ㄉㄧˋ ㄨˇ ㄎㄜˋ",
  第六課: "ㄉㄧˋ ㄌㄧㄡˋ ㄎㄜˋ",
  拍拍手: "ㄆㄞ ㄆㄞ ㄕㄡˇ",
  這是誰的: "ㄓㄜˋ ㄕˋ ㄕㄟˊ ˙ㄉㄜ",
  秋千: "ㄑㄧㄡ ㄑㄧㄢ",
  大個子小個子: "ㄉㄚˋ ㄍㄜˋ ˙ㄗ ㄒㄧㄠˇ ㄍㄜˋ ˙ㄗ",
  比一比: "ㄅㄧˇ ㄧ ㄅㄧˇ",
  小路: "ㄒㄧㄠˇ ㄌㄨˋ",
  這一課的生字: "ㄓㄜˋ ㄧ ㄎㄜˋ ˙ㄉㄜ ㄕㄥ ㄗˋ",
  點一個字寫寫看: "ㄉㄧㄢˇ ㄧ ㄍㄜˋ ㄗˋ ㄒㄧㄝˇ ㄒㄧㄝˇ ㄎㄢˋ",
  筆順: "ㄅㄧˇ ㄕㄨㄣˋ",
  描一描: "ㄇㄧㄠˊ ㄧ ㄇㄧㄠˊ",
  看著寫: "ㄎㄢˋ ˙ㄓㄜ ㄒㄧㄝˇ",
  自己寫: "ㄗˋ ㄐㄧˇ ㄒㄧㄝˇ",
  個字: "ㄍㄜˋ ㄗˋ",
  開始: "ㄎㄞ ㄕˇ",
  畫: "ㄏㄨㄚˋ",
  再看一次: "ㄗㄞˋ ㄎㄢˋ ㄧ ㄘˋ",
  不是這一筆: "ㄅㄨˋ ㄕˋ ㄓㄜˋ ㄧ ㄅㄧˇ",
  再試一次: "ㄗㄞˋ ㄕˋ ㄧ ㄘˋ",
  寫對了: "ㄒㄧㄝˇ ㄉㄨㄟˋ ˙ㄌㄜ",
};

/** A word in 國字注音; a 生字 alone shows the reading 本冊生字 gives it. */
export function HanziWords({ text }: { text: string }) {
  const readings = hanziWordReadings[text] ?? book1Readings[text] ?? "";
  return <AnnotatedText text={text} variants={readingVariants(text, readings)} />;
}

const medianLength = (median: number[][]) =>
  median.reduce(
    (sum, point, i) =>
      i ? sum + Math.hypot(point[0] - median[i - 1][0], point[1] - median[i - 1][1]) : 0,
    0,
  );
const medianPath = (median: number[][]) => `M ${median.map(([x, y]) => `${x} ${y}`).join(" L ")}`;

/**
 * A 生字 in its 1024 box: the model as the level shows it, the strokes written so far in ink,
 * the next stroke's start (a blue dot and its number, with its path when it is a hint), and a
 * demonstration that draws strokes one after another, each inside its own outline.
 */
export function HanziGlyph({
  character,
  model,
  done,
  next,
  hint,
  demo,
  onDemoEnd,
  finished,
}: {
  character: string;
  /** How the model shows: pale, fainter, or not at all. */
  model: "trace" | "faint" | "none";
  /** Strokes written so far. */
  done: number;
  /** Show where the next stroke starts. */
  next: boolean;
  /** Show the next stroke's path too. */
  hint: boolean;
  /** Strokes to draw in turn, from 0. */
  demo: number[] | null;
  onDemoEnd?: () => void;
  finished: boolean;
}) {
  const data = characterStrokes[character];
  const id = useId().replace(/:/g, "");
  const [step, setStep] = useState(0);
  const demoKey = demo?.join(",") ?? "";
  // A new demonstration starts from its first stroke.
  const [shownKey, setShownKey] = useState(demoKey);
  if (shownKey !== demoKey) {
    setShownKey(demoKey);
    setStep(0);
  }
  useEffect(() => {
    if (!demo || step < demo.length) return;
    const timer = window.setTimeout(() => onDemoEnd?.(), 450);
    return () => window.clearTimeout(timer);
  }, [demo, step, onDemoEnd]);
  if (!data) return null;
  const start = data.medians[done]?.[0];
  return (
    <svg
      className={`hanzi-glyph${finished ? " is-finished" : ""}`}
      viewBox="0 0 1024 1024"
      aria-hidden="true"
    >
      <defs>
        {data.strokes.map((path, i) => (
          <clipPath id={`${id}-${i}`} key={i}>
            <path d={path} />
          </clipPath>
        ))}
        <marker
          id={`${id}-arrow`}
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="hanzi-arrow-head" />
        </marker>
      </defs>
      <g transform="scale(1,-1) translate(0,-900)">
        {model !== "none" &&
          data.strokes.map((path, i) => (
            <path
              key={`model-${i}`}
              d={path}
              className={`hanzi-model is-${model}${i === done && next && model === "trace" ? " is-next" : ""}`}
            />
          ))}
        {data.strokes.slice(0, done).map((path, i) => (
          <path key={`done-${i}`} d={path} className="hanzi-ink" />
        ))}
        {hint && data.medians[done] && (
          <path
            d={medianPath(data.medians[done])}
            className="hanzi-hint-path"
            markerEnd={`url(#${id}-arrow)`}
          />
        )}
        {demo?.map((stroke, i) => {
          if (i > step) return null;
          const length = medianLength(data.medians[stroke]);
          return (
            <path
              key={`demo-${demoKey}-${i}`}
              d={medianPath(data.medians[stroke])}
              clipPath={`url(#${id}-${stroke})`}
              className="hanzi-demo"
              style={{
                strokeDasharray: length + 160,
                strokeDashoffset: i < step ? 0 : length + 160,
                animationDuration: `${0.3 + length / 1400}s`,
              }}
              onAnimationEnd={() => {
                if (i === step) setStep(step + 1);
              }}
            />
          );
        })}
      </g>
      {next && start && !finished && (
        <g className="hanzi-start">
          <circle cx={start[0]} cy={900 - start[1]} r="42" />
          <text x={start[0]} y={900 - start[1]} dominantBaseline="central" textAnchor="middle">
            {done + 1}
          </text>
        </g>
      )}
    </svg>
  );
}

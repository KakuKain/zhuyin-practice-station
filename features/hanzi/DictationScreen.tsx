import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Circle,
  Eye,
  SpeakerHigh,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import type { InkStroke } from "../types";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import { registeredAudioUrl } from "../../lib/audio/audio-registry";
import { InkTools } from "../../components/InkTools";
import { ZhuyinStack } from "../../components/Zhuyin";
import { taskKeys } from "../rewards/stamp-book";
import { MathHeader, MathResult } from "../math/MathChrome";
import { book1LessonLabel, book1Lessons } from "./book1-characters";
import { alsoRight, answerCells, book1Words, type AnswerCell } from "./book1-words";
import { HanziWords } from "./HanziChrome";
import { recordDictation } from "./hanzi-round";
import {
  buildDictation,
  charactersPerRound,
  cellParts,
  checkWritten,
  clearDictation,
  readDictation,
  saveDictation,
  type DictationItem,
  type DictationMode,
  type DictationRound,
  type WrittenCheck,
} from "./dictation";
import { CellGuides, InkReplay } from "./HanziCells";
import "../../styles/lazy/hanzi.css";

type DictationApp = Pick<
  AppController,
  "hanziLessonId" | "navigate" | "speak" | "stopPlayback" | "awardStamp"
>;

const pronunciation = (item: DictationItem) => item.callReadings.replaceAll(" ", "|");
const hasClip = (item: DictationItem) =>
  registeredAudioUrl(item.call, pronunciation(item)) !== null;

/**
 * 聽寫: the question is only heard. Each character has a 田字格 and a 注音 strip beside it, as
 * in the 作業簿: a 生字 taught by then is written as itself with its 注音, any other in 注音 in
 * the square. At the end the parent checks: each 國字 is judged stroke by stroke first, the
 * 注音 is the parent's to tick.
 */
export function DictationScreen({ app }: { app: DictationApp }) {
  const lesson = book1Lessons.find((item) => item.id === app.hanziLessonId) ?? book1Lessons[1];
  const label = book1LessonLabel(lesson);
  const [saved] = useState(() => readDictation(lesson.id));
  const [round, setRound] = useState<DictationRound | null>(null);
  const [phase, setPhase] = useState<"choose" | "write" | "check" | "done">("choose");
  const [summary, setSummary] = useState<string[]>([]);
  const start = (next: DictationRound) => {
    saveDictation(next);
    setRound(next);
    setPhase("write");
  };
  const leave = () => {
    app.stopPlayback();
    app.navigate("hanzi-lesson");
  };
  return (
    <main className="math-shell hanzi-shell">
      <MathHeader
        title={`${label} · 聽寫`}
        detail={
          phase === "write" && round
            ? `第 ${round.index + 1} 題 / ${round.items.length}`
            : undefined
        }
        onLeave={leave}
      />
      {phase === "choose" && (
        <DictationChoice
          lessonId={lesson.id}
          saved={saved}
          onStart={(mode) => start(buildDictation(lesson.id, mode))}
          onContinue={() => saved && start(saved)}
        />
      )}
      {phase === "write" && round && (
        <DictationWriting
          key={round.id}
          round={round}
          app={app}
          onUpdate={(change) =>
            setRound((current) => {
              if (!current) return current;
              const next = change(current);
              saveDictation(next);
              return next;
            })
          }
          onDone={() => setPhase("check")}
        />
      )}
      {phase === "check" && round && (
        <DictationCheck
          round={round}
          onBack={() => setPhase("write")}
          onDone={(results) => {
            recordDictation(results);
            clearDictation();
            app.awardStamp({
              kind: "practice",
              subject: "zhuyin",
              detail: `第一冊 ${label} 聽寫`,
              taskKey: taskKeys.hanzi(lesson.id),
              needsPractice: results.filter((item) => !item.right).length,
            });
            setSummary(results.filter((item) => !item.right).map((item) => item.text));
            setPhase("done");
          }}
        />
      )}
      {phase === "done" && (
        <MathResult
          title="聽寫完成！"
          note={
            summary.length
              ? `要再練的：${summary.join("、")}。${round?.mode === "characters" ? "練習的生字清單會標出這些字。" : ""}`
              : "全部都寫對了！"
          }
          onAgain={() => {
            setRound(null);
            setPhase("choose");
          }}
          onLeave={leave}
        />
      )}
    </main>
  );
}

function DictationChoice({
  lessonId,
  saved,
  onStart,
  onContinue,
}: {
  lessonId: number;
  saved: DictationRound | null;
  onStart: (mode: DictationMode) => void;
  onContinue: () => void;
}) {
  const lesson = book1Lessons.find((item) => item.id === lessonId)!;
  const words = book1Words[lessonId]?.length ?? 0;
  const characters = Math.min(charactersPerRound, lesson.characters.length);
  return (
    <section className="hanzi-choice">
      {saved && (
        <button type="button" className="hanzi-choice-card is-continue" onClick={onContinue}>
          <strong>
            <HanziWords text="繼續聽寫" />
          </strong>
          <small>
            <HanziWords text="第" /> {saved.index + 1} <HanziWords text="題" />
          </small>
        </button>
      )}
      <button type="button" className="hanzi-choice-card" onClick={() => onStart("characters")}>
        <strong>
          <HanziWords text="只考生字" />
        </strong>
        <small>
          {characters} <HanziWords text="題" />
        </small>
      </button>
      {words > 0 && (
        <button type="button" className="hanzi-choice-card" onClick={() => onStart("words")}>
          <strong>
            <HanziWords text="全部語詞" />
          </strong>
          <small>
            {words} <HanziWords text="題" />
          </small>
        </button>
      )}
    </section>
  );
}

/** One canvas a cell, its 田字格 and 注音 strip together (cellParts). */
function DictationWriting({
  round,
  app,
  onUpdate,
  onDone,
}: {
  round: DictationRound;
  app: DictationApp;
  /** Changes the round from its latest state; every change is saved. */
  onUpdate: (change: (round: DictationRound) => DictationRound) => void;
  onDone: () => void;
}) {
  const item = round.items[round.index];
  const cells = answerCells(item, round.lessonId);
  const [reveal, setReveal] = useState(false);
  const [active, setActive] = useState(0);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  // A new question starts with the question hidden and its first cell chosen.
  const [shownIndex, setShownIndex] = useState(round.index);
  if (shownIndex !== round.index) {
    setShownIndex(round.index);
    setReveal(false);
    setActive(0);
  }
  const ink = useInkCanvas({
    scope: `${round.id}:${round.index}`,
    mounted: true,
    enabled: true,
    count: cells.length,
    getCanvas: (i) => canvases.current[i] ?? null,
    readInitial: (i) => round.ink[round.index]?.[i] ?? [],
    onChange: (i, strokes) =>
      onUpdate((current) => {
        const ink = current.ink.map((item) => [...item]);
        ink[current.index][i] = strokes;
        return { ...current, ink };
      }),
  });
  const play = () => {
    if (hasClip(item))
      app.speak(item.call, { pronunciation: pronunciation(item), onError: () => {} });
  };
  const playOnce = useEffectEvent(play);
  useEffect(() => {
    playOnce();
  }, [round.index]);
  const go = (index: number) => onUpdate((current) => ({ ...current, index }));
  const last = round.index === round.items.length - 1;
  return (
    <section className="hanzi-dictation">
      <div className="hanzi-dictation-prompt">
        <button type="button" className="hanzi-play" onClick={play} disabled={!hasClip(item)}>
          <SpeakerHigh size={34} weight="fill" aria-hidden="true" />
          <HanziWords text="再聽一次" />
        </button>
        <button
          type="button"
          className="hanzi-parent-peek"
          onClick={() => setReveal(!reveal)}
          aria-pressed={reveal}
        >
          <Eye size={20} aria-hidden="true" />
          {reveal
            ? `題目：${item.call}`
            : hasClip(item)
              ? "家長看題目"
              : "還沒有錄音，請家長念題目"}
        </button>
      </div>
      <div className="hanzi-dictation-cells">
        {cells.map((cell, k) => (
          <div className={`hanzi-cell${active === k ? " is-active" : ""}`} key={k}>
            <CellGuides mark={cell.write === "標點"} />
            <canvas
              ref={(element) => {
                canvases.current[k] = element;
              }}
              data-word-index={k}
              className="hanzi-cell-canvas"
              aria-label={`第 ${k + 1} 個字`}
              onPointerDown={(event) => {
                setActive(k);
                ink.begin(event);
              }}
              onPointerMove={ink.move}
              onPointerUp={ink.end}
              onPointerCancel={ink.end}
            />
          </div>
        ))}
      </div>
      <InkTools
        erasing={ink.eraserCell === active}
        hasInk={ink.ink[active] ?? false}
        canUndo={ink.undoAvailable[active] ?? false}
        cellLabel={`第 ${active + 1} 個字`}
        onEraser={() => ink.toggleEraser(active)}
        onUndo={() => ink.undo(active)}
        onClear={() => ink.clear(active)}
      />
      <div className="hanzi-dictation-nav">
        <button
          type="button"
          className="hanzi-again"
          onClick={() => go(round.index - 1)}
          disabled={round.index === 0}
        >
          <ArrowLeft size={20} weight="bold" aria-hidden="true" />
          <HanziWords text="上一題" />
        </button>
        <button
          type="button"
          className="hanzi-go-next"
          onClick={() => (last ? onDone() : go(round.index + 1))}
        >
          <HanziWords text={last ? "寫好了" : "下一題"} />
          <ArrowRight size={20} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

type Results = { text: string; right: boolean; character: boolean }[];

/**
 * The parent's check: each question's answer beside the child's writing, which can be replayed
 * stroke by stroke. Every 國字 is judged first and the parent can change that; the 注音 is the
 * parent's to mark. Both are 對／錯 buttons beside the question.
 */
function DictationCheck({
  round,
  onBack,
  onDone,
}: {
  round: DictationRound;
  onBack: () => void;
  onDone: (results: Results) => void;
}) {
  const [verdicts] = useState(() =>
    round.items.map((item, i) =>
      answerCells(item, round.lessonId).map((cell, k) =>
        cell.write === "國字"
          ? checkWritten(cell.character, cellParts(round.ink[i]?.[k] ?? []).square)
          : null,
      ),
    ),
  );
  // 國字 starts from the judging; questions without a 國字 have nothing to mark there.
  const [hanzi, setHanzi] = useState<(boolean | null)[]>(() =>
    verdicts.map((row) =>
      row.some((value) => value) ? row.every((value) => !value || value.ok) : null,
    ),
  );
  const [zhuyin, setZhuyin] = useState<(boolean | null)[]>(() => round.items.map(() => null));
  const ready = zhuyin.every((value) => value !== null);
  const mark = (
    label: string,
    value: boolean | null,
    set: (value: boolean) => void,
    question: number,
  ) => (
    <div className="hanzi-check-mark" role="group" aria-label={`第 ${question + 1} 題的${label}`}>
      <span>{label}</span>
      {[true, false].map((option) => (
        <button
          type="button"
          key={String(option)}
          aria-pressed={value === option}
          aria-label={option ? "對" : "錯"}
          className={option ? "is-right" : "is-wrong"}
          onClick={() => set(option)}
        >
          {option ? (
            <Circle size={22} weight="bold" aria-hidden="true" />
          ) : (
            <X size={22} weight="bold" aria-hidden="true" />
          )}
        </button>
      ))}
    </div>
  );
  return (
    <section className="hanzi-check">
      <p className="hanzi-check-intro">
        請家長對答案：國字已先依筆順判斷好（有疑問可以按「看筆順」再改），注音請逐題選 ○ 或 ✕。
      </p>
      <ol className="hanzi-check-list">
        {round.items.map((item, i) => {
          const cells = answerCells(item, round.lessonId);
          return (
            <li key={i} className="hanzi-check-item">
              <span className="hanzi-check-number">{i + 1}</span>
              <div className="hanzi-check-cells">
                {cells.map((cell, k) => (
                  <CheckCell
                    key={k}
                    cell={cell}
                    strokes={round.ink[i]?.[k] ?? []}
                    verdict={verdicts[i][k]}
                  />
                ))}
              </div>
              <div className="hanzi-check-marks">
                {hanzi[i] !== null &&
                  mark(
                    "國字",
                    hanzi[i],
                    (value) => setHanzi((current) => current.map((v, z) => (z === i ? value : v))),
                    i,
                  )}
                {mark(
                  "注音",
                  zhuyin[i],
                  (value) => setZhuyin((current) => current.map((v, z) => (z === i ? value : v))),
                  i,
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="hanzi-dictation-nav">
        <button type="button" className="hanzi-again" onClick={onBack}>
          <ArrowLeft size={20} weight="bold" aria-hidden="true" />
          回去看題目
        </button>
        <button
          type="button"
          className="hanzi-go-next"
          disabled={!ready}
          onClick={() =>
            onDone(
              round.items.map((item, i) => ({
                text: item.text,
                character: round.mode === "characters",
                right: Boolean(zhuyin[i]) && hanzi[i] !== false,
              })),
            )
          }
        >
          {ready ? "完成對答案" : "還有注音沒勾"}
        </button>
      </div>
    </section>
  );
}

function CheckCell({
  cell,
  strokes,
  verdict,
}: {
  cell: AnswerCell;
  strokes: InkStroke[];
  verdict: WrittenCheck | null;
}) {
  const [replay, setReplay] = useState(0);
  return (
    <div className="hanzi-check-cell">
      <span className="hanzi-check-answer">
        {cell.write === "國字" ? (
          <HanziWords text={cell.character} />
        ) : cell.write === "注音" ? (
          <span className="hanzi-check-zhuyin-answer">
            <ZhuyinStack text={cell.reading} />
            {alsoRight[cell.character] && <small>（寫「{cell.character}」也對）</small>}
          </span>
        ) : (
          cell.character
        )}
      </span>
      <span className="hanzi-check-ink">
        <CellGuides mark={cell.write === "標點"} />
        <InkReplay key={replay} strokes={strokes} play={replay > 0} />
      </span>
      {verdict && (
        <span className={`hanzi-check-verdict${verdict.ok ? " is-right" : " is-wrong"}`}>
          {verdict.ok ? (
            <>
              <CheckCircle size={18} weight="fill" aria-hidden="true" />
              筆順對
            </>
          ) : (
            <>
              <WarningCircle size={18} weight="fill" aria-hidden="true" />
              {!cellParts(strokes).square.length
                ? "沒有寫國字"
                : verdict.count !== verdict.expected
                  ? `寫了 ${verdict.count} 筆，「${cell.character}」是 ${verdict.expected} 筆`
                  : `第 ${verdict.at} 筆可能不對`}
            </>
          )}
        </span>
      )}
      {strokes.length > 0 && (
        <button
          type="button"
          className="hanzi-check-replay"
          onClick={() => setReplay((value) => value + 1)}
        >
          看筆順
        </button>
      )}
    </div>
  );
}

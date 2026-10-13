import { useEffect, useState } from "react";
import { Gift, Heart, Medal, SealCheck, Star, X, type Icon } from "@phosphor-icons/react";
import { AnnotatedText } from "../../components/AnnotatedText";
import { readingVariants } from "../lesson/reading-variants";
import type { CardProgress, RewardSettings, StampBook, StampKind } from "./stamp-book";
import type { StampNews } from "./useStampBook";
import { fillWord, rewardReadings, stampWords, type StampWord } from "./stamp-words";

export const stampLooks: Record<StampKind, { icon: Icon; label: string; word: StampWord }> = {
  practice: { icon: SealCheck, label: "練習章", word: "practice" },
  fix: { icon: Star, label: "訂正之星", word: "fix" },
  cheer: { icon: Heart, label: "鼓勵章", word: "cheer" },
  task: { icon: Medal, label: "任務章", word: "task" },
};

/** A sentence for the child, in 國字注音. */
export function Say({ word, n, m }: { word: StampWord; n?: number; m?: number }) {
  const text = fillWord(word, n, m);
  return <AnnotatedText text={text} variants={readingVariants(text, stampWords[word][1])} />;
}

/** A suggested reward in 國字注音; one the parent wrote is shown as typed. */
function RewardName({ reward }: { reward: string }) {
  const readings = rewardReadings[reward];
  return readings ? (
    <AnnotatedText text={reward} variants={readingVariants(reward, readings)} />
  ) : (
    <>{reward}</>
  );
}

/** The card: a slot per stamp, filled in the order they were earned. */
export function StampSlots({ progress }: { progress: CardProgress }) {
  return (
    <ol className="stamp-slots" aria-label={`蓋了 ${progress.filled} 個章，共 ${progress.size} 格`}>
      {Array.from({ length: progress.size }, (_, index) => {
        const entry = progress.slots[index];
        const filled = index < progress.filled;
        const kind = entry?.kind ?? "practice";
        const { icon: Mark, label } = stampLooks[kind];
        return (
          <li key={index} className={filled ? `is-filled is-${kind}` : undefined}>
            {filled ? (
              <>
                <Mark size={30} weight="fill" aria-hidden="true" />
                <span className="visually-hidden">{label}</span>
              </>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function StampCardDialog({
  name,
  progress,
  book,
  settings,
  onChoose,
  onClose,
}: {
  /** A sibling's name; one child's card is 「我的集章卡」. */
  name?: string;
  progress: CardProgress;
  book: StampBook;
  settings: RewardSettings;
  onChoose: (reward: string) => void;
  onClose: () => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const recent = book.redemptions.slice(-3).reverse();
  return (
    <div className="fill-dialog-backdrop">
      <div className="stamp-dialog" role="dialog" aria-modal="true" aria-labelledby="stamp-title">
        <header>
          <h2 id="stamp-title">
            {name ? (
              <>
                {name}
                <Say word="ofCard" />
              </>
            ) : (
              <Say word="myCard" />
            )}
          </h2>
          <button type="button" className="stamp-close" onClick={onClose} aria-label="關閉">
            <X size={22} weight="bold" aria-hidden="true" />
          </button>
        </header>
        {done ? (
          <div className="stamp-done">
            <img src="course-art/festival-watercolor.webp" alt="" />
            <p>
              <Say word="picked" />「
              <strong>
                <RewardName reward={done} />
              </strong>
              」！
              <br />
              <Say word="together" />
            </p>
            <button type="button" className="primary-button" onClick={onClose}>
              <Say word="ok" />
            </button>
          </div>
        ) : (
          <>
            <StampSlots progress={progress} />
            {!progress.full ? (
              <p className="stamp-hint">
                <Say word="toGo" n={progress.size - progress.filled} />
              </p>
            ) : settings.rewards.length === 0 ? (
              <p className="stamp-hint">
                <Say word="noRewards" />
              </p>
            ) : chosen ? (
              <div className="stamp-confirm">
                <p>
                  <Say word="ask" />「
                  <strong>
                    <RewardName reward={chosen} />
                  </strong>
                  」<Say word="askEnd" />
                </p>
                <div className="math-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      onChoose(chosen);
                      setDone(chosen);
                    }}
                  >
                    <Say word="yes" />
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setChosen(null)}
                  >
                    <Say word="rethink" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="stamp-rewards">
                <img className="stamp-rewards-art" src="course-art/happy-watercolor.webp" alt="" />
                <p className="stamp-hint">
                  <Say word="choose" />
                </p>
                <div>
                  {settings.rewards.map((reward) => (
                    <button type="button" key={reward} onClick={() => setChosen(reward)}>
                      <Gift size={22} weight="fill" aria-hidden="true" />
                      <RewardName reward={reward} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ul className="stamp-legend" aria-label="章的種類">
              {(["practice", "fix", "cheer", "task"] as const).map((kind) => {
                const { icon: Mark, word } = stampLooks[kind];
                return (
                  <li key={kind} className={`is-${kind}`}>
                    <Mark size={20} weight="fill" aria-hidden="true" />
                    <Say word={word} />
                  </li>
                );
              })}
            </ul>
            {recent.length > 0 && (
              <p className="stamp-history">
                <Say word="history" />
                {recent.map((item, index) => (
                  <span key={item.at}>
                    {index > 0 && "、"}
                    <RewardName reward={item.reward} />
                  </span>
                ))}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** A stamp the child just earned, for a few seconds; a full card stays a little longer. */
export function StampNewsToast({ news, onDismiss }: { news: StampNews; onDismiss: () => void }) {
  const { entry, progress } = news;
  const full = entry.stamped && progress.full;
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, full ? 8000 : 3500);
    return () => window.clearTimeout(timer);
  }, [full, onDismiss, news]);
  const { icon: Mark } = stampLooks[entry.kind];
  return (
    <div className="stamp-toast-layer">
      <button
        type="button"
        className={`stamp-toast is-${entry.kind}${entry.stamped ? "" : " is-rest"}`}
        onClick={onDismiss}
        role="status"
      >
        {entry.stamped ? (
          <>
            <span className="stamp-toast-mark" aria-hidden="true">
              <Mark size={44} weight="fill" />
            </span>
            <span>
              <strong>
                <Say
                  word={
                    entry.kind === "practice"
                      ? "stamped"
                      : entry.kind === "task"
                        ? "taskDone"
                        : entry.kind === "fix"
                          ? "gotFix"
                          : "gotCheer"
                  }
                />
              </strong>
              <small>{progress.full && <Say word="cardFull" />}</small>
            </span>
          </>
        ) : (
          <span>
            <strong>
              <Say word="rest" />
            </strong>
            <small>
              <Say word="tomorrow" />
            </small>
          </span>
        )}
      </button>
    </div>
  );
}

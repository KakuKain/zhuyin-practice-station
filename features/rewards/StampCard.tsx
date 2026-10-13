import { useEffect, useState } from "react";
import { Gift, Heart, SealCheck, Star, Stamp, X, type Icon } from "@phosphor-icons/react";
import type { CardProgress, RewardSettings, StampBook, StampKind } from "./stamp-book";
import type { StampNews } from "./useStampBook";

export const stampLooks: Record<StampKind, { icon: Icon; label: string }> = {
  practice: { icon: SealCheck, label: "練習章" },
  fix: { icon: Star, label: "訂正之星" },
  cheer: { icon: Heart, label: "鼓勵章" },
};

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
            ) : (
              <span aria-hidden="true">{index + 1}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** On the course list: how full the card is; a tap opens it. */
export function StampChip({ progress, onOpen }: { progress: CardProgress; onOpen: () => void }) {
  return (
    <button
      type="button"
      className={`stamp-chip${progress.full ? " is-full" : ""}`}
      onClick={onOpen}
      aria-label={`集章卡，${progress.full ? "集滿了，可以選獎勵" : `${progress.filled} / ${progress.size}`}`}
    >
      <Stamp size={22} weight="fill" aria-hidden="true" />
      <span>集章卡</span>
      <strong>{progress.full ? "集滿了！" : `${progress.filled} / ${progress.size}`}</strong>
    </button>
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
  name: string;
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
          <h2 id="stamp-title">{name}的集章卡</h2>
          <button type="button" className="stamp-close" onClick={onClose} aria-label="關閉">
            <X size={22} weight="bold" aria-hidden="true" />
          </button>
        </header>
        {done ? (
          <div className="stamp-done">
            <Gift size={64} weight="fill" aria-hidden="true" />
            <p>
              你選了「<strong>{done}</strong>」！
              <br />
              請爸爸媽媽陪你一起完成。
            </p>
            <button type="button" className="primary-button" onClick={onClose}>
              好
            </button>
          </div>
        ) : (
          <>
            <StampSlots progress={progress} />
            {!progress.full ? (
              <p className="stamp-hint">
                再蓋 {progress.size - progress.filled} 個章，就可以選一個獎勵！
              </p>
            ) : settings.rewards.length === 0 ? (
              <p className="stamp-hint">集滿了！請爸爸媽媽到「更多 → 集章卡」加上獎勵。</p>
            ) : chosen ? (
              <div className="stamp-confirm">
                <p>
                  要選「<strong>{chosen}</strong>」嗎？
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
                    就選這個
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setChosen(null)}
                  >
                    再想想
                  </button>
                </div>
              </div>
            ) : (
              <div className="stamp-rewards">
                <p className="stamp-hint">集滿了！選一個獎勵：</p>
                <div>
                  {settings.rewards.map((reward) => (
                    <button type="button" key={reward} onClick={() => setChosen(reward)}>
                      <Gift size={22} weight="fill" aria-hidden="true" />
                      {reward}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ul className="stamp-legend" aria-label="章的種類">
              {(["practice", "fix", "cheer"] as const).map((kind) => {
                const { icon: Mark, label } = stampLooks[kind];
                return (
                  <li key={kind} className={`is-${kind}`}>
                    <Mark size={18} weight="fill" aria-hidden="true" />
                    {label}
                  </li>
                );
              })}
            </ul>
            {recent.length > 0 && (
              <p className="stamp-history">
                換過的獎勵：{recent.map((item) => item.reward).join("、")}
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
  const { icon: Mark, label } = stampLooks[entry.kind];
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
              <strong>{entry.kind === "practice" ? "蓋了一個章！" : `得到${label}！`}</strong>
              <small>
                {progress.full
                  ? "集滿一張卡了！回到課程列表選獎勵吧。"
                  : `集章卡 ${progress.filled} / ${progress.size}`}
              </small>
            </span>
          </>
        ) : (
          <span>
            <strong>今天好認真！</strong>
            <small>明天繼續蓋章。</small>
          </span>
        )}
      </button>
    </div>
  );
}

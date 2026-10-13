import { useState } from "react";
import { Gift, Plus, X } from "@phosphor-icons/react";
import { ChildAvatar, childLabel } from "../../components/ChildPicker";
import { useChildProfiles } from "../../lib/storage/child-profiles";
import { StampSlots, stampLooks } from "../rewards/StampCard";
import { taskName } from "../rewards/TodayTasks";
import { taskOptions, type TaskOption } from "../rewards/daily-tasks";
import type { CatalogLesson } from "../courses/materials";
import {
  cardSizes,
  dailyCaps,
  maxNoteLength,
  maxOpenTasks,
  openTasks,
  taskSuggestions,
  visibleTasks,
  type DailyTask,
  rewardIdeas,
  suggestedRewards,
  type CardProgress,
  type RewardSettings,
  type StampBook,
  type StampInput,
} from "../rewards/stamp-book";

const maxRewards = 12;

/** The parent's list of rewards: ideas to tick, plus their own. */
function RewardChoices({
  rewards,
  onChange,
}: {
  rewards: string[];
  onChange: (rewards: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const options = [...rewardIdeas, ...rewards.filter((reward) => !rewardIdeas.includes(reward))];
  const add = () => {
    const reward = draft.trim().slice(0, 20);
    if (!reward || rewards.includes(reward) || rewards.length >= maxRewards) return;
    onChange([...rewards, reward]);
    setDraft("");
  };
  return (
    <div className="reward-choices">
      <ul>
        {options.map((reward) => (
          <li key={reward}>
            <label>
              <input
                type="checkbox"
                checked={rewards.includes(reward)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...rewards, reward].slice(0, maxRewards)
                      : rewards.filter((item) => item !== reward),
                  )
                }
              />
              {reward}
            </label>
          </li>
        ))}
      </ul>
      <div className="reward-add">
        <input
          value={draft}
          maxLength={20}
          placeholder="自己加一個，例如：一起騎腳踏車"
          aria-label="新增獎勵"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") add();
          }}
        />
        <button type="button" onClick={add} disabled={!draft.trim()}>
          <Plus size={18} weight="bold" aria-hidden="true" />
          加入
        </button>
      </div>
    </div>
  );
}

function Choice<T extends number>({
  label,
  value,
  options,
  format,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  format: (value: T) => string;
  onChange: (value: T) => void;
}) {
  return (
    <div className="reward-choice" role="radiogroup" aria-label={label}>
      <span>{label}</span>
      {options.map((option) => (
        <button
          type="button"
          role="radio"
          key={option}
          aria-checked={option === value}
          onClick={() => onChange(option)}
        >
          {format(option)}
        </button>
      ))}
    </div>
  );
}

const rules = (settings: RewardSettings) => [
  "完成一次練習蓋一個章：聽寫、默寫要家長一起檢查完；辨音、數學做完就蓋。",
  "待補強的題目改對了，得到一顆「訂正之星」。",
  "家長可以隨時送「鼓勵章」，寫一句鼓勵的話。",
  "家長可以把需要加強的練習設成「今天的任務」，完成時多得到一個任務章。",
  "蓋章不看對錯，也不會扣章；每個孩子有自己的卡，不互相比較。",
  `一天最多蓋 ${settings.dailyCap} 個章。孩子看不到這個數字，蓋滿了只會說「今天好認真，明天繼續蓋章！」`,
  "每個章都記下從哪裡來，你可以在紀錄裡看出孩子哪裡需要幫忙。",
];

/** First use: who collects, which rewards, and how stamps are earned, in three steps. */
function SetupGuide({
  settings,
  onDone,
}: {
  settings: RewardSettings;
  onDone: (settings: RewardSettings) => void;
}) {
  const profiles = useChildProfiles();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<RewardSettings>({
    ...settings,
    rewards: settings.rewards.length ? settings.rewards : suggestedRewards,
  });
  return (
    <div className="reward-guide">
      <p className="more-detail-intro">
        集章卡是可以不開的鼓勵方式：孩子每完成一次練習就蓋一個章，集滿一張卡，從你準備的獎勵挑一個。不需要登入，紀錄只存在這台裝置。
      </p>
      <ol className="reward-steps" aria-label="設定步驟">
        {["孩子", "獎勵", "怎麼蓋章"].map((label, index) => (
          <li key={label} aria-current={step === index + 1 ? "step" : undefined}>
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {step === 1 && (
        <section>
          <h2>誰會集章？</h2>
          <ul className="reward-children">
            {profiles.children.map((child) => (
              <li key={child.id}>
                <ChildAvatar child={child} />
                {childLabel(child, profiles)}
              </li>
            ))}
          </ul>
          <p>
            每個孩子有自己的一張卡，彼此不比較。要新增孩子，請到「更多 →
            孩子」；在課程列表按「換人」就會看到那個孩子的卡。
          </p>
          <div className="reward-nav">
            <button type="button" className="primary-button" onClick={() => setStep(2)}>
              下一步
            </button>
          </div>
        </section>
      )}
      {step === 2 && (
        <section>
          <h2>集滿一張卡，可以換什麼？</h2>
          <p>建議多選和家人一起的活動，讓練習不只是為了換東西。孩子集滿後會自己挑一個。</p>
          <RewardChoices
            rewards={draft.rewards}
            onChange={(rewards) => setDraft({ ...draft, rewards })}
          />
          <Choice
            label="一張卡幾格"
            value={draft.cardSize}
            options={cardSizes}
            format={(value) => `${value} 格`}
            onChange={(cardSize) => setDraft({ ...draft, cardSize })}
          />
          <div className="reward-nav">
            <button type="button" className="secondary-button" onClick={() => setStep(1)}>
              上一步
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={!draft.rewards.length}
              onClick={() => setStep(3)}
            >
              下一步
            </button>
          </div>
        </section>
      )}
      {step === 3 && (
        <section>
          <h2>怎麼蓋章？</h2>
          <ul className="reward-rules">
            {rules(draft).map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <div className="reward-nav">
            <button type="button" className="secondary-button" onClick={() => setStep(2)}>
              上一步
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => onDone({ ...draft, enabled: true })}
            >
              開始使用集章卡
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * 今天的任務: practices the parent asks for, from what the log shows needs help. Finishing one
 * earns a 任務章 that the day's limit never stops.
 */
function DailyTasks({
  book,
  catalog,
  onAdd,
  onRemove,
}: {
  book: StampBook;
  catalog: readonly CatalogLesson[];
  onAdd: (task: Omit<DailyTask, "id" | "at" | "doneAt">) => void;
  onRemove: (id: string) => void;
}) {
  const options = taskOptions(catalog);
  const [choice, setChoice] = useState("");
  const tasks = visibleTasks(book);
  const open = openTasks(book);
  const full = open.length >= maxOpenTasks;
  const add = (option: TaskOption | undefined) => {
    if (!option || full) return;
    onAdd({
      key: option.key,
      place: option.place,
      activity: option.activity,
      annotate: option.annotate,
    });
    setChoice("");
  };
  const suggestions = taskSuggestions(book).flatMap((suggestion) => {
    const option = options.find((item) => item.key === suggestion.taskKey);
    return option ? [{ ...suggestion, option }] : [];
  });
  const groups = [...new Set(options.map((option) => option.group))];
  return (
    <section className="reward-tasks">
      <h2>今天的任務</h2>
      <p>
        從紀錄看出孩子需要加強的地方，就把那一課設成任務。完成時會多得到一個任務章，不受每天的上限限制。
      </p>
      {tasks.length > 0 && (
        <ul className="reward-task-list">
          {tasks.map((task) => (
            <li key={task.id} className={task.doneAt ? "is-done" : undefined}>
              <span>
                <strong>{taskName(task)}</strong>
                <small>{task.doneAt ? `完成了 ${timeFormat.format(task.doneAt)}` : "還沒做"}</small>
              </span>
              {!task.doneAt && (
                <button
                  type="button"
                  onClick={() => onRemove(task.id)}
                  aria-label={`取消任務：${taskName(task)}`}
                >
                  <X size={18} weight="bold" aria-hidden="true" />
                  取消
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {suggestions.length > 0 && !full && (
        <div className="reward-task-suggestions">
          <h3>最近需要補強</h3>
          <ul>
            {suggestions.map((suggestion) => (
              <li key={suggestion.taskKey}>
                <span>
                  {suggestion.detail}
                  <small>需要補強 {suggestion.needsPractice} 題</small>
                </span>
                <button type="button" onClick={() => add(suggestion.option)}>
                  設為任務
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {full ? (
        <p className="reward-note">已經有 {maxOpenTasks} 個任務，完成或取消一個再加新的。</p>
      ) : (
        <div className="reward-add">
          <select
            value={choice}
            aria-label="選擇任務"
            onChange={(event) => setChoice(event.target.value)}
          >
            <option value="">選一個練習…</option>
            {groups.map((group) => (
              <optgroup label={group} key={group}>
                {options
                  .filter((option) => option.group === group)
                  .map((option) => (
                    <option
                      key={option.key}
                      value={option.key}
                      disabled={open.some((task) => task.key === option.key)}
                    >
                      {taskName({ ...option, id: "", at: 0 })}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            disabled={!choice}
            onClick={() => add(options.find((option) => option.key === choice))}
          >
            <Plus size={18} weight="bold" aria-hidden="true" />
            加入任務
          </button>
        </div>
      )}
    </section>
  );
}

const timeFormat = new Intl.DateTimeFormat("zh-TW", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Every stamp and reward, newest first, with where it came from. */
function StampLog({ book }: { book: StampBook }) {
  const [shown, setShown] = useState(30);
  const items = [
    ...book.log.map((entry) => ({ at: entry.at, entry, reward: null })),
    ...book.redemptions.map((redemption) => ({
      at: redemption.at,
      entry: null,
      reward: redemption,
    })),
  ].sort((a, b) => b.at - a.at);
  if (!items.length)
    return <p className="reward-empty">還沒有紀錄。孩子完成第一次練習就會出現。</p>;
  return (
    <>
      <ul className="reward-log">
        {items.slice(0, shown).map(({ at, entry, reward }) => {
          if (reward)
            return (
              <li key={`r${at}`} className="is-reward">
                <time>{timeFormat.format(at)}</time>
                <Gift size={20} weight="fill" aria-hidden="true" />
                <span>
                  <strong>集滿一張卡，選了「{reward.reward}」</strong>
                </span>
              </li>
            );
          const { icon: Mark, label } = stampLooks[entry!.kind];
          return (
            <li key={entry!.id} className={`is-${entry!.kind}${entry!.stamped ? "" : " is-rest"}`}>
              <time>{timeFormat.format(at)}</time>
              <Mark size={20} weight="fill" aria-label={label} />
              <span>
                <strong>{entry!.detail || label}</strong>
                {entry!.needsPractice ? <small>需要補強 {entry!.needsPractice} 題</small> : null}
                {entry!.note && <small>「{entry!.note}」</small>}
                {!entry!.stamped && <small>今天的章已經蓋滿，有記錄但沒有蓋章</small>}
              </span>
            </li>
          );
        })}
      </ul>
      {items.length > shown && (
        <button type="button" className="secondary-button" onClick={() => setShown(shown + 30)}>
          顯示更多
        </button>
      )}
    </>
  );
}

export function RewardsPanel({
  settings,
  onSettings,
  book,
  progress,
  onCheer,
  catalog,
  onAddTask,
  onRemoveTask,
}: {
  settings: RewardSettings;
  onSettings: (settings: RewardSettings) => void;
  book: StampBook;
  progress: CardProgress;
  onCheer: (stamp: StampInput) => void;
  catalog: readonly CatalogLesson[];
  onAddTask: (task: Omit<DailyTask, "id" | "at" | "doneAt">) => void;
  onRemoveTask: (id: string) => void;
}) {
  const profiles = useChildProfiles();
  const child = profiles.children.find((item) => item.id === profiles.activeId);
  // One child needs no name: 「孩子的卡」.
  const name =
    child && profiles.children.length > 1 ? childLabel(child, profiles) : child?.name || "孩子";
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  if (!settings.enabled)
    return (
      <div className="more-detail-content rewards-panel">
        <h1>集章卡</h1>
        <SetupGuide settings={settings} onDone={onSettings} />
      </div>
    );

  return (
    <div className="more-detail-content rewards-panel">
      <h1>集章卡</h1>
      <section className="reward-card-section">
        <h2>
          {profiles.children.length > 1 && child && <ChildAvatar child={child} />}
          {name}的卡
        </h2>
        <StampSlots progress={progress} />
        <p className="reward-summary">
          這張卡 {progress.filled} / {progress.size}
          {progress.redeemed > 0 && `，已經集滿 ${progress.redeemed} 張`}
          {profiles.children.length > 1 && "。要看其他孩子的卡，請在課程列表按「換人」。"}
        </p>
      </section>

      <DailyTasks book={book} catalog={catalog} onAdd={onAddTask} onRemove={onRemoveTask} />

      <section className="reward-cheer">
        <h2>送一個鼓勵章</h2>
        <p>看到孩子主動練習、認真訂正，都可以送一個章，寫一句話給他。</p>
        <div className="reward-add">
          <input
            value={note}
            maxLength={maxNoteLength}
            placeholder="例如：今天自己主動來練習！"
            aria-label="鼓勵的話"
            onChange={(event) => {
              setNote(event.target.value);
              setSent(false);
            }}
          />
          <button
            type="button"
            onClick={() => {
              onCheer({
                kind: "cheer",
                subject: "family",
                detail: "家長的鼓勵章",
                ...(note.trim() ? { note: note.trim() } : {}),
              });
              setNote("");
              setSent(true);
            }}
          >
            {stampLooks.cheer.label}
          </button>
        </div>
        {sent && (
          <p role="status" className="reward-sent">
            已經送出，{name}的卡上多了一個鼓勵章。
          </p>
        )}
      </section>

      <section>
        <h2>紀錄</h2>
        <StampLog book={book} />
      </section>

      <section className="reward-settings">
        <h2>設定</h2>
        <h3>獎勵</h3>
        <RewardChoices
          rewards={settings.rewards}
          onChange={(rewards) => onSettings({ ...settings, rewards })}
        />
        <Choice
          label="一張卡幾格"
          value={settings.cardSize}
          options={cardSizes}
          format={(value) => `${value} 格`}
          onChange={(cardSize) => onSettings({ ...settings, cardSize })}
        />
        <Choice
          label="一天最多"
          value={settings.dailyCap}
          options={dailyCaps}
          format={(value) => `${value} 個章`}
          onChange={(dailyCap) => onSettings({ ...settings, dailyCap })}
        />
        <h3>怎麼蓋章</h3>
        <ul className="reward-rules">
          {rules(settings).map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <button
          type="button"
          className="secondary-button reward-off"
          onClick={() => onSettings({ ...settings, enabled: false })}
        >
          <X size={18} weight="bold" aria-hidden="true" />
          停用集章卡
        </button>
        <p className="reward-note">停用後不會再蓋章，已經集到的章和紀錄都會保留。</p>
      </section>
    </div>
  );
}

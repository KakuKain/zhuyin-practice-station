import { useCallback, useState } from "react";
import { usePersistentState } from "../../lib/storage/usePersistentState";
import { childKey } from "../../lib/storage/child-profiles";
import { storageKeys } from "../../lib/storage/storage-keys";
import {
  addStamp,
  cardProgress,
  defaultRewardSettings,
  emptyStampBook,
  redeemCard,
  validateRewardSettings,
  validateStampBook,
  type CardProgress,
  type StampEntry,
  type StampInput,
} from "./stamp-book";

const readJson = (key: string) => (storage: Storage) =>
  JSON.parse(storage.getItem(key) ?? "null") as unknown;

/** The stamp just earned, shown to the child for a moment. */
export type StampNews = { entry: StampEntry; progress: CardProgress };

/**
 * The family's 集章卡 settings and the active child's stamp book. The app remounts per child, so
 * the book key is fixed for the life of this hook.
 */
export function useStampBook() {
  const [rewardSettings, saveRewardSettings, rewardSettingsError] = usePersistentState(
    storageKeys.rewardSettings,
    defaultRewardSettings,
    (storage) => validateRewardSettings(readJson(storageKeys.rewardSettings)(storage)),
    validateRewardSettings,
  );
  const [bookKey] = useState(() => childKey(storageKeys.stamps));
  const [stampBook, saveStampBook, stampBookError] = usePersistentState(
    bookKey,
    emptyStampBook,
    (storage) => validateStampBook(readJson(bookKey)(storage)),
    validateStampBook,
  );
  const [stampNews, setStampNews] = useState<StampNews | null>(null);

  /** Called when a practice is finished; does nothing while 集章卡 is off. */
  const awardStamp = useCallback(
    (input: StampInput) => {
      if (!rewardSettings.enabled) return;
      const result: { value: ReturnType<typeof addStamp> | null } = { value: null };
      saveStampBook((current) => {
        result.value = addStamp(current, rewardSettings, input);
        return result.value.book;
      });
      if (result.value?.entry)
        setStampNews({
          entry: result.value.entry,
          progress: cardProgress(result.value.book, rewardSettings),
        });
    },
    [rewardSettings, saveStampBook],
  );

  const chooseReward = useCallback(
    (reward: string) => saveStampBook((current) => redeemCard(current, rewardSettings, reward)),
    [rewardSettings, saveStampBook],
  );

  return {
    rewardSettings,
    saveRewardSettings,
    stampBook,
    stampProgress: cardProgress(stampBook, rewardSettings),
    stampStorageError: rewardSettingsError || stampBookError,
    awardStamp,
    chooseReward,
    stampNews,
    dismissStampNews: useCallback(() => setStampNews(null), []),
  };
}

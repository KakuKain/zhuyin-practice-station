import type { ListeningSeed, ListeningSettings } from "../types";
import { defaultListeningSettings, listeningSettingsStorageKey } from "../listening/listening-data";

export function validateListeningSettings(raw: unknown): ListeningSettings {
  const parsed = raw && typeof raw === "object" ? (raw as Partial<ListeningSettings>) : {};
  return {
    repeatCount:
      parsed.repeatCount === 1 || parsed.repeatCount === 2 || parsed.repeatCount === 3
        ? parsed.repeatCount
        : 2,
    intervalSeconds:
      parsed.intervalSeconds === 5 || parsed.intervalSeconds === 8 || parsed.intervalSeconds === 10
        ? parsed.intervalSeconds
        : 8,
    answerTime: parsed.answerTime === "relaxed" ? "relaxed" : "standard",
  };
}

export function listeningDuration(
  question: Pick<ListeningSeed, "answer" | "category">,
  settings: ListeningSettings,
) {
  const units = question.category === "words" ? question.answer.split("|").length : 1;
  const standard = Math.max(30, units * 12);
  return settings.answerTime === "relaxed" ? standard * 2 : standard;
}

export function readListeningSettings(storage: Storage): ListeningSettings {
  const stored = storage.getItem(listeningSettingsStorageKey);
  return stored ? validateListeningSettings(JSON.parse(stored)) : defaultListeningSettings;
}

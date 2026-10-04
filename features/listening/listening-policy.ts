import type { InkStroke, ListenPhase } from "../types";

export const listeningPhaseLabel = (phase: ListenPhase): string =>
  ({
    ready: "準備聽寫",
    active: "正在作答",
    review: "家長檢查",
    batch_review: "整輪檢查",
    remediation_offer: "待補強",
    choice: "選擇注音",
    retry_ready: "待重寫",
    retry: "重新作答",
  })[phase];

/** Protect an unfinished round even between questions or during parent review. */
export function needsListeningExitConfirmation(phase: ListenPhase, reviewedCount: number) {
  return phase !== "ready" || reviewedCount > 0;
}

export function isListeningAnswerComplete(answer: string, cells: readonly InkStroke[][]) {
  return cells.length === answer.split("|").length && cells.every((cell) => cell.length > 0);
}

import type { ListenPhase } from "../types";

export const listeningPhaseLabel = (phase: ListenPhase): string =>
  ({
    ready: "準備聽寫",
    active: "正在作答",
    review: "家長檢查",
    remediation_offer: "待補強",
    choice: "選擇注音",
    retry_ready: "待重寫",
    retry: "重新作答",
  })[phase];

/** Protect an unfinished round even between questions or during parent review. */
export function needsListeningExitConfirmation(phase: ListenPhase, reviewedCount: number) {
  return phase !== "ready" || reviewedCount > 0;
}

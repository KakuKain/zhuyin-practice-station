import type { RefObject } from "react";
import type { View, MorePanel, StateSetter } from "../types";
type Params = {
  view: View;
  fillParentChecked: boolean;
  hasFillDraft: boolean;
  persistFillRef: RefObject<() => void>;
  fillExitTarget: View | null;
  setFillExitTarget: StateSetter<View | null>;
  setMorePanel: StateSetter<MorePanel>;
  setView: StateSetter<View>;
  showLoading: (message: string) => void;
  clearListenTimers: () => void;
};
export function usePracticeNavigation({
  view,
  fillParentChecked,
  hasFillDraft,
  persistFillRef,
  fillExitTarget,
  setFillExitTarget,
  setMorePanel,
  setView,
  showLoading,
  clearListenTimers,
}: Params) {
  const navigate = (next: View) => {
    if (view === "fill" && next !== "fill" && !fillParentChecked && hasFillDraft) {
      persistFillRef.current();
      setFillExitTarget(next);
      return;
    }
    if (next !== "listen") clearListenTimers();
    if (next === "more") setMorePanel("home");
    if (next !== view) showLoading(next === "symbols" ? "正在準備注音…" : "正在開啟頁面…");
    setView(next);
  };

  const leaveFill = () => {
    if (!fillExitTarget) return;
    persistFillRef.current();
    const target = fillExitTarget;
    setFillExitTarget(null);
    if (target === "more") setMorePanel("home");
    setView(target);
  };
  return { navigate, leaveFill };
}

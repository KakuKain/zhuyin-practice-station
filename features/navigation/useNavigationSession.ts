import { useState } from "react";
import type { MorePanel, View } from "../types";

export function useNavigationSession(initial?: { view: View; lesson: number }) {
  const [view, setView] = useState<View>(initial?.view ?? "courses");
  const [selectedLesson, setSelectedLesson] = useState(initial?.lesson ?? 0);
  const [morePanel, setMorePanel] = useState<MorePanel>("home");
  return { view, setView, selectedLesson, setSelectedLesson, morePanel, setMorePanel };
}

import { useState } from "react";
import type { MorePanel, View } from "../types";

export function useNavigationSession() {
  const [view, setView] = useState<View>("courses");
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [morePanel, setMorePanel] = useState<MorePanel>("home");
  return { view, setView, selectedLesson, setSelectedLesson, morePanel, setMorePanel };
}

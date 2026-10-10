import { useEffect, useEffectEvent } from "react";

const guardState = { zhuyinBackGuard: true };
const hasGuard = () => Boolean((history.state as typeof guardState | null)?.zhuyinBackGuard);

/** Opened from the home screen: no browser buttons, so back should never close the app. */
export function isInstalledApp() {
  return (
    ["fullscreen", "standalone", "minimal-ui"].some(
      (mode) => window.matchMedia(`(display-mode: ${mode})`).matches,
    ) || (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * The system back gesture (or the browser's back button) returns to the previous screen of
 * the app instead of leaving the site mid-practice. One extra history entry absorbs each
 * back press and is restored right away. On the home screen an installed app stays open; in
 * an ordinary browser tab, back leaves the site as usual.
 */
export function useBackGesture(atHome: boolean, goBack: () => void) {
  const onPopState = useEffectEvent(() => {
    if (atHome && !isInstalledApp()) {
      history.back();
      return;
    }
    history.pushState(guardState, "");
    if (!atHome) goBack();
  });
  useEffect(() => {
    const listener = () => onPopState();
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);
  // Re-arm whenever the app leaves the home screen (or always, when installed).
  useEffect(() => {
    if (!hasGuard() && (!atHome || isInstalledApp())) history.pushState(guardState, "");
  }, [atHome]);
}

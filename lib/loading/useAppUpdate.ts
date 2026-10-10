import { useEffect, useEffectEvent, useRef } from "react";

const runningBuild = typeof __APP_BUILD__ === "undefined" ? "dev" : __APP_BUILD__;
const checkEveryMs = 30 * 60 * 1000;

/**
 * Home-screen apps have no reload button and GitHub Pages caches pages for minutes, so the app
 * checks version.json itself: when it opens, when it returns from the background and every
 * 30 minutes. A newer build is loaded only when `canReload` (the course list, where nothing is
 * being written). The new URL carries `?v=<build>`, which skips every cached copy of the page
 * and also stops a second reload if a stale copy were still served.
 */
export function useAppUpdate(canReload: boolean) {
  const latestBuild = useRef<string | null>(null);
  const apply = useEffectEvent(() => {
    const build = latestBuild.current;
    if (!build || !canReload) return;
    if (new URLSearchParams(location.search).get("v") === build) return;
    location.replace(`${location.pathname}?v=${encodeURIComponent(build)}`);
  });
  const check = useEffectEvent(async () => {
    if (runningBuild === "dev") return;
    try {
      const response = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const { build } = (await response.json()) as { build?: unknown };
      if (typeof build !== "string" || build === runningBuild) return;
      latestBuild.current = build;
      apply();
    } catch {
      // Offline or blocked: keep the running version.
    }
  });
  useEffect(() => {
    void check();
    const onVisibility = () => {
      if (!document.hidden) void check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(() => void check(), checkEveryMs);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, []);
  // An update found during writing waits until the child is back on the course list.
  useEffect(() => {
    apply();
  }, [canReload]);
}

import { useEffect } from "react";
import { alreadyRequested, checkForUpdate, loadLatestVersion, useUpdateStatus } from "./app-update";

const checkEveryMs = 30 * 60 * 1000;

/**
 * Home-screen apps have no reload button and GitHub Pages caches pages for minutes, so the app
 * checks version.json itself: when it opens, when it returns from the background and every
 * 30 minutes. A newer build loads by itself only when `canReload` (the course list, where
 * nothing is being written); elsewhere the shell shows a reminder with 現在更新.
 */
export function useAppUpdate(canReload: boolean) {
  const { status, latestBuild } = useUpdateStatus();
  useEffect(() => {
    void checkForUpdate();
    const onVisibility = () => {
      if (!document.hidden) void checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(() => void checkForUpdate(), checkEveryMs);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (status === "available" && latestBuild && canReload && !alreadyRequested(latestBuild))
      loadLatestVersion();
  }, [status, latestBuild, canReload]);
}

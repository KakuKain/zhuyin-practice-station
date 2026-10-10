import { useSyncExternalStore } from "react";

/** The build this page runs; vite.config.ts compiles it in and publishes it as version.json. */
export const runningBuild = typeof __APP_BUILD__ === "undefined" ? "dev" : __APP_BUILD__;
export const runningBuildDate = typeof __APP_BUILD_DATE__ === "undefined" ? "" : __APP_BUILD_DATE__;

export type UpdateStatus = "idle" | "checking" | "current" | "available" | "offline";
export type UpdateState = {
  status: UpdateStatus;
  latestBuild: string | null;
  checkedAt: number | null;
};

let state: UpdateState = { status: "idle", latestBuild: null, checkedAt: null };
const listeners = new Set<() => void>();
const update = (next: Partial<UpdateState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => state;

/** One shared state for the automatic check, the reminder and the 版本 panel. */
export const useUpdateStatus = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/** Compare with the live version.json, bypassing the browser and Pages caches. */
export async function checkForUpdate() {
  if (runningBuild === "dev") {
    update({ status: "current", checkedAt: Date.now() });
    return;
  }
  if (state.status === "checking") return;
  update({ status: "checking" });
  try {
    const response = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    const { build } = (await response.json()) as { build?: unknown };
    if (typeof build !== "string") throw new Error("version.json without a build");
    update({
      status: build === runningBuild ? "current" : "available",
      latestBuild: build,
      checkedAt: Date.now(),
    });
  } catch {
    update({ status: "offline", checkedAt: Date.now() });
  }
}

/**
 * Open the newest version. The `?v=` query is a URL no cache has seen, so the page and its
 * new script names come straight from GitHub Pages.
 */
export function loadLatestVersion() {
  const target = state.latestBuild ?? `reload-${Date.now()}`;
  location.replace(`${location.pathname}?v=${encodeURIComponent(target)}`);
}

/** True once this page already tried to open `build`, so a stale copy cannot loop reloads. */
export const alreadyRequested = (build: string) =>
  new URLSearchParams(location.search).get("v") === build;

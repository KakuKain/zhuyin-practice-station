import { useSyncExternalStore } from "react";

/**
 * The answer font draws zhuyin in place of Han characters (ㄏㄨˊ is the glyph of 蝴). Until it
 * has loaded, the browser would show those characters instead, so callers spell zhuyin out.
 * A failed load counts as not ready (WebKit's `fonts.check` reports a failed face as usable).
 */
const family = "KidLessonYoOnly";
let ready = false;
let started = false;
const listeners = new Set<() => void>();

const answerFace = () =>
  [...document.fonts].find((face) => face.family.replace(/["']/g, "") === family);

function update() {
  if (ready) return;
  const face = answerFace();
  // Spelled-out zhuyin never uses this font, so nothing else would ask the browser to load it.
  if (face?.status === "unloaded") void face.load().then(update, () => undefined);
  if (face?.status !== "loaded") return;
  ready = true;
  for (const listener of listeners) listener();
}

function start() {
  if (started || typeof document === "undefined" || !document.fonts) return;
  started = true;
  document.fonts.addEventListener("loadingdone", update);
  void document.fonts.ready.then(update);
  update();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

/** Static rendering (unit tests) has no font loading, so it assumes the font. */
export function useAnswerFontReady() {
  return useSyncExternalStore(
    subscribe,
    () => ready,
    () => true,
  );
}

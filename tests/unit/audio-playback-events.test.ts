import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useAudioPlayer } from "../../lib/audio/useAudioPlayer";

let windowDescriptor: PropertyDescriptor | undefined;
beforeEach(() => {
  windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { setTimeout: () => 1, clearTimeout() {} },
  });
});
afterEach(() => {
  if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
  else Reflect.deleteProperty(globalThis, "window");
});

function playerWithAudio(play: () => Promise<void>) {
  let player!: ReturnType<typeof useAudioPlayer>;
  // Supply React's refs without a DOM; verify the real audio lifecycle callbacks.
  function Harness() {
    player = useAudioPlayer({
      view: "practice",
      lessonSymbols: [],
      sessionQuestions: [],
      playbackEndedRef: { current() {} },
      setPracticeNotice() {},
      onStopRepeat() {},
      getCustomRecording: async () => null,
    });
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  player.playbackRef.current = {
    pause() {},
    play,
    currentTime: 0,
    dataset: {},
  } as unknown as HTMLAudioElement;
  return player;
}
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

test("the active-sound callback waits for actual playback and ends with the clip", async () => {
  let start!: () => void;
  const gate = new Promise<void>((resolve) => (start = resolve));
  const player = playerWithAudio(() => gate);
  const events: string[] = [];
  player.speak("ㄤ", {
    onStarted: () => events.push("started"),
    onEnded: () => events.push("ended"),
  });
  await settle();
  assert.deepEqual(events, []);
  start();
  await settle();
  assert.deepEqual(events, ["started"]);
  player.finishPlayback();
  assert.deepEqual(events, ["started", "ended"]);
  player.stopPlayback();
});

test("a canceled pending play cannot highlight a sound or call the old completion", async () => {
  let start!: () => void;
  const gate = new Promise<void>((resolve) => (start = resolve));
  const player = playerWithAudio(() => gate);
  const events: string[] = [];
  player.speak("ㄤ", {
    onStarted: () => events.push("started"),
    onEnded: () => events.push("ended"),
  });
  await settle();
  player.stopPlayback();
  start();
  await settle();
  player.finishPlayback();
  assert.deepEqual(events, []);
  player.stopPlayback();
});

test("failed playback clears preview state through its error callback without starting", async () => {
  const player = playerWithAudio(() => Promise.reject(new Error("unavailable clip")));
  const events: string[] = [];
  player.speak("ㄤ", {
    allowSynthesis: false,
    onStarted: () => events.push("started"),
    onEnded: () => events.push("ended"),
    onError: () => events.push("failed"),
  });
  await settle();
  assert.deepEqual(events, ["failed"]);
  player.stopPlayback();
});

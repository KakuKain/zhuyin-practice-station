import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FillPositionMap } from "../../features/fill/FillPositionPeek";
import { exercises } from "../../features/courses/course-data";
import { soundPairs, makeSoundRound } from "../../features/sound-practice/sound-practice-data";
import { listeningAudioUrl } from "../../features/listening/listening-data";
import { SoundPractice } from "../../features/sound-practice/SoundPractice";
import { createPositionHold } from "../../features/fill/position-hold";

test("position peek closes on release/cancel and ignores unrelated pointers or keys", () => {
  const changes: boolean[] = [];
  const hold = createPositionHold((value) => changes.push(value));
  assert.equal(hold.pointerDown(5), true);
  assert.equal(hold.pointerDown(6), false);
  hold.pointerUp(6);
  assert.deepEqual(changes, [true]);
  hold.pointerUp(5);
  assert.deepEqual(changes, [true, false]);
  hold.keyDown(" ");
  hold.keyDown(" ");
  hold.keyUp("Enter");
  assert.deepEqual(changes, [true, false, true]);
  hold.keyUp(" ");
  hold.pointerDown(7);
  hold.cancel();
  hold.pointerUp(7);
  hold.keyDown("Enter");
  hold.keyDown("Escape");
  assert.deepEqual(changes, [true, false, true, false, true, false, true, false]);
});

test("position maps cover every lesson, highlight one slot and never receive answers", () => {
  for (const lesson of Object.values(exercises)) {
    const lengths = lesson.lines.map((line) => line.length);
    const activeCell = lengths.reduce((a, b) => a + b, 0) - 1;
    const html = renderToStaticMarkup(
      createElement(FillPositionMap, {
        lineLengths: lengths,
        activeCell,
        strokes: {},
        pending: {},
      }),
    );
    assert.match(html, /dir="rtl"/);
    assert.equal((html.match(/aria-current="location"/g) ?? []).length, 1);
    assert.equal((html.match(/class="fill-position-cell/g) ?? []).length, activeCell + 1);
    assert.doesNotMatch(html, /[\u3105-\u3129]/);
    assert.doesNotMatch(html, /<button/);
  }
});

test("position peek shows child ink, with explicit empty pending overriding saved ink", () => {
  const stroke = [
    [
      { x: 12, y: 23 },
      { x: 45, y: 67 },
    ],
  ];
  const html = renderToStaticMarkup(
    createElement(FillPositionMap, {
      lineLengths: [2, 1],
      activeCell: 1,
      strokes: { 0: stroke, 1: stroke },
      pending: { 1: [] },
    }),
  );
  assert.equal((html.match(/<polyline/g) ?? []).length, 1);
  assert.match(html, /points="12,23 45,67"/);
  assert.match(html, /第 1 行第 2 格，正在寫這格/);
});

test("six-item sound rounds have equal exposure and variable answer positions", () => {
  let seed = 13;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const round = makeSoundRound(random);
  assert.equal(round.length, 6);
  assert.equal(round.filter((q) => q.target === 0).length, 3);
  for (const question of round) assert.deepEqual([...question.order].sort(), [0, 1]);
  assert.ok(new Set(round.map((q) => q.order[0])).size > 1);
  assert.notDeepEqual(
    round.map((q) => q.target),
    [0, 1, 0, 1, 0, 1],
  );
});

test("every contrast uses existing clips; second/third tone retains the same syllable", () => {
  for (const pair of soundPairs) {
    for (const sound of pair.sounds) {
      const path = listeningAudioUrl(sound.audioText).split("?")[0];
      assert.ok(existsSync(new URL(`../../public/${path}`, import.meta.url)), path);
    }
  }
  const tone = soundPairs.find((p) => p.id === "tone-2-3")!;
  assert.equal(
    tone.sounds[0].label.replace(/[ˊˇ]/g, ""),
    tone.sounds[1].label.replace(/[ˊˇ]/g, ""),
  );
  assert.ok(soundPairs.find((p) => p.id === "chi-ci"));
  assert.equal(new Set(soundPairs.map((p) => p.id)).size, soundPairs.length);
  for (const pair of soundPairs) assert.notEqual(pair.sounds[0].label, pair.sounds[1].label);
  // The nasal endings parents asked for, including the combined rhymes.
  for (const id of ["en-eng", "in-ing", "uen-ueng", "shi-si", "o-ou"])
    assert.ok(
      soundPairs.find((p) => p.id === id),
      id,
    );
});

test("short practice opens with pair choice, no timer, canvas or automatic answer", () => {
  const html = renderToStaticMarkup(
    createElement(SoundPractice, {
      audio: { speak() {}, stopPlayback() {}, audioError: false, audioLoading: false },
      onBack() {},
    }),
  );
  assert.match(html, /一次分辨兩個音，不用寫字、不計時/);
  assert.match(html, /二聲 \/ 三聲/);
  assert.doesNotMatch(html, /<canvas|倒數/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { createElement, createRef, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnswerDisplay } from "../../components/Zhuyin";
import { ListeningCanvas } from "../../features/listening/ListeningCanvas";
import { ListeningResult } from "../../features/listening/ListeningResult";

test("result distinguishes answered units, parent-confirmed correct units and pending questions", () => {
  const app: ComponentProps<typeof ListeningResult>["app"] = {
    completedFillLessons: [],
    lessonNumber: "四",
    selectedLesson: 3,
    sessionAnsweredUnits: 14,
    sessionWritingUnits: 14,
    sessionScore: { listeningCorrect: 11 },
    pendingSessionCount: 1,
    openListening() {},
    setView() {},
  };
  const html = renderToStaticMarkup(createElement(ListeningResult, { app }));
  assert.match(html, /本輪已作答 14 \/ 14 格/);
  assert.match(html, /家長判定答對 11 \/ 14 格/);
  assert.match(html, /待補強：1 題/);
  assert.match(html, /未進行默寫/);
});

test("two to five character canvases retain sequential labels and per-character clear controls", () => {
  for (const wordLength of [2, 3, 4, 5]) {
    const app: ComponentProps<typeof ListeningCanvas>["app"] = {
      beginDrawing() {},
      canvasRef: createRef<HTMLCanvasElement>(),
      clearWordCanvas() {},
      clearListeningCell() {},
      listeningEraserCell: null,
      listeningUndoAvailable: Array(wordLength).fill(true),
      listeningInkNotice: "已復原，可以繼續寫。",
      toggleListeningEraser() {},
      undoListeningInk() {},
      draw() {},
      endDrawing() {},
      isWordQuestion: true,
      listenPhase: "active",
      replayQuestion() {},
      startRetryWriting() {},
      wordCanvasRefs: { current: [] },
      wordInk: Array(wordLength).fill(true),
      wordLength,
    };
    const html = renderToStaticMarkup(createElement(ListeningCanvas, { app }));
    assert.match(html, /class="word-canvas-stack" dir="rtl" role="group"/);
    assert.doesNotMatch(html, /tabindex="0"/);
    assert.ok(html.includes(`style="--word-count:${wordLength}"`));
    assert.equal((html.match(/<canvas /g) ?? []).length, wordLength);
    assert.match(
      html,
      /<p class="ink-status" role="status" aria-atomic="true">已復原，可以繼續寫。<\/p>/,
    );
    assert.ok(html.indexOf("ink-status") > html.lastIndexOf("</canvas>"));
    assert.doesNotMatch(html, /關閉提示/);
    const indices = Array.from(html.matchAll(/data-word-index="(\d)"/g), (match) =>
      Number(match[1]),
    );
    assert.deepEqual(
      indices,
      Array.from({ length: wordLength }, (_, index) => index),
    );
    for (let index = 1; index <= wordLength; index++) {
      assert.ok(html.includes(`aria-label="圈選擦除語詞第 ${index} 字"`));
      assert.ok(html.includes(`aria-label="復原語詞第 ${index} 字筆跡"`));
      assert.ok(html.includes(`aria-label="清空語詞第 ${index} 字"`));
      assert.ok(html.includes(`aria-label="語詞第 ${index} 字田字格手寫區"`));
    }
    // Each tool rail is a sibling before the paper, never a canvas overlay.
    assert.equal((html.match(/class="word-canvas-row"/g) ?? []).length, wordLength);
    assert.equal((html.match(/class="word-canvas-tools"/g) ?? []).length, wordLength);
    assert.equal(
      (html.match(/<\/button><\/div><\/div><div class="canvas-paper word-paper"><canvas/g) ?? [])
        .length,
      wordLength,
    );
  }
});

test("word answers retain each syllable and their RTL order", () => {
  for (const length of [2, 3, 4, 5]) {
    const html = renderToStaticMarkup(
      createElement(AnswerDisplay, { answer: Array(length).fill("ㄅㄠˇ").join("|") }),
    );
    assert.match(html, /class="answer-display is-word" dir="rtl"/);
    assert.equal((html.match(/class="zhuyin-stack"/g) ?? []).length, length);
  }
});

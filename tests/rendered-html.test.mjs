import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the public zhuyin practice station", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>一年級注音練習站｜注音小練習<\/title>/);
  assert.match(html, /注音小練習/);
  assert.doesNotMatch(html, /<span class="eyebrow">一年級注音練習<\/span>|開心練習|打好基礎/);
  assert.doesNotMatch(html, /課文默寫・聽寫/);
  assert.match(html, /貓咪/);
  assert.match(html, /鵝寶寶/);
  assert.match(html, /河馬和河狸/);
  assert.match(html, /不用登入也能練/);
});

test("the source keeps the handoff interaction vocabulary", async () => {
  const page = await (await import("node:fs/promises")).readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await (await import("node:fs/promises")).readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /ListenPhase = \"ready\" \| \"active\"/);
  assert.match(page, /開始聽/);
  assert.match(page, /需要補強/);
  assert.match(css, /touch-action: none/);
  assert.match(page, /ㄧ/);
  assert.match(page, /dir="rtl"/);
  assert.match(page, /貓咪弟弟跑第一|character: "跑"/);
  assert.doesNotMatch(page, /className="practice-title"|className="fill-progress"/);
  assert.match(page, /zhuyin: "˙ㄉㄧ"/);
  assert.match(page, /提早交卷/);
  assert.match(page, /canvas-replay-overlay/);
  assert.match(page, /fillCanvasRef/);
  assert.match(page, /onPointerDown=\{beginFillDrawing\}/);
  assert.match(page, /onPointerMove=\{moveFillDrawing\}/);
  assert.match(page, /onPointerUp=\{endFillDrawing\}/);
  assert.match(page, /<InkPreview strokes=\{fillStrokes\[index\]\}/);
  assert.match(page, /setFillReviewOpen\(true\)/);
  assert.match(page, /先寫完整篇，再請家長對照答案/);
  assert.match(page, /家長檢查完成/);
  assert.match(page, /需要重寫/);
  assert.match(page, /fillNeedsRetry\.includes\(activeFillCell\) \? \[\] : fillStrokes\[activeFillCell\]/);
  assert.doesNotMatch(page, /beginCardDrag|placeFillAnswer|draggable=\{false\}/);
  assert.doesNotMatch(page, /document\.elementFromPoint/);
  assert.match(page, /再播放一次題目/);
  assert.match(page, /"貓咪弟弟", "跑第一"/);
  assert.match(page, /"孵出", "五隻鵝寶寶"/);
  assert.match(page, /"喔", "河狸", "忙著築巢"/);
  assert.match(page, /symbols: \["ㄅ", "ㄆ", "ㄇ", "ㄉ", "ㄧ", "ㄠ"\]/);
  assert.match(page, /symbols: \["ㄈ", "ㄏ", "ㄓ", "ㄔ", "ㄨ", "ㄚ", "ㄜ"\]/);
  assert.match(page, /symbols: \["ㄌ", "ㄑ", "ㄗ", "ㄩ", "ㄛ", "ㄢ", "ㄤ"\]/);
  assert.doesNotMatch(page, /兩種方式，自己選一個開始|看直式注音格，把缺少的音節拖回去|聽聲音、自由手寫，最後交給家長判定/);
  assert.match(page, /lesson-symbols" dir="rtl"/);
  assert.match(css, /BpmfZihiSans-Regular\.ttf/);
  assert.match(css, /BpmfZihiOnly-R\.ttf/);
  assert.match(page, /國字＋注音/);
  assert.match(page, /純注音/);
  assert.match(page, /setPreviewMode\("annotated"\)/);
  assert.match(page, /\\u\{E01E1\}/);
  assert.match(page, /1: \{ 5: \{ 4: "\\u\{E01E1\}" \} \}/);
  assert.match(page, /完成這格/);
  assert.match(css, /lesson-text-lines\.is-zhuyin-only/);
  assert.match(css, /object-fit: cover/);
  assert.match(css, /\.text-button \{ display: inline-flex; flex: none/);
  assert.match(css, /\.lesson-page \.mode-grid \{ display: grid; grid-template-columns: repeat\(2/);
  assert.doesNotMatch(page, /className="focus-intro"/);
});

test("all three lessons have three listening sections with four writing units each", async () => {
  const page = await (await import("node:fs/promises")).readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await (await import("node:fs/promises")).readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /const secondLessonLines = \[/);
  assert.match(page, /const thirdLessonLines = \[/);
  assert.match(page, /character: "寶", zhuyin: "˙ㄅㄠ"/);
  assert.match(page, /character: "築", zhuyin: "ㄓㄨˊ"/);
  assert.match(page, /character: "著", zhuyin: "˙ㄓㄜ"/);
  assert.match(page, /1: \{ lines: secondLessonLines, questions: secondListeningQuestions \}/);
  assert.match(page, /2: \{ lines: thirdLessonLines, questions: thirdListeningQuestions \}/);
  assert.match(page, /const exercise = exercises\[selectedLesson\]/);
  assert.match(page, /const listeningQuestions = sessionQuestions/);
  assert.match(page, /第三課", lessons\[2\]\.title, "默寫 · 聽寫"/);
  for (const lesson of ["first", "second", "third"]) {
    const questions = page.match(new RegExp(`const ${lesson}ListeningQuestions = \\[([\\s\\S]*?)\\] as const;`))?.[1];
    assert.ok(questions, `${lesson} listening questions exist`);
    assert.equal((questions.match(/category: "symbols"/g) ?? []).length, 4);
    assert.equal((questions.match(/category: "characters"/g) ?? []).length, 4);
    assert.equal((questions.match(/category: "words"/g) ?? []).length, 2);
    assert.equal((questions.match(/category: "words", answer: "[^"]+\|[^"]+"/g) ?? []).length, 2);
  }
  assert.match(page, /第一大題 · 注音符號/);
  assert.match(page, /第二大題 · 生字/);
  assert.match(page, /第三大題 · 語詞/);
  assert.match(page, /word-grid-guide/);
  assert.match(css, /\.canvas-zone\.is-word \.canvas-paper/);
  assert.match(page, /legacySavedQuestionIndexes/);
  assert.match(page, /lesson\.symbols\.map\(\(symbol\) =>/);
  assert.match(page, /new Map\(exercise\.lines\.flat\(\)\.map/);
  assert.match(page, /shuffleItems\(pools\.symbols\)\.slice\(0, 4\)/);
  assert.match(page, /shuffleItems\(pools\.characters\)\.slice\(0, 4\)/);
  assert.match(page, /shuffleItems\(pools\.words\)\.slice\(0, 2\)/);
  assert.match(page, /choices: shuffleItems\(\[seed\.answer, \.\.\.seed\.distractors\]\)/);
  assert.match(page, /questionId: id/);
  assert.match(page, /firstPracticeStorageKey/);
  assert.doesNotMatch(page, /第二課先讀課文與注音符號|lessons\[1\]\.title, "閱讀課文"/);
  assert.match(page, /listeningCorrect: current\.listeningCorrect \+ currentQuestion\.answer\.split\("\|"\)\.length/);
  assert.match(page, /三大題 · \{sessionScore\.listeningCorrect\} \/ 12 格完成/);
});

test("parent review, listening preferences, and deferred reinforcement remain available", async () => {
  const page = await (await import("node:fs/promises")).readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /ListeningSettings = \{ repeatCount: 1 \| 2 \| 3; intervalSeconds: 5 \| 8 \| 10 \}/);
  assert.match(page, /listeningSettingsStorageKey/);
  assert.match(page, /listenPhase === "ready" \? <div className="listen-ready-card"/);
  assert.match(page, /repeatPlaybacks = Array\.from/);
  assert.match(page, /needsPractice: true/);
  assert.match(page, /現在補強/);
  assert.match(page, /稍後再練/);
  assert.match(page, /markQuestionPracticed\(selectedLesson, currentQuestion\.id\)/);
});

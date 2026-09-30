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
  assert.match(html, /笑嘻嘻/);
  for (const title of ["翹翹板", "謝謝老師", "龜兔賽跑", "拔蘿蔔", "動物狂歡會"]) assert.match(html, new RegExp(title));
  assert.match(html, /不用登入也能練/);
  assert.match(html, /選擇課程/);
  assert.match(html, /class="journey-footer"/);
  assert.doesNotMatch(html, /id="course-lesson-7" hidden/);
  assert.match(html, /主要導覽/);
  assert.doesNotMatch(html, /首頁/);
});

test("individual Zhuyin prompts use the official clips at a gentler playback rate", async () => {
  const fs = await import("node:fs/promises");
  const page = await fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const generator = await fs.readFile(new URL("../scripts/generate-listening-audio.mjs", import.meta.url), "utf8");
  const symbols = [..."ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ"];
  assert.equal(symbols.length, 37);
  assert.match(generator, /officialAudioBase.*language\.moe\.gov\.tw/);
  assert.match(generator, /F\$\{officialIndex \+ 1\}\.WAV/);
  assert.match(page, /audio\.playbackRate = isZhuyinPrompt \? 0\.84 : 1/);
  assert.match(page, /\?v=44/);
  for (const symbol of symbols) {
    const filename = symbol.codePointAt(0).toString(16);
    const clip = await fs.stat(new URL(`../public/listening-audio/${filename}.m4a`, import.meta.url));
    assert.ok(clip.size > 1024, `${symbol} has a bundled audio clip`);
  }
});

test("the public changelog uses one SemVer beta release", async () => {
  const fs = await import("node:fs/promises");
  const page = await fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const pkg = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(await fs.readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  assert.equal(pkg.version, "0.1.0-beta.1");
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[""].version, pkg.version);
  assert.match(page, /\["0\.1\.0-beta\.1", "首個公開測試版"/);
  assert.doesNotMatch(page, /\[44, "注音讀音更清楚"/);
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
  assert.match(page, /fillNeedsRetry\.includes\(activeFillCell!\) \? \[\] : fillStrokes\[activeFillCell!\]/);
  assert.doesNotMatch(page, /beginCardDrag|placeFillAnswer|draggable=\{false\}/);
  assert.doesNotMatch(page, /document\.elementFromPoint/);
  assert.match(page, /再播放一次題目/);
  assert.match(page, /"貓咪弟弟", "跑第一"/);
  assert.match(page, /"孵出", "五隻鵝寶寶"/);
  assert.match(page, /"喔", "河狸", "忙著築巢"/);
  assert.match(page, /symbols: \["ㄅ", "ㄆ", "ㄇ", "ㄉ", "ㄧ", "ㄠ"\]/);
  assert.match(page, /symbols: \["ㄈ", "ㄏ", "ㄓ", "ㄔ", "ㄨ", "ㄚ", "ㄜ"\]/);
  assert.match(page, /symbols: \["ㄌ", "ㄑ", "ㄗ", "ㄩ", "ㄛ", "ㄢ", "ㄤ"\]/);
  assert.match(page, /symbols: \["ㄒ", "ㄕ", "ㄟ", "ㄡ", "ㄦ", "ㄧㄠ", "ㄨㄢ"\]/);
  assert.match(page, /\["ㄏㄟ", "ㄧㄛ", "ㄏㄟ", "ㄧㄛ"\]/);
  assert.match(page, /return <div className="lesson-text-line" dir="ltr" key=\{lineIndex\}>\{Array\.from\(line\)\.map\(\(char, charIndex\) => <span key=\{charIndex\}>/);
  assert.doesNotMatch(page, /chantZhuyin|lesson-ruby-fix|lesson-zhuyin-fix/);
  assert.doesNotMatch(page, /selectedLesson === 7 && char === "喲"/);
  assert.doesNotMatch(page, /兩種方式，自己選一個開始|看直式注音格，把缺少的音節拖回去|聽聲音、自由手寫，最後交給家長判定/);
  assert.match(page, /lesson-symbols" dir="rtl"/);
  assert.match(css, /\.lesson-text-lines::after \{[^}]*linear-gradient\(to bottom, rgba\(255, 254, 251, 0\), #fffefb 93%\)/);
  assert.match(css, /\.lesson-symbols \{[^}]*background: transparent;/);
  assert.match(css, /\.lesson-meadow-footer::before \{[^}]*linear-gradient\(to bottom, #fffefb 0%/);
  assert.match(page, /event\.type === "pointerup" && fillActiveStrokeRef\.current\?\.length/);
  assert.match(page, /writeFillDraft\(\{ version: 1, lessonIndex: selectedLesson, savedAt: Date\.now\(\), strokes: next, pendingCells: pending, needsRetry: remainingRetry, reviewOpen: false \}\)/);
  assert.match(css, /BpmfZihiSans-Regular\.ttf/);
  assert.match(css, /BpmfZihiOnly-R\.ttf/);
  assert.match(css, /font-family: "KidLessonYoSans", "BpmfZihiSans"/);
  assert.match(css, /font-family: "KidLessonYoOnly", "BpmfZihiOnly"/);
  assert.match(css, /KidLessonYoSans\.woff2/);
  assert.match(css, /KidLessonYoOnly\.woff2/);
  for (const fileName of ["KidLessonYoSans.woff2", "KidLessonYoOnly.woff2"]) {
    const font = await (await import("node:fs/promises")).readFile(new URL(`../public/fonts/${fileName}`, import.meta.url));
    assert.equal(font.toString("ascii", 0, 4), "wOF2");
  }
  assert.match(page, /國字＋注音/);
  assert.match(page, /純注音/);
  assert.match(page, /setPreviewMode\("annotated"\)/);
  assert.match(page, /"--preview-max-chars": Math\.max\(\.\.\.lesson\.lines\.map/);
  assert.match(page, /className="lesson-page-counter" aria-live="polite">第 \{previewPage \+ 1\} \/ \{previewPageCount\} 頁/);
  assert.match(page, /\\u\{E01E1\}/);
  assert.match(page, /1: \{ 5: \{ 4: "\\u\{E01E1\}" \} \}/);
  assert.match(page, /完成這格/);
  assert.match(css, /lesson-text-lines\.is-zhuyin-only/);
  assert.match(css, /\.lesson-page-dots \{ display: flex; flex-direction: row-reverse;/);
  assert.match(css, /object-fit: cover/);
  assert.match(css, /\.text-button \{ display: inline-flex; flex: none/);
  assert.match(css, /\.lesson-page \.mode-grid \{ display: grid; grid-template-columns: repeat\(2/);
  assert.doesNotMatch(page, /className="focus-intro"/);
});

test("handwriting and listening exits use the watercolor in-app warning", async () => {
  const fs = await import("node:fs/promises");
  const page = await fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await fs.readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.doesNotMatch(page, /window\.confirm\(/);
  assert.match(page, /setListenExitOpen\(true\)/);
  assert.match(page, /if \(listenExitOpen \|\| \(listenPhase !== "active"/);
  assert.match(page, /role="alertdialog" aria-modal="true" aria-labelledby="listen-exit-title"/);
  assert.match(page, /倒數已暫停/);
  assert.match(page, /setFillPracticeExitOpen\(true\)/);
  assert.match(css, /\.is-lesson \.app-header \.logo-mark \{ width: 29px; height: 29px/);
  assert.match(css, /\.is-fill \.zhuyin-sheet \{ overflow: visible; \}/);
  assert.match(css, /\.is-fill \.fill-pencil-art \{[^}]*bottom: -56px/);
});

test("fill mistakes stay in a separate collection until a parent removes them", async () => {
  const page = await (await import("node:fs/promises")).readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /zhuyin-fill-favorites-v1/);
  assert.match(page, /function validatedFillFavorites/);
  assert.match(page, /fillFavoriteKey\(item: Pick<FillFavorite, "lessonIndex" \| "character" \| "zhuyin">\)/);
  assert.match(page, /onClick=\{\(\) => markFillRetry\(index\)\}/);
  assert.match(page, /status: "review_later"/);
  assert.match(page, /課文默寫 · 錯字收藏/);
  assert.match(page, /正確答案會在下一頁顯示/);
  assert.match(page, /已掌握 · 移出收藏/);
  assert.match(page, /稍後再練，保留收藏/);
  assert.match(page, /聽寫 · 待補強與收藏/);
});

test("all lessons retain three listening sections and complete circled-word writing", async () => {
  const page = await (await import("node:fs/promises")).readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await (await import("node:fs/promises")).readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /const secondLessonLines = \[/);
  assert.match(page, /const thirdLessonLines = \[/);
  assert.match(page, /const fourthLessonLines = \[/);
  assert.match(page, /character: "寶", zhuyin: "˙ㄅㄠ"/);
  assert.match(page, /character: "築", zhuyin: "ㄓㄨˊ"/);
  assert.match(page, /character: "著", zhuyin: "˙ㄓㄜ"/);
  assert.match(page, /1: \{ lines: secondLessonLines, questions: secondListeningQuestions \}/);
  assert.match(page, /2: \{ lines: thirdLessonLines, questions: thirdListeningQuestions \}/);
  assert.match(page, /3: \{ lines: fourthLessonLines, questions: fourthListeningQuestions \}/);
  assert.match(page, /lines: \["背著書包", "手拉手", "背著書包", "笑嘻嘻", "一二一", "好歡喜"\]/);
  assert.match(page, /3: \{ 0: \{ 0: "\\u\{E01E1\}" \}, 2: \{ 0: "\\u\{E01E1\}" \} \}/);
  assert.match(page, /const exercise = exercises\[selectedLesson\]/);
  assert.match(page, /const listeningQuestions = sessionQuestions/);
  assert.match(page, /lessons\.map\(\(item, index\) =>/);
  assert.match(page, /practiceState\.recentLesson === index/);
  assert.match(page, /courseArtwork\[index\]/);
  for (const lesson of ["first", "second", "third", "fourth"]) {
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
  assert.match(page, /word-canvas-stack/);
  assert.match(page, /data-word-index=\{index\}/);
  assert.match(css, /\.canvas-zone\.is-word \.canvas-paper.*aspect-ratio: 1/);
  assert.match(page, /legacySavedQuestionIndexes/);
  assert.match(page, /lesson\.symbols\.map\(\(symbol\) =>/);
  assert.match(page, /const terms = circledVocabulary\[lessonIndex\]/);
  assert.match(page, /const seenCharacters = new Map/);
  assert.match(page, /shuffleItems\(pools\.symbols\)\.slice\(0, 4\)/);
  assert.match(page, /shuffleItems\(pools\.characters\)\.slice\(0, 4\)/);
  assert.match(page, /shuffleItems\(pools\.words\)\.slice\(0, 2\)/);
  assert.match(page, /choices: shuffleItems\(\[seed\.answer, \.\.\.seed\.distractors\]\)/);
  assert.match(page, /questionId: id/);
  assert.match(page, /firstPracticeStorageKey/);
  assert.doesNotMatch(page, /第二課先讀課文與注音符號|lessons\[1\]\.title, "閱讀課文"/);
  assert.match(page, /listeningCorrect: current\.listeningCorrect \+ currentQuestion\.answer\.split\("\|"\)\.length/);
  assert.match(page, /三大題 · \{sessionScore\.listeningCorrect\} \/ \{sessionWritingUnits\} 格完成/);
  assert.match(page, /Array\.from\(\{ length: wordLength \}/);
  assert.match(page, /useState<View>\("courses"\)/);
  assert.doesNotMatch(page, /showAllCourses|hidden=\{!showAllCourses/);
  assert.doesNotMatch(page, /journey-break|showAllCourses/);
  assert.match(page, /className="journey-footer"/);
  assert.match(page, /course-flag-grass-v1\.png/);
  assert.match(css, /course-card-paper-v1\.png/);
  assert.doesNotMatch(page, /renderHome|id: "home" as View/);
  assert.match(css, /\.bottom-nav \{ grid-template-columns: repeat\(3, 1fr\)/);
});

test("each lesson draws only from its teacher-selected circled vocabulary", async () => {
  const { circledVocabulary } = await import("../app/circled-vocabulary.ts");
  const expected = [
    ["逼", "貓咪", "弟弟", "跑第一"],
    ["哈", "孵出", "五隻", "鵝媽媽", "好得意"],
    ["半路", "忙著", "築巢", "河狸", "泡澡"],
    ["笑嘻嘻", "背書包", "手拉手", "一二一", "好歡喜"],
    ["朋友", "上下", "高低", "好像", "小鳥", "翹翹板"],
    ["也", "謝謝", "讀書", "送老師", "一朵紅花", "教我畫畫"],
    ["烏龜", "兔子", "領先", "落後", "睡午覺", "看誰跑得快", "跟在後面追"],
    ["菜園", "黃牛", "浣熊", "嘿喲", "好熱鬧", "拔不動", "長出蘿蔔", "捲起袖子"],
    ["山崖", "開心", "表演", "馴鹿", "孔雀", "慶祝", "小熊", "滾大球", "真精彩"],
  ];
  assert.equal(circledVocabulary.length, expected.length);
  circledVocabulary.forEach((terms, lessonIndex) => {
    assert.deepEqual(terms.map((term) => term.text), expected[lessonIndex]);
    for (const term of terms) assert.equal([...term.text].length, term.syllables.length, term.text);
    assert.ok(terms.filter((term) => term.syllables.length > 1).length >= 2);
  });
  const page = await (await import("node:fs/promises")).readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /terms\.filter\(\(term\) => term\.syllables\.length > 1\)/);
  assert.match(page, /Math\.max\(30, wordLength \* 12\)/);
  assert.match(page, /wordInk\.length === wordLength && wordInk\.every\(Boolean\)/);
});

test("lessons five to nine preserve every line and offer randomized listening pools", async () => {
  const page = await (await import("node:fs/promises")).readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const outlines = [
    ["翹翹板", "好朋友", "飛飛飛"],
    ["謝謝老師", "我要送老師", "教我畫畫"],
    ["龜兔賽跑", "烏龜兔子來比賽", "追追追"],
    ["拔蘿蔔", "菜園裡", "大家一起拔蘿蔔"],
    ["動物狂歡會", "山崖下", "真精彩"],
  ];
  for (const [title, firstLine, lastLine] of outlines) {
    assert.match(page, new RegExp(`title: "${title}"`));
    assert.match(page, new RegExp(`"${firstLine}"`));
    assert.match(page, new RegExp(`"${lastLine}"`));
  }
  for (const [number, name] of [[4, "fifth"], [5, "sixth"], [6, "seventh"], [7, "eighth"], [8, "ninth"]]) {
    assert.match(page, new RegExp(`${number}: \\{ lines: ${name}LessonLines, questions: ${name}ListeningQuestions \\}`));
    const pool = page.match(new RegExp(`const ${name}ListeningQuestions = \\[([\\s\\S]*?)\\];`))?.[1];
    assert.ok(pool, `${name} word pool exists`);
    assert.ok((pool.match(/wordQuestion\(/g) ?? []).length >= 4);
  }
  assert.match(page, /function annotateLessonLines/);
  assert.match(page, /characters\.length !== sounds\.length/);
  assert.match(page, /"ㄧㄞ", "ㄧㄣ", "ㄨㄣ", "ㄩㄝ", "ㄩㄣ"/);
  assert.match(page, /"ㄕㄢ", "ㄧㄞˊ", "ㄒㄧㄚˋ"/);
  assert.match(page, /"ㄨㄢˇ", "ㄒㄩㄥˊ"/);
});

test("every listening prompt has an on-site audio clip and the settings pages have real destinations", async () => {
  const fs = await import("node:fs/promises");
  const page = await fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const vocabulary = await fs.readFile(new URL("../app/circled-vocabulary.ts", import.meta.url), "utf8");
  const circledTexts = [...vocabulary.matchAll(/term\("([^"]+)"/g)].map((match) => match[1]);
  const texts = new Set([
    ...circledTexts,
    ...circledTexts.flatMap((term) => [...term]),
    ...[...page.matchAll(/audioText: "([^"]+)"/g)].map((match) => match[1]),
    ...[...page.matchAll(/wordQuestion\("([^"]+)"/g)].map((match) => match[1]),
    ...[...page.matchAll(/character: "([^"]+)"/g)].map((match) => match[1]),
    ...[...page.matchAll(/lines: \[([^\]]+)\]/g)].flatMap((match) => [...match[1].matchAll(/"([^"]+)"/g)].flatMap((line) => [...line[1]].filter((character) => character.trim()))),
    ...[...page.matchAll(/symbols: \[([^\]]+)\]/g)].flatMap((match) => [...match[1].matchAll(/"([^"]+)"/g)].map((symbol) => symbol[1])),
  ]);
  for (const text of texts) {
    const name = [...text].map((character) => character.codePointAt(0).toString(16)).join("-");
    const file = new URL(`../public/listening-audio/${name}.m4a`, import.meta.url);
    assert.ok((await fs.stat(file)).size > 1024, `missing playable clip: ${text}`);
  }
  assert.match(page, /audio\.play\(\)\.catch/);
  assert.match(page, /const isSymbol = literalSymbol && \/\^\[\\u3105-\\u3129\]\+\$\//);
  assert.match(page, /isSymbol \? text : syllableGlyphs\[text\] \?\? text/);
  assert.match(page, /literalSymbols=\{currentQuestion\.category === "symbols"\}/);
  assert.match(page, /"ㄅㄟ": "背\\u\{E01E1\}"/);
  assert.match(page, /"ㄧㄠ": "腰"/);
  assert.match(page, /"ㄨㄢ": "彎"/);
  assert.match(page, /morePanel === "help"/);
  assert.match(page, /morePanel === "versions"/);
  assert.doesNotMatch(page, /每天 5 分鐘，慢慢變熟悉/);
});

test("parent review, listening preferences, and deferred reinforcement remain available", async () => {
  const page = await (await import("node:fs/promises")).readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /ListeningSettings = \{ repeatCount: 1 \| 2 \| 3; intervalSeconds: 5 \| 8 \| 10 \}/);
  assert.match(page, /listeningSettingsStorageKey/);
  assert.match(page, /listenPhase === "ready" \? <div className="listen-ready-card"/);
  assert.match(page, /repeatTimeoutRef\.current = window\.setTimeout/);
  assert.match(page, /listeningSettings\.intervalSeconds \* 1000/);
  assert.match(page, /onEnded=\{\(\) => \{ setPlayingSymbol\(null\); playbackEndedRef\.current\(\); \}\}/);
  assert.doesNotMatch(page, /repeatPlaybacks = Array\.from/);
  assert.match(page, /needsPractice: true/);
  assert.match(page, /現在補強/);
  assert.match(page, /稍後再練/);
  assert.match(page, /markQuestionPracticed\(selectedLesson, currentQuestion\.id\)/);
});

test("handwriting canvases resize with the layout without discarding ink", async () => {
  const page = await (await import("node:fs/promises")).readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const observer = new ResizeObserver\(resize\)/);
  assert.match(page, /window\.addEventListener\("resize", resize\)/);
  assert.match(page, /context\.setTransform\(ratio, 0, 0, ratio, 0, 0\)/);
  assert.match(page, /context\.drawImage\(previous, 0, 0, previous\.width, previous\.height, 0, 0, rect\.width, rect\.height\)/);
  assert.match(page, /for \(const stroke of fillDraftRef\.current\)/);
  assert.match(page, /if \(!initialize && canvas\.width === width && canvas\.height === height\) return/);
});

import { test, expect, type Page, type Locator } from "@playwright/test";
import { readFileSync } from "node:fs";

async function openLesson(page: Page) {
  await page.getByRole("button", { name: /第一課，貓咪/ }).click();
  await expect(page.getByRole("heading", { name: "貓咪", exact: true })).toBeVisible();
}
async function openRecords(page: Page) {
  await page
    .getByRole("navigation", { name: "主要導覽" })
    .getByRole("button", { name: "練習", exact: true })
    .click();
  await page.getByRole("button", { name: "練習紀錄", exact: true }).click();
}
async function drawStroke(page: Page, canvas: Locator) {
  await expect(canvas).toBeVisible();
  await expect(page.locator(".loading-overlay")).toHaveCount(0);
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.8, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => inkPixels(canvas)).toBeGreaterThan(20);
}
async function inkPixels(canvas: Locator) {
  return canvas.evaluate((element: HTMLCanvasElement) => {
    const data = element.getContext("2d")!.getImageData(0, 0, element.width, element.height).data;
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]) count++;
    return count;
  });
}
async function seedFavorite(page: Page, text = "皮包", answer = "words:皮包") {
  await page.addInitScript(
    ({ answer }) =>
      localStorage.setItem(
        "zhuyin-practice-state-v4",
        JSON.stringify({
          savedQuestions: [
            { lessonIndex: 0, questionId: answer, isFavorite: true, needsPractice: true },
          ],
          recentLesson: 0,
          completedSessions: 0,
          history: [],
        }),
      ),
    { answer },
  );
  await page.goto("./");
  await openRecords(page);
  const row = page.locator(".practice-item").filter({ hasText: text });
  await row.getByRole("button", { name: `重練${text}（聽寫）`, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
});

test("courses include reviews, shared headings and settings survive reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator(".journey-card")).toHaveCount(12);
  await openLesson(page);
  await page.getByRole("button", { name: "純注音", exact: true }).click();
  await expect(page.locator(".lesson-text-lines")).toHaveClass(/is-zhuyin-only/);
  await page.getByRole("button", { name: "更多", exact: true }).click();
  await page.getByRole("button", { name: /聽寫設定/ }).click();
  await page.getByRole("button", { name: "3 次", exact: true }).click();
  await page.getByRole("button", { name: "5 秒", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "更多", exact: true }).click();
  await page.getByRole("button", { name: /聽寫設定/ }).click();
  await expect(page.getByRole("button", { name: "3 次", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "5 秒", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("title handwriting retains ink and resumes the same cell after reload", async ({ page }) => {
  await page.goto("./");
  await openLesson(page);
  await page.getByRole("button", { name: /第一關 課文默寫/ }).click();
  await page.getByRole("button", { name: /從第一格開始/ }).click();
  const canvas = page.getByLabel("標題第 1 格手寫區", { exact: true });
  await drawStroke(page, canvas);
  expect(await inkPixels(canvas)).toBeGreaterThan(20);
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: size.width - 12, height: size.height - 20 });
  await expect.poll(() => inkPixels(canvas)).toBeGreaterThan(20);
  await page.getByRole("button", { name: "完成這格", exact: true }).click();
  await expect(page.locator(".fill-writing-location")).toContainText("標題 · 第 2 格");
  await page.getByRole("button", { name: "回到默寫", exact: true }).click();
  await expect(page.locator(".fill-cell.is-filled")).toHaveCount(1);
  // Looking at a finished cell without changing it keeps it finished.
  await page.getByRole("button", { name: "標題第 1 格，修改注音", exact: true }).click();
  await page.getByRole("button", { name: "回到默寫", exact: true }).click();
  await expect(page.locator(".fill-cell.is-filled")).toHaveCount(1);
  await expect(page.locator(".fill-cell.is-in-progress")).toHaveCount(0);
  await page.reload();
  await openLesson(page);
  await page.getByRole("button", { name: /第一關 課文默寫/ }).click();
  await page.getByRole("button", { name: "繼續默寫", exact: true }).click();
  await expect(page.locator(".fill-cell.is-filled")).toHaveCount(1);
});

test("whole-round listening keeps drafts and compares only when writing finishes", async ({
  page,
}) => {
  await page.goto("./");
  await openLesson(page);
  await page.getByRole("button", { name: /第二關 聽寫/ }).click();
  await page.getByRole("button", { name: "開始聽", exact: true }).click();
  const canvas = page.getByLabel("田字格手寫區", { exact: true });
  await drawStroke(page, canvas);
  await page.getByRole("button", { name: "下一題", exact: true }).click();
  await expect(page.locator(".listening-focus-header")).toContainText("2 /");
  await page.getByRole("button", { name: "上一題", exact: true }).click();
  await expect.poll(() => inkPixels(canvas)).toBeGreaterThan(20);
  await page.getByRole("button", { name: "再聽一次", exact: true }).click();
  await expect.poll(() => inkPixels(canvas)).toBeGreaterThan(20);
  await expect(page.locator(".answer-reveal")).toHaveCount(0);
  await page.getByRole("button", { name: "結束作答並檢查", exact: true }).click();
  await expect(page.getByRole("heading", { name: "整輪檢查", exact: true })).toBeVisible();
  const first = page.locator(".listening-review-card").first();
  const columns = first.locator(".listening-review-column");
  expect((await columns.first().boundingBox())!.x).toBeLessThan(
    (await columns.last().boundingBox())!.x,
  );
  await page.getByRole("button", { name: "完成檢查", exact: true }).click();
  await expect(page.locator(".result-page")).toBeVisible();
});

test("word writing has large vertical cells and isolated clear/undo", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await seedFavorite(page);
  await page.getByRole("button", { name: "開始聽", exact: true }).click();
  const rows = page.locator(".word-canvas-row");
  await expect(rows).toHaveCount(2);
  const boxes = await rows.locator("canvas").evaluateAll((elements) =>
    elements.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width };
    }),
  );
  expect(boxes[0].width).toBeGreaterThanOrEqual(180);
  expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
  for (const canvas of await rows.locator("canvas").all()) await drawStroke(page, canvas);
  const before = await inkPixels(rows.last().locator("canvas"));
  await page.getByRole("button", { name: "清空語詞第 1 字", exact: true }).click();
  expect(await inkPixels(rows.first().locator("canvas"))).toBe(0);
  expect(await inkPixels(rows.last().locator("canvas"))).toBe(before);
  await page.getByRole("button", { name: "復原語詞第 1 字筆跡", exact: true }).click();
  expect(await inkPixels(rows.first().locator("canvas"))).toBeGreaterThan(20);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("a second pointer never joins the active stroke on the free board", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "練習", exact: true }).click();
  const canvas = page.getByLabel("自由聽寫作答畫板", { exact: true });
  await expect(canvas).toBeVisible();
  await canvas.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const emit = (type: string, id: number, x: number, y: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId: id,
          pointerType: "touch",
          clientX: box.x + x,
          clientY: box.y + y,
          bubbles: true,
        }),
      );
    // Synthetic pointers lack native capture; leave all drawing handlers real.
    el.setPointerCapture = () => {};
    el.hasPointerCapture = () => false;
    emit("pointerdown", 1, 20, 20);
    emit("pointerdown", 2, 120, 120);
    emit("pointermove", 2, 150, 150);
    emit("pointermove", 1, 40, 40);
    emit("pointerup", 2, 150, 150);
    emit("pointerup", 1, 40, 40);
  });
  expect(await inkPixels(canvas)).toBeGreaterThan(20);
  // The board is written once the hand rests, not on every lift.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("kid-free-dictation-v1")))
    .not.toBeNull();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kid-free-dictation-v1")!),
  );
  expect(stored.strokes).toHaveLength(1);
  expect(stored.version).toBe(2);
  const before = await inkPixels(canvas);
  await page.setViewportSize({ width: 320, height: 740 });
  await expect.poll(() => inkPixels(canvas)).toBe(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a resting palm never writes on the free board", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "練習", exact: true }).click();
  const canvas = page.getByLabel("自由聽寫作答畫板", { exact: true });
  await expect(canvas).toBeVisible();
  await canvas.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const emit = (type: string, id: number, x: number, y: number, size: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId: id,
          pointerType: "touch",
          clientX: box.x + x,
          clientY: box.y + y,
          width: size,
          height: size,
          bubbles: true,
        }),
      );
    el.setPointerCapture = () => {};
    el.hasPointerCapture = () => false;
    // A palm-sized contact is ignored from the start.
    emit("pointerdown", 1, 60, 60, 160);
    emit("pointermove", 1, 90, 90, 160);
    emit("pointerup", 1, 90, 90, 160);
    // A touch that starts small and spreads into a palm is dropped.
    emit("pointerdown", 2, 30, 30, 20);
    emit("pointermove", 2, 50, 50, 24);
    emit("pointermove", 2, 70, 70, 150);
    emit("pointerup", 2, 70, 70, 150);
  });
  expect(await inkPixels(canvas)).toBe(0);
  // A stylus-sized touch still writes.
  await canvas.evaluate((el) => {
    const box = el.getBoundingClientRect();
    for (const [type, x] of [
      ["pointerdown", 20],
      ["pointermove", 60],
      ["pointerup", 60],
    ] as const)
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 3,
          pointerType: "touch",
          clientX: box.x + x,
          clientY: box.y + x,
          width: 30,
          height: 30,
          bubbles: true,
        }),
      );
  });
  await expect.poll(() => inkPixels(canvas)).toBeGreaterThan(20);
});

test("device backup previews, restores and preserves unrelated browser storage", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(() => localStorage.setItem("unrelated-test-key", "keep"));
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("zhuyin-custom-audio-v1", 1);
      // The app opens the recording database only when it is first needed.
      request.onupgradeneeded = () =>
        request.result.createObjectStore("recordings", { keyPath: "key" });
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("recordings", "readwrite");
        tx.objectStore("recordings").put({
          key: JSON.stringify(["教", "ㄐㄧㄠ"]),
          text: "教",
          pronunciation: "ㄐㄧㄠ",
          mimeType: "audio/wav",
          duration: 1,
          updatedAt: 1,
          blob: new TextEncoder().encode("old voice").buffer,
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      };
      request.onerror = () => reject(request.error);
    });
  });
  await page.getByRole("button", { name: "更多", exact: true }).click();
  await page.getByRole("button", { name: /裝置備份/ }).click();
  const backup = {
    format: "zhuyin-device-backup",
    version: 1,
    createdAt: Date.now(),
    storage: {
      "zhuyin-listening-settings-v1": JSON.stringify({
        repeatCount: 3,
        intervalSeconds: 5,
        answerTime: "relaxed",
      }),
    },
    recordings: [
      {
        key: JSON.stringify(["教", "ㄐㄧㄠ"]),
        text: "教",
        pronunciation: "ㄐㄧㄠ",
        mimeType: "audio/mp4",
        duration: 1,
        updatedAt: 2,
        base64: readFileSync("public/listening-audio/6559.m4a").toString("base64"),
      },
    ],
  };
  await page.getByLabel("選擇裝置備份檔").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole("heading", { name: "確認還原內容" })).toBeVisible();
  const restore = page.getByRole("button", { name: "2. 開始還原", exact: true });
  await expect(restore).toBeDisabled();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "1. 下載目前資料", exact: true }).click();
  const saved = await download;
  expect(saved.suggestedFilename()).toContain("還原前備份");
  const before = JSON.parse(readFileSync((await saved.path())!, "utf8"));
  expect(before.recordings[0].base64).toBe(Buffer.from("old voice").toString("base64"));
  const refreshed = page.waitForEvent("domcontentloaded");
  await restore.click();
  await refreshed;
  await expect(page.locator(".journey-card")).toHaveCount(12);
  const restoredVoice = await page.evaluate(async () => {
    const clips = await new Promise<{ blob: ArrayBuffer; mimeType: string }[]>(
      (resolve, reject) => {
        const request = indexedDB.open("zhuyin-custom-audio-v1", 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("recordings", "readonly");
          const records = tx.objectStore("recordings").getAll();
          tx.oncomplete = () => {
            db.close();
            resolve(records.result);
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
        request.onerror = () => reject(request.error);
      },
    );
    return { count: clips.length, bytes: clips[0].blob.byteLength, type: clips[0].mimeType };
  });
  expect(restoredVoice).toEqual({
    count: 1,
    bytes: Buffer.from(backup.recordings[0].base64, "base64").length,
    type: "audio/mp4",
  });
  expect(await page.evaluate(() => localStorage.getItem("unrelated-test-key"))).toBe("keep");
  await page.getByRole("button", { name: "更多", exact: true }).click();
  await page.getByRole("button", { name: /聽寫設定/ }).click();
  await expect(page.getByRole("button", { name: "3 次", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "5 秒", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("sound practice animates wrong retry and correct automatic progression", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      setTimeout(() => this.dispatchEvent(new Event("ended")), 1000);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {};
  });
  await page.route("**/listening-audio/**", (route) => route.abort());
  await page.goto("./");
  await page.getByRole("button", { name: "練習", exact: true }).click();
  await page.getByRole("button", { name: "辨音練習", exact: true }).click();
  await expect(page.getByRole("heading", { name: "練習", exact: true })).toBeVisible();
  await page.locator(".sound-pair-list button").first().click();
  await expect(page.getByRole("heading", { name: "聽聽兩個音", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "依序聽兩個音", exact: true }).click();
  await expect(page.locator(".sound-preview-symbol.is-speaking")).toHaveAttribute(
    "data-symbol",
    "ㄓ",
  );
  await expect(page.locator(".sound-preview-symbol.is-speaking")).toHaveAttribute(
    "data-symbol",
    "ㄔ",
  );
  await expect(page.getByRole("button", { name: "依序聽兩個音", exact: true })).toBeVisible();
  await expect(page.locator(".sound-preview-symbol.is-speaking")).toHaveCount(0);
  await page.getByRole("button", { name: /開始.*練習/ }).click();
  await expect(page.getByRole("heading", { name: "你聽到哪個音？", exact: true })).toBeVisible();
  await expect(page.locator(".sound-choice-row button").first()).toBeEnabled();
  for (let i = 0; i < 6; i++) {
    const src = await page.locator("audio").getAttribute("src");
    // First group is ㄓ/ㄔ. Those fixtures use one file per basic symbol.
    const label = src?.includes("3113") ? "ㄓ" : "ㄔ";
    if (i === 0) {
      await page
        .getByRole("button", { name: `選 ${label === "ㄓ" ? "ㄔ" : "ㄓ"}`, exact: true })
        .click();
      await expect(page.locator(".sound-feedback-animation.is-retry")).toBeVisible();
      await expect(page.getByRole("button", { name: `選 ${label}`, exact: true })).toBeEnabled();
    }
    await page.getByRole("button", { name: `選 ${label}`, exact: true }).click();
    await expect(page.locator(".sound-feedback-animation.is-correct")).toBeVisible();
    if (i < 5) {
      await expect(page.locator(".sound-progress")).toContainText(`${i + 2}`);
      await expect(page.locator(".sound-choice-row button").first()).toBeEnabled();
    }
  }
  await expect(page.getByRole("heading", { name: "這一組練完了！", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "再練一次", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "換一組聲音", exact: true })).toBeVisible();
});

test("back gestures stay inside the app and pull-to-refresh is off", async ({ page }) => {
  await page.goto("./");
  expect(
    await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY),
  ).toBe("none");
  await openLesson(page);
  await page.goBack();
  await expect(page.locator(".journey-card")).toHaveCount(12);
  // A listening round in progress asks before the back gesture ends it.
  await openLesson(page);
  await page.getByRole("button", { name: /第二關 聽寫/ }).click();
  await page.getByRole("button", { name: "開始聽", exact: true }).click();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "要先離開聽寫嗎？", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "繼續練習", exact: true }).click();
  await expect(page.getByLabel("田字格手寫區", { exact: true })).toBeVisible();
});

test("the site can be added to the home screen as a full-screen app", async ({ page }) => {
  await page.goto("./");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await page.request.get(new URL(href!, page.url()).href)).json();
  expect(manifest.display).toBe("fullscreen");
  // Writing flat on a desk, the installed app must not flip mid-stroke.
  expect(manifest.orientation).toBe("portrait");
  expect(manifest.start_url).toBe("./");
  for (const icon of manifest.icons) {
    const response = await page.request.get(new URL(icon.src, new URL(href!, page.url())).href);
    expect(response.ok(), icon.src).toBe(true);
  }
});

test("dictation writing uses the whole tablet screen", async ({ page }, testInfo) => {
  test.skip(
    !/^(android-tablet|ipad)/.test(testInfo.project.name),
    "phones keep the single-column layout",
  );
  await page.goto("./");
  await openLesson(page);
  await page.getByRole("button", { name: /第一關 課文默寫/ }).click();
  await page.getByRole("button", { name: /從第一格開始/ }).click();
  const grid = page.locator(".fill-writing-grid");
  await expect(grid).toBeVisible();
  expect((await grid.boundingBox())!.width).toBeGreaterThan(560);
  await expect(page.getByRole("button", { name: "完成這格", exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(
    true,
  );
});

test("an unfinished listening round continues after a reload", async ({ page }) => {
  await page.goto("./");
  await openLesson(page);
  await page.getByRole("button", { name: /第二關 聽寫/ }).click();
  await page.getByRole("button", { name: "開始聽", exact: true }).click();
  const canvas = page.getByLabel("田字格手寫區", { exact: true });
  await drawStroke(page, canvas);
  await page.getByRole("button", { name: "下一題", exact: true }).click();
  await expect(page.locator(".listening-focus-header")).toContainText("2 /");
  await drawStroke(page, canvas);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "要繼續上次的聽寫嗎？", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "繼續聽寫", exact: true }).click();
  await expect(page.locator(".listening-focus-header")).toContainText("2 /");
  await expect.poll(() => inkPixels(canvas)).toBeGreaterThan(20);
  await page.getByRole("button", { name: "上一題", exact: true }).click();
  await expect.poll(() => inkPixels(canvas)).toBeGreaterThan(20);
  // Starting over clears the saved round, so the next reload opens the course list.
  await page.reload();
  await page.getByRole("button", { name: "重新開始", exact: true }).click();
  await expect(page.getByRole("button", { name: "開始聽", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator(".journey-card")).toHaveCount(12);
});

test("a newer deployed version loads on the course list, never mid-round", async ({ page }) => {
  // Opening on the course list switches to the newer build once, without a reload loop.
  await page.route("**/version.json*", (route) => route.fulfill({ json: { build: "newer" } }));
  await page.goto("./");
  await page.waitForURL(/\?v=newer$/);
  await expect(page.locator(".journey-card")).toHaveCount(12);
  await page.waitForTimeout(500);
  expect(page.url()).toMatch(/\?v=newer$/);

  // An update found while writing waits until the child is back on the course list.
  await page.route("**/version.json*", (route) => route.fulfill({ json: { build: "newest" } }));
  await openLesson(page);
  await page.getByRole("button", { name: /第二關 聽寫/ }).click();
  await page.getByRole("button", { name: "開始聽", exact: true }).click();
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.waitForTimeout(500);
  expect(page.url()).toMatch(/\?v=newer$/);
  await expect(page.getByLabel("田字格手寫區", { exact: true })).toBeVisible();
  await page.locator(".listening-header-back").click();
  await page.getByRole("button", { name: "結束本輪", exact: true }).click();
  await page.getByRole("button", { name: "回到課程", exact: true }).click();
  await page.waitForURL(/\?v=newest$/);
  await expect(page.locator(".journey-card")).toHaveCount(12);
});

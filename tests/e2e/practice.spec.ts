import { test, expect, type Page, type Locator } from "@playwright/test";

async function openLesson(page: Page) {
  await page.getByRole("button", { name: /第一課，貓咪/ }).click();
  await expect(page.getByRole("heading", { name: "貓咪", exact: true })).toBeVisible();
}

async function drawStroke(page: Page, canvas: Locator) {
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.8, { steps: 8 });
  await page.mouse.up();
}

async function inkPixels(canvas: Locator) {
  return canvas.evaluate((element: HTMLCanvasElement) => {
    const data = element.getContext("2d")!.getImageData(0, 0, element.width, element.height).data;
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) count++;
    return count;
  });
}

test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
});

test("all courses, lesson modes and settings render without page errors or overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".journey-card")).toHaveCount(9);
  await openLesson(page);
  await page.getByRole("button", { name: "純注音", exact: true }).click();
  await expect(page.locator(".lesson-text-lines")).toHaveClass(/is-zhuyin-only/);
  await expect(page.getByRole("button", { name: /第一關 課文默寫/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /第二關 聽寫/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
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
  expect(errors).toEqual([]);
});

test("handwriting is saved, survives resizing and resumes after reload", async ({ page }) => {
  await page.goto("/");
  await openLesson(page);
  await page.getByRole("button", { name: /第一關 課文默寫/ }).click();
  await page.getByRole("button", { name: "從第一格開始", exact: false }).click();
  const writing = page.locator("canvas[aria-label='第 1 行第 1 格手寫區']");
  await drawStroke(page, writing);
  expect(await inkPixels(writing)).toBeGreaterThan(20);
  const current = page.viewportSize()!;
  await page.setViewportSize({ width: current.width - 12, height: current.height - 20 });
  await expect.poll(() => inkPixels(writing)).toBeGreaterThan(20);
  await page.getByRole("button", { name: "完成這格", exact: true }).click();
  await expect(page.locator(".fill-focus-header strong")).toHaveText("第 1 行 · 第 2 格");
  await page.getByRole("button", { name: "回到課文", exact: false }).click();
  await expect(page.locator(".fill-cell.is-filled")).toHaveCount(1);
  await page.reload();
  await openLesson(page);
  await page.getByRole("button", { name: /第一關 課文默寫/ }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "繼續默寫", exact: true }).click();
  await expect(page.locator(".fill-cell.is-filled")).toHaveCount(1);
  await page.getByRole("button", { name: "第 1 行第 1 格，修改注音", exact: true }).click();
  await expect.poll(() => inkPixels(writing)).toBeGreaterThan(20);
});

test("parent review favorites use a yellow star and persist through rewriting", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const strokes = Object.fromEntries(
      Array.from({ length: 14 }, (_, i) => [
        i,
        [
          [
            { x: 20, y: 20 },
            { x: 70, y: 80 },
          ],
        ],
      ]),
    );
    localStorage.setItem(
      "zhuyin-fill-draft-v1-0",
      JSON.stringify({
        version: 1,
        lessonIndex: 0,
        savedAt: 1,
        strokes,
        pendingCells: {},
        needsRetry: [],
        reviewOpen: false,
      }),
    );
  });
  await page.goto("/");
  await openLesson(page);
  await page.getByRole("button", { name: /第一關 課文默寫/ }).click();
  await page.getByRole("button", { name: "繼續默寫", exact: true }).click();
  await page.getByRole("button", { name: "請家長檢查", exact: false }).click();
  const star = page.getByRole("button", { name: "收藏第 1 行第 1 格", exact: true });
  await star.click();
  await expect(
    page.getByRole("button", { name: "取消收藏第 1 行第 1 格", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "重寫第 1 行第 1 格", exact: true }).click();
  await drawStroke(page, page.locator("canvas"));
  await page.getByRole("button", { name: "完成這格", exact: true }).click();
  await page.getByRole("button", { name: "完成檢查", exact: false }).click();
  const next = page.getByRole("button", { name: "進入聽寫", exact: false });
  await expect(next).toBeVisible();
  expect(
    await next.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
  ).toBeGreaterThanOrEqual(18);
  await page.getByRole("button", { name: "練習", exact: true }).click();
  const remove = page.getByRole("button", { name: "取消收藏咪", exact: true });
  await expect(remove).toBeVisible();
  const color = await remove.evaluate((element) => getComputedStyle(element).color);
  expect(color).not.toBe("rgb(20, 110, 226)");
  await remove.click();
  await expect(page.locator(".fill-favorite")).toHaveCount(0);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("zhuyin-fill-favorites-v1")!)),
  ).toEqual([]);
});

test("listening has one start control, normal-speed symbols, review and deferred favorites", async ({
  page,
}) => {
  await page.goto("/");
  await openLesson(page);
  await page.getByRole("button", { name: /第二關 聽寫/ }).click();
  await expect(page.getByRole("button", { name: "開始聽", exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "開始聽", exact: true }).click();
  const canvas = page.locator("canvas[aria-label='田字格手寫區']");
  await drawStroke(page, canvas);
  expect(
    await page.locator("audio").evaluate((audio: HTMLAudioElement) => audio.playbackRate),
  ).toBe(1);
  await page.getByRole("button", { name: "提早交卷", exact: true }).click();
  await expect(page.locator(".answer-reveal")).toBeVisible();
  await page.getByRole("button", { name: "需要補強", exact: false }).click();
  await page.getByRole("button", { name: "稍後再練", exact: true }).click();
  await page.getByRole("button", { name: "離開", exact: false }).click();
  await page.getByRole("button", { name: "練習", exact: true }).click();
  await expect(page.locator(".saved-question:not(.fill-favorite)")).toHaveCount(1);
  await page.getByRole("button", { name: "重練這題", exact: true }).click();
  await expect(page.locator(".listen-ready-progress strong")).toHaveText("第 1 小題 / 1");
});

test("word questions have the right progress and require ink in every cell", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "zhuyin-practice-state-v3",
      JSON.stringify({
        savedQuestions: [{ lessonIndex: 0, questionId: "words:貓咪" }],
        recentLesson: null,
        completedSessions: 0,
      }),
    ),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "練習", exact: true }).click();
  await page.getByRole("button", { name: "重練這題", exact: true }).click();
  await expect(page.locator(".listen-ready-progress strong")).toHaveText("第 1 小題 / 1");
  await page.getByRole("button", { name: "開始聽", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(2);
  await drawStroke(page, page.locator("canvas").first());
  await page.getByRole("button", { name: "提早交卷", exact: true }).click();
  await expect(page.getByRole("button", { name: "答對", exact: false })).toBeDisabled();
  await expect(page.locator(".focus-question small")).toHaveText("收藏題目重練");
});

test("exit confirmation pauses and resumes the listening timer", async ({ page }) => {
  await page.goto("/");
  await openLesson(page);
  await page.getByRole("button", { name: /第二關 聽寫/ }).click();
  await page.getByRole("button", { name: "開始聽", exact: true }).click();
  await page.getByRole("button", { name: "離開", exact: false }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  const before = await page.locator(".focus-meta > span").first().textContent();
  await page.waitForTimeout(1200);
  expect(await page.locator(".focus-meta > span").first().textContent()).toBe(before);
  await page.getByRole("button", { name: "繼續作答", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect
    .poll(() => page.locator(".focus-meta > span").first().textContent())
    .not.toBe(before);
});

test("unavailable browser storage warns without preventing practice", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "練習", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("無法儲存");
  await page.getByRole("button", { name: "課程", exact: true }).click();
  await openLesson(page);
  await page.getByRole("button", { name: /第一關 課文默寫/ }).click();
  await expect(page.getByRole("button", { name: "從第一格開始", exact: false })).toBeEnabled();
});

test("slow or failed audio has loading and actionable retry feedback", async ({ page }) => {
  await page.route("**/listening-audio/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.abort();
  });
  await page.goto("/");
  await openLesson(page);
  await page.getByRole("button", { name: /第二關 聽寫/ }).click();
  await page.getByRole("button", { name: "開始聽", exact: true }).click();
  await expect(page.getByRole("status", { name: "聲音準備中…", exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("音訊無法播放");
  await expect(page.getByRole("button", { name: "再聽一次", exact: false })).toBeVisible();
});

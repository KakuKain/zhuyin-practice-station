import { expect, test, type Locator, type Page } from "@playwright/test";
import type { InkStroke } from "../../features/types";

type Sample = {
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel";
  id?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  time?: number;
  outside?: boolean;
  coalesced?: { x: number; y: number; time: number }[];
};

// Real PointerEvents with touch geometry and no pressure, as a passive pen reports.
// Only capture is mocked: synthetic pointers do not have a native active pointer ID.
async function touch(canvas: Locator, samples: Sample[], capture: "mock" | "throw" = "mock") {
  await canvas.evaluate(
    (element: HTMLCanvasElement, { samples, capture }) => {
      element.setPointerCapture = () => {
        if (capture === "throw") throw new DOMException("Contact already ended", "NotFoundError");
      };
      element.hasPointerCapture = () => false;
      const box = element.getBoundingClientRect();
      for (const sample of samples) {
        const makeEvent = (point: { x: number; y: number; time?: number }) => {
          const event = new PointerEvent(sample.type, {
            pointerId: sample.id ?? 1,
            pointerType: "touch",
            clientX: box.x + (box.width * point.x) / 100,
            clientY: box.y + (box.height * point.y) / 100,
            pressure: 0,
            width: sample.width ?? 0,
            height: sample.height ?? 0,
            bubbles: true,
            cancelable: true,
          });
          if (point.time !== undefined)
            Object.defineProperty(event, "timeStamp", { value: point.time });
          return event;
        };
        const event = makeEvent(sample);
        if (sample.coalesced)
          Object.defineProperty(event, "getCoalescedEvents", {
            value: () => sample.coalesced!.map(makeEvent),
          });
        (sample.outside ? window : element).dispatchEvent(event);
      }
    },
    { samples, capture },
  );
}

async function pixels(canvas: Locator) {
  return canvas.evaluate((element: HTMLCanvasElement) => {
    const data = element.getContext("2d")!.getImageData(0, 0, element.width, element.height).data;
    let count = 0;
    let hash = 2166136261;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i]) count++;
      hash = Math.imul(hash ^ data[i], 16777619);
    }
    return { count, hash };
  });
}

async function savedInk(page: Page): Promise<InkStroke[]> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("zhuyin-fill-draft-v1-0");
    if (!raw) return [];
    const draft = JSON.parse(raw);
    const cells: Record<string, InkStroke[]> = { ...draft.strokes, ...draft.pendingCells };
    return Object.values(cells).flat();
  });
}

async function openLesson(page: Page) {
  await page.getByRole("button", { name: /第一課，貓咪/ }).click();
  await expect(page.getByRole("heading", { name: "貓咪", exact: true })).toBeVisible();
}

async function openFill(page: Page) {
  await page.goto("./");
  await openLesson(page);
  await page.getByRole("button", { name: /第一關 課文默寫/ }).click();
  await page.getByRole("button", { name: "從第一格開始", exact: true }).click();
  const canvas = page.getByLabel("標題第 1 格手寫區", { exact: true });
  await expect(canvas).toBeVisible();
  await expect(page.locator(".loading-overlay")).toHaveCount(0);
  return canvas;
}

async function openWord(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "zhuyin-practice-state-v4",
      JSON.stringify({
        savedQuestions: [
          { lessonIndex: 0, questionId: "words:皮包", isFavorite: true, needsPractice: true },
        ],
        recentLesson: 0,
        completedSessions: 0,
        history: [],
      }),
    );
  });
  await page.goto("./");
  await page.getByRole("button", { name: "練習", exact: true }).click();
  await page.getByRole("button", { name: "練習紀錄", exact: true }).click();
  await page.getByRole("button", { name: "重練皮包（聽寫）", exact: true }).click();
  await page.getByRole("button", { name: "開始聽", exact: true }).click();
  await expect(page.getByLabel("語詞第 1 字田字格手寫區", { exact: true })).toBeVisible();
  await expect(page.locator(".loading-overlay")).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
});

test("passive pen dots and weighted strokes persist through undo, preview and reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const canvas = await openFill(page);
  await touch(canvas, [{ type: "pointerdown", x: 20, y: 20 }]);
  // A tap is visible immediately, before lifting and without pressure metadata.
  expect((await pixels(canvas)).count).toBeGreaterThan(4);
  await touch(canvas, [{ type: "pointerup", x: 20, y: 20 }]);
  await touch(canvas, [
    { type: "pointerdown", x: 30, y: 30, time: 100 },
    { type: "pointermove", x: 35, y: 35, time: 164 },
    { type: "pointermove", x: 70, y: 70, time: 180 },
    { type: "pointerup", x: 72, y: 75, time: 244 },
  ]);
  await expect.poll(async () => (await savedInk(page)).length).toBe(2);
  const stored = await savedInk(page);
  const widths = stored.flat().map((point) => point.width!);
  expect(widths.every((width) => Number.isFinite(width) && width > 0)).toBe(true);
  expect(new Set(widths).size).toBeGreaterThan(1);
  const before = await pixels(canvas);
  expect(before.count).toBeGreaterThan(100);
  await page.getByRole("button", { name: "清空這格", exact: true }).click();
  expect((await pixels(canvas)).count).toBe(0);
  await page.getByRole("button", { name: "復原這格筆跡", exact: true }).click();
  await expect.poll(() => pixels(canvas)).toEqual(before);
  await expect.poll(() => savedInk(page)).toEqual(stored);
  await page.getByRole("button", { name: "完成這格", exact: true }).click();
  await page.getByRole("button", { name: "回到默寫", exact: true }).click();
  const completed = page.getByRole("button", { name: "標題第 1 格，修改注音", exact: true });
  await expect(completed.locator(".ink-preview path")).toHaveCount(2);
  const preview = await completed.locator(".ink-preview").innerHTML();
  await page.reload();
  await openLesson(page);
  await page.getByRole("button", { name: /第一關 課文默寫/ }).click();
  await page.getByRole("button", { name: "繼續默寫", exact: true }).click();
  await expect(completed.locator(".ink-preview")).toHaveJSProperty("innerHTML", preview);
  await completed.click();
  await expect.poll(() => pixels(canvas)).toEqual(before);
  await expect.poll(() => savedInk(page)).toEqual(stored);
  expect(errors).toEqual([]);
});

test("a touch size spike and pointer cancellation preserve the accepted part of writing", async ({
  page,
}) => {
  const canvas = await openFill(page);
  await touch(canvas, [
    { type: "pointerdown", x: 20, y: 20, width: 4, height: 4 },
    { type: "pointermove", x: 40, y: 40, width: 4, height: 4 },
    { type: "pointermove", x: 90, y: 90, width: 160, height: 160 },
    { type: "pointerup", x: 90, y: 90, width: 160, height: 160 },
  ]);
  await expect.poll(async () => (await savedInk(page)).length).toBe(1);
  expect((await savedInk(page))[0].every((point) => point.x <= 40 && point.y <= 40)).toBe(true);
  expect((await pixels(canvas)).count).toBeGreaterThan(20);
  await touch(canvas, [
    { type: "pointerdown", id: 2, x: 55, y: 20 },
    { type: "pointermove", id: 2, x: 55, y: 60 },
    { type: "pointercancel", id: 2, x: 90, y: 90 },
  ]);
  await expect.poll(async () => (await savedInk(page)).length).toBe(2);
  expect((await savedInk(page))[1].at(-1)).toMatchObject({ x: 55, y: 60 });
  // A later touch is a fresh stroke; no handoff from the cancelled contact.
  await touch(canvas, [
    { type: "pointerdown", id: 3, x: 70, y: 20 },
    { type: "pointerup", id: 3, x: 70, y: 20 },
  ]);
  await expect.poll(async () => (await savedInk(page)).length).toBe(3);
});

test("capture failure and release outside the canvas never leave writing stuck", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const canvas = await openFill(page);
  await touch(
    canvas,
    [
      { type: "pointerdown", x: 20, y: 20 },
      { type: "pointermove", x: 30, y: 40 },
      { type: "pointerup", x: 130, y: 130, outside: true },
    ],
    "throw",
  );
  await expect.poll(async () => (await savedInk(page)).length).toBe(1);
  expect((await savedInk(page))[0].at(-1)).toMatchObject({ x: 30, y: 40 });
  await touch(
    canvas,
    [
      { type: "pointerdown", id: 2, x: 50, y: 20 },
      { type: "pointermove", id: 2, x: 60, y: 40 },
      { type: "pointercancel", id: 2, x: 130, y: 130, outside: true },
    ],
    "throw",
  );
  await touch(canvas, [
    { type: "pointerdown", id: 3, x: 75, y: 20 },
    { type: "pointerup", id: 3, x: 75, y: 20 },
  ]);
  await expect.poll(async () => (await savedInk(page)).length).toBe(3);
  expect((await pixels(canvas)).count).toBeGreaterThan(20);
  expect(errors).toEqual([]);
});

test("single-cell listening touch ink survives question navigation and keeps its review outline", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await openLesson(page);
  await page.getByRole("button", { name: /第二關 聽寫/ }).click();
  await page.getByRole("button", { name: "開始聽", exact: true }).click();
  const canvas = page.getByLabel("田字格手寫區", { exact: true });
  await expect(canvas).toBeVisible();
  await expect(page.locator(".loading-overlay")).toHaveCount(0);
  await touch(canvas, [
    { type: "pointerdown", x: 20, y: 20 },
    { type: "pointermove", x: 60, y: 70 },
    { type: "pointerup", x: 60, y: 70 },
  ]);
  const before = await pixels(canvas);
  expect(before.count).toBeGreaterThan(100);
  await page.getByRole("button", { name: "下一題", exact: true }).click();
  await page.getByRole("button", { name: "上一題", exact: true }).click();
  await expect.poll(() => pixels(canvas)).toEqual(before);
  await page.getByRole("button", { name: "結束作答並檢查", exact: true }).click();
  const card = page.locator(".listening-review-card").first();
  const path = card.locator(".ink-preview path");
  await expect(path).toHaveCount(1);
  const outline = await path.getAttribute("d");
  expect(outline?.length).toBeGreaterThan(30);
  await card.getByRole("button", { name: "修改作答", exact: true }).click();
  await expect.poll(() => pixels(canvas)).toEqual(before);
  await page.getByRole("button", { name: "結束作答並檢查", exact: true }).click();
  await expect(path).toHaveAttribute("d", outline!);
  expect(errors).toEqual([]);
});

test("a second touch in another word cell is ignored until the writing pointer lifts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openWord(page);
  const first = page.getByLabel("語詞第 1 字田字格手寫區", { exact: true });
  const second = page.getByLabel("語詞第 2 字田字格手寫區", { exact: true });
  await touch(first, [
    { type: "pointerdown", id: 1, x: 20, y: 20 },
    { type: "pointermove", id: 1, x: 40, y: 40 },
  ]);
  await touch(second, [
    { type: "pointerdown", id: 2, x: 50, y: 50 },
    { type: "pointermove", id: 2, x: 80, y: 80 },
    { type: "pointerup", id: 2, x: 80, y: 80 },
  ]);
  await touch(first, [{ type: "pointerup", id: 1, x: 50, y: 60 }]);
  const firstInk = await pixels(first);
  expect(firstInk.count).toBeGreaterThan(20);
  expect((await pixels(second)).count).toBe(0);
  await touch(second, [
    { type: "pointerdown", id: 3, x: 20, y: 20 },
    { type: "pointermove", id: 3, x: 50, y: 50 },
    { type: "pointercancel", id: 3, x: 90, y: 90 },
  ]);
  const secondInk = await pixels(second);
  expect(secondInk.count).toBeGreaterThan(20);
  await page.getByRole("button", { name: "清空語詞第 1 字", exact: true }).click();
  expect((await pixels(first)).count).toBe(0);
  expect(await pixels(second)).toEqual(secondInk);
  await page.getByRole("button", { name: "復原語詞第 1 字筆跡", exact: true }).click();
  await expect.poll(() => pixels(first)).toEqual(firstInk);
  expect(await pixels(second)).toEqual(secondInk);
  expect(errors).toEqual([]);
});

test("coalesced touch samples retain a quick curve and an elongated capacitive contact", async ({
  page,
}) => {
  const canvas = await openFill(page);
  await touch(canvas, [
    { type: "pointerdown", x: 20, y: 20, width: 110, height: 8, time: 100 },
    {
      type: "pointermove",
      x: 70,
      y: 20,
      width: 110,
      height: 8,
      time: 140,
      coalesced: [
        { x: 30, y: 40, time: 110 },
        { x: 45, y: 55, time: 120 },
        { x: 60, y: 40, time: 130 },
        { x: 70, y: 20, time: 140 },
      ],
    },
    { type: "pointerup", x: 70, y: 20, width: 110, height: 8, time: 145 },
  ]);
  await expect.poll(async () => (await savedInk(page)).length).toBe(1);
  const stroke = (await savedInk(page))[0];
  expect(stroke.map(({ x, y }) => [x, y])).toEqual([
    [20, 20],
    [30, 40],
    [45, 55],
    [60, 40],
    [70, 20],
  ]);
  expect((await pixels(canvas)).count).toBeGreaterThan(100);
});

test("a pointer without capture cannot extend its stroke using another word cell coordinates", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openWord(page);
  const first = page.getByLabel("語詞第 1 字田字格手寫區", { exact: true });
  const second = page.getByLabel("語詞第 2 字田字格手寫區", { exact: true });
  await touch(
    first,
    [
      { type: "pointerdown", id: 1, x: 20, y: 20 },
      { type: "pointermove", id: 1, x: 40, y: 40 },
    ],
    "throw",
  );
  // The move is painted on the next animation frame; capture after it, not just the dot.
  await first.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const acceptedInk = await pixels(first);
  expect(acceptedInk.count).toBeGreaterThan(100);
  // Without capture the same physical contact can dispatch on a different canvas.
  await touch(second, [
    { type: "pointermove", id: 1, x: 80, y: 80 },
    { type: "pointerup", id: 1, x: 80, y: 80 },
  ]);
  await expect.poll(() => pixels(first)).toEqual(acceptedInk);
  expect((await pixels(second)).count).toBe(0);
  await touch(second, [
    { type: "pointerdown", id: 2, x: 20, y: 20 },
    { type: "pointermove", id: 2, x: 55, y: 60 },
    { type: "pointerup", id: 2, x: 55, y: 60 },
  ]);
  expect((await pixels(second)).count).toBeGreaterThan(20);
  expect(await pixels(first)).toEqual(acceptedInk);
  expect(errors).toEqual([]);
});

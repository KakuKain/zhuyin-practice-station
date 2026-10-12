import { expect, test, type Locator, type Page } from "@playwright/test";

async function stroke(page: Page, canvas: Locator, points: [number, number][]) {
  const box = (await canvas.boundingBox())!;
  const at = ([x, y]: [number, number]) =>
    [box.x + (box.width * x) / 100, box.y + (box.height * y) / 100] as const;
  await page.mouse.move(...at(points[0]));
  await page.mouse.down();
  for (const point of points.slice(1)) await page.mouse.move(...at(point));
  await page.mouse.up();
}

const circle = (cx: number, cy: number): [number, number][] =>
  Array.from({ length: 13 }, (_, step) => {
    const angle = (step / 12) * Math.PI * 2;
    return [cx + 8 * Math.cos(angle), cy + 8 * Math.sin(angle)];
  });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return Promise.resolve();
    };
  });
});

test("第一課 reads each question aloud, keeps the round and ends with the parent's check", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "數學", exact: true }).click();
  await page.getByRole("button", { name: /數學第一課/ }).click();
  await page.getByRole("button", { name: "開始練習" }).click();

  // 數一數: the question is spoken, pictures can be marked, the number is written.
  await expect(page.locator(".math-header")).toContainText("第 1 題 / 8");
  await expect(page.locator("audio")).toHaveAttribute("src", /math-audio\/count\.m4a/);
  const picture = page.locator(".math-pictures button").first();
  await picture.click();
  await expect(picture).toHaveAttribute("aria-pressed", "true");
  await stroke(page, page.getByLabel("寫數字"), [
    [30, 25],
    [70, 25],
    [45, 80],
  ]);
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "下一題", exact: true }).click();

  // 畫圈圈: every circle shows its number while drawing.
  await expect(page.locator(".math-header")).toContainText("第 5 題 / 8");
  await expect(page.locator("audio")).toHaveAttribute("src", /math-audio\/draw-\d+\.m4a/);
  const paper = page.locator(".math-draw canvas");
  await stroke(page, paper, circle(25, 25));
  await stroke(page, paper, circle(60, 25));
  await expect(page.locator(".math-stroke-numbers > span:not(.visually-hidden)")).toHaveText([
    "1",
    "2",
  ]);

  // A reload continues the same round where it was.
  await page.reload();
  await page.getByRole("button", { name: /數學第一課/ }).click();
  await page.getByRole("button", { name: "繼續上次的練習" }).click();
  await expect(page.locator(".math-header")).toContainText("第 5 題 / 8");
  await expect(page.locator(".math-stroke-numbers > span:not(.visually-hidden)")).toHaveCount(2);

  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "下一題", exact: true }).click();
  await page.getByRole("button", { name: "寫完了，請家長檢查" }).click();
  const cards = page.locator(".math-check-card");
  await expect(cards).toHaveCount(8);
  // Answered questions start unmarked; unanswered ones start as 需要補強.
  await expect(cards.nth(0).locator(".math-check-toggle")).toHaveAttribute("aria-pressed", "false");
  await expect(cards.nth(1).locator(".math-check-toggle")).toHaveAttribute("aria-pressed", "true");
  await expect(cards.nth(4).locator(".math-check-toggle")).toHaveAttribute("aria-pressed", "false");
  await expect(cards.nth(4)).toContainText("畫了 2 筆");
  await cards.nth(0).locator(".math-check-toggle").click();
  await page.getByRole("button", { name: "檢查完成" }).click();
  await expect(page.getByRole("heading", { name: "練習完成！" })).toBeVisible();
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kid-math-records-v1") ?? "{}"),
  );
  expect(records.rounds).toHaveLength(1);
  expect(records.rounds[0].needsPractice.length).toBe(7);
  expect(await page.evaluate(() => localStorage.getItem("kid-math-round-v1"))).toBeNull();

  // The course list stays on 數學 for this child.
  await page.getByRole("button", { name: "回到課程" }).click();
  await expect(page.getByRole("button", { name: "數學", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(errors).toEqual([]);
});

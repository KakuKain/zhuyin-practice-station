import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

const data = JSON.parse(readFileSync("features/hanzi/strokes.json", "utf8")) as Record<
  string,
  { medians: number[][][] }
>;

/** Writes one stroke of the 1024 box (y up from 900) along its median, as a pen would. */
async function write(page: Page, canvas: Locator, median: number[][]) {
  const box = (await canvas.boundingBox())!;
  const at = ([x, y]: number[]) =>
    [box.x + (box.width * x) / 1024, box.y + (box.height * (900 - y)) / 1024] as const;
  await page.mouse.move(...at(median[0]));
  await page.mouse.down();
  for (const point of median.slice(1)) await page.mouse.move(...at(point), { steps: 4 });
  await page.mouse.up();
  // Judged once the pen has stayed up a little.
  await page.waitForTimeout(260);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return Promise.resolve();
    };
  });
});

const noOverflow = (page: Page) =>
  expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(0);

test("第一冊's 筆順 marks a stroke out of order and finishes a 生字 written in order", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("combobox", { name: "選擇教材" }).selectOption("kang-hsuan-grade1-book1");
  await expect(page.locator(".hanzi-journey .journey-card")).toHaveCount(7);
  await noOverflow(page);
  await page.getByRole("button", { name: /第一課，拍拍手/ }).click();
  await expect(page.locator(".hanzi-character-card")).toHaveCount(9);
  await expect(page.getByRole("button", { name: /描一描，照著/ })).toBeVisible();
  await noOverflow(page);

  await page.getByRole("button", { name: /描一描「拍」/ }).click();
  await expect(page.locator(".math-header")).toContainText("第 1 個字 / 1");
  const canvas = page.locator(".hanzi-canvas");
  await canvas.scrollIntoViewIfNeeded();
  await noOverflow(page);
  const medians = data["拍"].medians;
  // The second stroke first: a red ✗, and nothing is inked.
  await write(page, canvas, medians[1]);
  await expect(page.locator(".hanzi-feedback")).toContainText("不是這一筆");
  await expect(page.locator(".hanzi-ink")).toHaveCount(0);
  for (const [i, median] of medians.entries()) {
    await write(page, canvas, median);
    await expect(page.locator(".hanzi-ink")).toHaveCount(i + 1);
  }
  await expect(page.locator(".hanzi-glyph.is-finished")).toBeVisible();
  await expect(page.locator(".math-result")).toContainText("寫完了！");
  await expect(page.locator(".math-result")).toContainText("沒有用提示");
  await page.getByRole("button", { name: "回到這一課" }).click();
  await expect(page.locator(".hanzi-character-card")).toHaveCount(9);
  expect(errors).toEqual([]);
});

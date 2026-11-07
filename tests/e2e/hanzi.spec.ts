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

test("第一冊 練習 picks a 生字 from the list, marks a stroke out of order, and goes on to the next", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("combobox", { name: "選擇教材" }).selectOption("kang-hsuan-grade1-book1");
  await expect(page.locator(".hanzi-journey .journey-card")).toHaveCount(7);
  await noOverflow(page);
  await page.getByRole("button", { name: /第一課，拍拍手/ }).click();
  await expect(page.locator(".hanzi-character-card")).toHaveCount(9);
  await expect(page.getByRole("button", { name: "聽寫，製作中" })).toBeDisabled();
  await noOverflow(page);

  // 練習 opens on the list of the lesson's 生字.
  await page.getByRole("button", { name: /^練習，9 個生字/ }).click();
  const list = page.getByRole("dialog", { name: "選一個字" });
  await expect(list.locator(".hanzi-character-card")).toHaveCount(9);
  await list.getByRole("button", { name: /練習「拍」/ }).click();
  await expect(list).toBeHidden();
  const step = page.locator(".hanzi-steps .is-current");
  await expect(step).toContainText("看一看");
  const canvas = page.locator(".hanzi-canvas");
  await canvas.scrollIntoViewIfNeeded();
  await noOverflow(page);
  // A touch during the demonstration goes on to tracing.
  await canvas.click({ position: { x: 4, y: 4 } });
  await expect(step).toContainText("描一描");

  const medians = data["拍"].medians;
  // The second stroke first: a red ✗, and nothing is inked.
  await write(page, canvas, medians[1]);
  await expect(page.locator(".hanzi-feedback")).toContainText("不是這一筆");
  await expect(page.locator(".hanzi-ink")).toHaveCount(0);
  for (const [i, median] of medians.entries()) {
    await write(page, canvas, median);
    await expect(page.locator(".hanzi-ink")).toHaveCount(i + 1);
  }
  // Then the same 生字 in an empty square.
  await expect(step).toContainText("寫一寫");
  for (const median of medians) await write(page, canvas, median);
  await expect(page.locator(".hanzi-feedback")).toContainText("寫對了");
  await expect(page.getByRole("button", { name: "再寫一次" })).toBeVisible();
  await page.getByRole("button", { name: "下一個字：手" }).click();
  await expect(page.locator(".hanzi-character")).toContainText("手");
  await expect(step).toContainText("看一看");

  // The list marks 拍 as written.
  await page.getByRole("button", { name: /生字清單/ }).click();
  await expect(list.getByRole("button", { name: "練習「拍」，練過了" })).toBeVisible();
  await list.getByRole("button", { name: "關閉" }).click();
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page.getByRole("button", { name: /練習「拍」.*練過了/ })).toBeVisible();
  expect(errors).toEqual([]);
});

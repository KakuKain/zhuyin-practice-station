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
  await expect(page.getByRole("button", { name: "照樣造句，製作中" })).toBeDisabled();
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

test("第一冊 聽寫 is heard only, judges each 國字 by its strokes, and leaves the 注音 to the parent", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("combobox", { name: "選擇教材" }).selectOption("kang-hsuan-grade1-book1");
  await page.getByRole("button", { name: /第一課，拍拍手/ }).click();
  await page.getByRole("button", { name: /^聽寫/ }).click();
  await page.getByRole("button", { name: /只考生字/ }).click();
  await expect(page.locator(".math-header")).toContainText("第 1 題 / 9");
  await noOverflow(page);
  const cells = page.locator(".hanzi-cell-canvas");
  await expect(cells).toHaveCount(1);

  // The question is heard; only the parent's peek shows it.
  const peek = page.locator(".hanzi-parent-peek");
  for (let index = 0; index < 9; index++) {
    await peek.click();
    const character = (await peek.textContent())!.trim().at(-1)!;
    const canvas = cells.first();
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    const square = box.width * 0.75;
    const medians = data[character].medians;
    // The first 生字 is written with its first two strokes swapped.
    const order = medians.map((_, i) => i);
    if (index === 0) [order[0], order[1]] = [order[1], order[0]];
    for (const i of order) {
      const at = ([x, y]: number[]) =>
        [box.x + (square * x) / 1024, box.y + (square * (900 - y)) / 1024] as const;
      await page.mouse.move(...at(medians[i][0]));
      await page.mouse.down();
      for (const point of medians[i].slice(1)) await page.mouse.move(...at(point), { steps: 3 });
      await page.mouse.up();
    }
    await page.getByRole("button", { name: index === 8 ? "寫好了" : "下一題" }).click();
  }

  // The parent's check: eight 國字 judged right, the swapped one not.
  await expect(page.locator(".hanzi-check-item")).toHaveCount(9);
  await expect(page.locator(".hanzi-check-verdict.is-right")).toHaveCount(8);
  await expect(page.locator(".hanzi-check-verdict.is-wrong")).toHaveCount(1);
  const finish = page.locator(".hanzi-check .hanzi-go-next");
  await expect(finish).toBeDisabled();
  for (const button of await page.locator(".hanzi-check-zhuyin .is-right").all())
    await button.click();
  await expect(finish).toBeEnabled();
  await finish.click();
  await expect(page.locator(".math-result")).toContainText("要再練的");
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("第一冊 語詞 practice traces a word's 國字 stroke by stroke and leaves its 注音 to the child", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("combobox", { name: "選擇教材" }).selectOption("kang-hsuan-grade1-book1");
  await page.getByRole("button", { name: /第一課，拍拍手/ }).click();
  await page.getByRole("button", { name: /^練習，9 個生字/ }).click();
  // The list opens first; its own 生字｜語詞 switch changes to the 語詞.
  await page
    .getByRole("dialog", { name: "選一個字" })
    .locator(".hanzi-kind button", { hasText: "語詞" })
    .click();
  const list = page.getByRole("dialog", { name: "選一個語詞" });
  await expect(list.locator(".hanzi-word-card")).toHaveCount(10);
  await list.getByRole("button", { name: /練習「拍手」/ }).click();
  await expect(page.locator(".hanzi-steps .is-current")).toContainText("看一看");
  await page.getByRole("button", { name: "開始描" }).click();
  const next = page.getByRole("button", { name: "描好了" });
  await expect(next).toBeDisabled();
  await noOverflow(page);

  const cells = page.locator(".hanzi-cell-canvas");
  await expect(cells).toHaveCount(2);
  const writeIn = async (cell: number, character: string, order?: number[]) => {
    const canvas = cells.nth(cell);
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    const square = box.width * 0.75;
    const medians = data[character].medians;
    for (const i of order ?? medians.map((_, k) => k)) {
      const at = ([x, y]: number[]) =>
        [box.x + (square * x) / 1024, box.y + (square * (900 - y)) / 1024] as const;
      await page.mouse.move(...at(medians[i][0]));
      await page.mouse.down();
      for (const point of medians[i].slice(1)) await page.mouse.move(...at(point), { steps: 3 });
      await page.mouse.up();
      await page.waitForTimeout(260);
    }
  };
  // 拍's second stroke first gets a ✗; then both 生字 in order.
  await writeIn(0, "拍", [1]);
  await expect(page.locator(".hanzi-mark")).toHaveCount(1);
  await page.waitForTimeout(600);
  await writeIn(0, "拍");
  await writeIn(1, "手");
  await expect(page.locator(".hanzi-cell.is-complete")).toHaveCount(2);
  await next.click();
  await expect(page.locator(".hanzi-steps .is-current")).toContainText("寫一寫");
  await writeIn(0, "拍");
  await writeIn(1, "手");
  await page.getByRole("button", { name: "寫好了" }).click();
  await expect(page.getByRole("button", { name: "下一個語詞：你好" })).toBeVisible();
  expect(errors).toEqual([]);
});

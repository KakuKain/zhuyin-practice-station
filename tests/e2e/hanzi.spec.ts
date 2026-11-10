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
  await expect(page.locator(".hanzi-journey .journey-card")).toHaveCount(9);
  await noOverflow(page);
  await page.getByRole("button", { name: /第一課，拍拍手/ }).click();
  await expect(page.locator(".hanzi-character-card")).toHaveCount(9);
  await expect(page.getByRole("button", { name: "照樣造句，看例句填空格" })).toBeEnabled();
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

  // The question is heard; only the parent's peek shows it. Three are written, the rest left.
  const peek = page.locator(".hanzi-parent-peek");
  for (let index = 0; index < 9; index++) {
    if (index < 3) {
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
        for (const point of medians[i].slice(1)) await page.mouse.move(...at(point));
        await page.mouse.up();
      }
    }
    await page.getByRole("button", { name: index === 8 ? "寫好了" : "下一題" }).click();
  }

  // The parent's check: two 國字 judged right, the swapped one and the empty ones not.
  await expect(page.locator(".hanzi-check-item")).toHaveCount(9);
  await expect(page.locator(".hanzi-check-verdict.is-right")).toHaveCount(2);
  await expect(page.locator(".hanzi-check-verdict.is-wrong")).toHaveCount(7);
  await expect(page.getByRole("button", { name: "看筆順" })).toHaveCount(3);
  const finish = page.locator(".hanzi-check .hanzi-go-next");
  await expect(finish).toBeDisabled();
  for (const group of await page.getByRole("group", { name: /題的注音$/ }).all())
    await group.getByRole("button", { name: "對" }).click();
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

test("第一冊 照樣造句 shows the book's example, fills the pattern's blanks and ends with the parent's marks", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("combobox", { name: "選擇教材" }).selectOption("kang-hsuan-grade1-book1");
  await page.getByRole("button", { name: /第三課，秋千/ }).click();
  await page.getByRole("button", { name: "照樣造句，看例句填空格" }).click();
  await expect(page.locator(".math-header")).toContainText("第 1 題 / 3");
  await expect(page.locator(".hanzi-example-text")).toContainText("一");
  await noOverflow(page);
  if ((page.viewportSize()?.width ?? 1000) < 600) {
    // Phones: one column of cells that never scrolls sideways, with blank paper beside it to
    // scroll the page, and the buttons kept on the screen.
    const pattern = page.locator(".hanzi-pattern");
    expect(await pattern.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    const cell = (await page.locator(".hanzi-cell").first().boundingBox())!;
    expect(cell.x).toBeGreaterThan(40);
    const next = (await page.getByRole("button", { name: "下一題" }).boundingBox())!;
    expect(next.y + next.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  for (let index = 0; index < 3; index++) {
    const cells = page.locator(".hanzi-cell-canvas");
    await expect(cells.first()).toBeVisible();
    // A short line in the first blank cell stands for a word.
    const canvas = cells.first();
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.width * 0.35);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.width * 0.35, { steps: 4 });
    await page.mouse.up();
    await page.getByRole("button", { name: index === 2 ? "寫好了" : "下一題" }).click();
  }
  await expect(page.locator(".hanzi-sentence-check")).toHaveCount(3);
  await expect(page.locator(".hanzi-sentence-check .ink-preview path")).toHaveCount(3);
  const finish = page.locator(".hanzi-check .hanzi-go-next");
  await expect(finish).toBeDisabled();
  for (const group of await page.getByRole("group", { name: /^第 \d 句$/ }).all())
    await group.getByRole("button", { name: "對" }).click();
  await finish.click();
  await expect(page.locator(".math-result")).toContainText("照樣造句完成");
  expect(errors).toEqual([]);
});

/** Traces the stroke 描一描 shows, along its arrow (the hint path, in the 1024 box). */
async function traceShown(page: Page) {
  const canvas = page.locator(".stroke-trace .hanzi-canvas");
  const d = (await page.locator(".stroke-trace .hanzi-hint-path").getAttribute("d"))!;
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const median: number[][] = [];
  // write() takes the data's y (up from 900); the hint path's y already points down.
  for (let i = 0; i + 1 < numbers.length; i += 2) median.push([numbers[i], 900 - numbers[i + 1]]);
  await write(page, canvas, median);
}

test("第一冊 認識國字基本筆畫 traces each stroke, then finds strokes by name and in a character", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("combobox", { name: "選擇教材" }).selectOption("kang-hsuan-grade1-book1");
  await page.getByRole("button", { name: /認識國字基本筆畫/ }).click();
  await expect(page.locator(".stroke-chart-card")).toHaveCount(28);
  await expect(page.locator(".stroke-page-card")).toHaveCount(4);
  await noOverflow(page);

  await page.getByRole("button", { name: /課本第 8 頁/ }).click();
  await expect(page.locator(".math-header")).toContainText("第 1 題 / 12");
  // Written backwards, the 橫 is not right.
  const d = (await page.locator(".stroke-trace .hanzi-hint-path").getAttribute("d"))!;
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const backwards: number[][] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2)
    backwards.unshift([numbers[i], 900 - numbers[i + 1]]);
  await write(page, page.locator(".stroke-trace .hanzi-canvas"), backwards);
  await expect(page.locator(".hanzi-feedback")).toContainText("再試一次");
  await page.waitForTimeout(800);
  for (let i = 0; i < 6; i++) {
    await traceShown(page);
    await expect(page.locator(".hanzi-feedback")).toContainText("描對了");
    await page.getByRole("button", { name: "下一題" }).click();
  }
  await noOverflow(page);

  // 聽名稱找筆畫 and 在字裡找筆畫: retried until right.
  for (let i = 0; i < 3; i++) {
    await expect(page.locator(".stroke-question.is-pick")).toBeVisible();
    for (const choice of await page.locator(".stroke-choice").all()) {
      await choice.click();
      if (await page.locator(".math-feedback.is-correct").isVisible()) break;
      await expect(page.locator(".math-feedback")).toBeHidden();
    }
    await expect(page.locator(".math-feedback")).toBeHidden();
  }
  for (let i = 0; i < 3; i++) {
    const glyph = page.locator(".stroke-find-glyph");
    await expect(glyph).toBeVisible();
    const count = await page.locator(".stroke-find-part").count();
    for (let stroke = 0; stroke < count; stroke++) {
      const point = await page
        .locator(".stroke-find-part")
        .nth(stroke)
        .evaluate((path) => {
          const element = path as SVGPathElement;
          const at = element.getPointAtLength(element.getTotalLength() * 0.25);
          const screen = new DOMPoint(at.x, at.y).matrixTransform(element.getScreenCTM()!);
          return { x: screen.x, y: screen.y };
        });
      await page.mouse.click(point.x, point.y);
      if (await page.locator(".math-feedback.is-correct").isVisible()) break;
      await expect(page.locator(".math-feedback")).toBeHidden();
    }
    await expect(page.locator(".math-feedback")).toBeHidden();
  }
  await expect(page.locator(".math-result")).toContainText("筆畫練習完成");
  expect(errors).toEqual([]);
});

test("第一冊 閱讀階梯 orders the story's scenes, then answers questions by a tap", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("combobox", { name: "選擇教材" }).selectOption("kang-hsuan-grade1-book1");
  await page.getByRole("button", { name: "閱讀階梯，擁抱" }).click();
  await expect(page.locator(".reading-first")).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: /開始練習/ }).click();
  await expect(page.locator(".math-header")).toContainText("第 1 題 / 6");

  // 排一排: a scene out of the story's order is retried, then the four in order are numbered.
  const story = [
    "大家都不敢靠近小刺蝟",
    "青蛙大叫，跳走了",
    "小象被刺到，痛得抬起腳",
    "小女孩的氣球卡在樹上",
    "小刺蝟爬上樹，拿下氣球",
    "小熊抱住小刺蝟",
  ];
  const shown = await page
    .locator(".reading-scene")
    .evaluateAll((scenes) => scenes.map((scene) => scene.getAttribute("aria-label")!));
  shown.sort((a, b) => story.indexOf(a) - story.indexOf(b));
  await page.getByRole("button", { name: shown[3], exact: true }).click();
  await expect(page.locator(".math-feedback.is-retry")).toBeVisible();
  await expect(page.locator(".math-feedback")).toBeHidden();
  for (const scene of shown) await page.getByRole("button", { name: scene, exact: true }).click();
  await expect(page.locator(".reading-scene-number")).toHaveCount(4);
  await noOverflow(page);

  for (let i = 0; i < 5; i++) {
    await expect(page.locator(".reading-choices")).toBeVisible();
    await noOverflow(page);
    for (const choice of await page.locator(".reading-choice, .reading-sentence-pick").all()) {
      await choice.click();
      if (await page.locator(".math-feedback.is-correct").isVisible()) break;
      await expect(page.locator(".math-feedback")).toBeHidden();
    }
    await expect(page.locator(".math-feedback")).toBeHidden();
  }
  await expect(page.locator(".math-result")).toContainText("閱讀練習完成");
  expect(errors).toEqual([]);
});

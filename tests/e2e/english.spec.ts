import { expect, test, type Locator, type Page } from "@playwright/test";

async function stroke(page: Page, canvas: Locator, points: [number, number][]) {
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const at = ([x, y]: [number, number]) =>
    [box.x + (box.width * x) / 100, box.y + (box.height * y) / 100] as const;
  await page.mouse.move(...at(points[0]));
  await page.mouse.down();
  for (const point of points.slice(1)) await page.mouse.move(...at(point));
  await page.mouse.up();
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

test("英語第一課 認一認 is answered by tapping, from letters to a dialogue", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "英語", exact: true }).click();
  await expect(page.getByRole("button", { name: /英語複習一.*製作中/ })).toBeDisabled();
  await page.getByRole("button", { name: /英語第一課/ }).click();
  await expect(page.locator(".english-letter-card")).toHaveCount(3);
  await noOverflow(page);
  await page.getByRole("button", { name: "認一認，點選練習" }).click();
  const header = page.locator(".math-header");
  await expect(header).toContainText("第 1 題 / 11");
  await expect(page.locator(".english-question")).toHaveClass(/is-hear-letter/);

  // Without sound, each question is answered by trying its choices until one is right.
  const result = page.locator(".math-result");
  for (let index = 1; index <= 11; index++) {
    if (index === 11) await expect(page.locator(".english-question")).toHaveClass(/is-dialogue/);
    await noOverflow(page);
    const stillHere = async () =>
      !(await result.isVisible()) && (await header.textContent())!.includes(`第 ${index} 題 `);
    for (let attempt = 0; attempt < 20 && (await stillHere()); attempt++) {
      // A right tap stays marked (find-all, word order); a wrong one clears after a moment.
      const open = page.locator(".english-choice:not(.is-picked)");
      await open.nth(attempt % (await open.count())).click();
      await page.waitForTimeout(1000);
    }
  }
  await expect(page.locator(".math-result")).toContainText("認一認練完了！");
  expect(errors).toEqual([]);
});

test("英語第二課 寫一寫 traces, writes on four lines, keeps the round and ends with the parent's check", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "英語", exact: true }).click();
  await page.getByRole("button", { name: /英語第二課/ }).click();
  await page.getByRole("button", { name: "寫一寫，手寫練習" }).click();
  const header = page.locator(".math-header");
  await expect(header).toContainText("第 1 題 / 10");
  // 描一描 shows the letter to trace, with a blue dot where each stroke starts.
  await expect(page.locator(".english-paper .english-glyph.is-trace")).toHaveCount(2);
  await expect(page.locator(".english-start circle").first()).toBeVisible();

  for (let index = 1; index <= 10; index++) {
    await expect(header).toContainText(`第 ${index} 題`);
    await noOverflow(page);
    const squares = page.locator(".english-paper canvas");
    for (let square = 0; square < (await squares.count()); square++)
      await stroke(page, squares.nth(square), [
        [30, 35],
        [50, 70],
        [70, 35],
      ]);
    if (index === 10) {
      await expect(page.locator(".english-question")).toHaveClass(/is-write-missing/);
      // The row shows what was written in each blank.
      await expect(
        page
          .locator(
            ".english-row-letter.is-blank .ink-preview path, .english-row-letter.is-blank .ink-preview polyline",
          )
          .first(),
      ).toBeVisible();
      break;
    }
    await page.getByRole("button", { name: "下一題", exact: true }).click();
  }

  // A reload keeps the round; the lesson page offers to continue it.
  await page.reload();
  await page.getByRole("button", { name: "英語", exact: true }).click();
  await page.getByRole("button", { name: /英語第二課/ }).click();
  await page.getByRole("button", { name: "繼續寫一寫" }).click();
  await expect(header).toContainText("第 10 題");
  await page.getByRole("button", { name: "寫完了，請家長檢查" }).click();
  await expect(page.locator(".english-check-card")).toHaveCount(10);
  // Every question was written, so none starts marked.
  await expect(page.getByRole("button", { name: "✓ 需要補強" })).toHaveCount(0);
  await page
    .locator(".english-check-card")
    .first()
    .getByRole("button", { name: "需要補強" })
    .click();
  await page.getByRole("button", { name: "檢查完成" }).click();
  await expect(page.locator(".math-result")).toContainText("有 1 題要再練習");
  const saved = await page.evaluate(() => localStorage.getItem("kid-english-round-v1-2"));
  expect(saved).toBeNull();
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kid-english-records-v1") ?? "{}"),
  );
  expect(records.rounds).toHaveLength(1);
  expect(records.rounds[0]).toMatchObject({ lessonId: 2, mode: "write", total: 10 });
  expect(errors).toEqual([]);
});

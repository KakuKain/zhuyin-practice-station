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

test("第二課 has things lined up before comparing, lets a wrong tap be tried again and records it", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "數學", exact: true }).click();
  await page.getByRole("button", { name: /數學第二課/ }).click();
  await page.getByRole("button", { name: "開始練習" }).click();

  const header = page.locator(".math-header small");
  // A clip played before comes from the cache, so check what it says rather than its file.
  const audio = page.locator("audio");
  const spoken = (sentence: RegExp) => expect(audio).toHaveAttribute("data-clip-text", sentence);
  const status = page.locator(".compare-question [role=status]");
  const items = page.locator(".compare-item");
  // A pencil's length is its width; a child's height is its height.
  const sizes = () =>
    items.evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return element.classList.contains("is-pencil") ? box.width : box.height;
      }),
    );
  const rightIndex = async () => {
    const values = await sizes();
    const more = /比較(長|高)/.test((await audio.getAttribute("data-clip-text")) ?? "");
    return values.indexOf(more ? Math.max(...values) : Math.min(...values));
  };
  const drag = async (item: Locator, dx: number, dy: number) => {
    const box = (await item.boundingBox())!;
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let step = 1; step <= 10; step++) await page.mouse.move(x + dx * step, y + dy * step);
    await page.mouse.up();
  };
  const answeredRight = async (question: number) => {
    await expect(status).toHaveText("答對了！");
    await spoken(/^答對了！$/);
    if (question < 8) await expect(header).toHaveText(`第 ${question + 1} 題 / 8`);
  };
  // Tries each choice, the way a guessing child would, until the question is answered.
  const tapUntilRight = async (choices: Locator, question: number) => {
    for (let index = 0; ; index++) {
      await choices.nth(index).click();
      if ((await status.textContent()) === "答對了！") return answeredRight(question);
      await expect(status).toHaveText("");
    }
  };

  // 1 比長短, lined up: answer straight away.
  await expect(header).toHaveText("第 1 題 / 8");
  await expect(audio).toHaveAttribute("src", /math-audio\/length-(more|less)\.m4a/);
  await spoken(/哪一枝鉛筆比較(長|短)/);
  await expect(page.locator(".compare-hint")).toHaveCount(0);
  await items.nth(await rightIndex()).click();
  await answeredRight(1);

  // 2 比長短, out of line: a hand shows the drag, and only lined-up pencils can be compared.
  await spoken(/先把每一枝鉛筆拉到紅線/);
  await expect(page.locator(".compare-hint")).toBeVisible();
  await expect(page.locator(".compare-item.is-movable")).toHaveCount(2);
  const line = (await page.locator(".compare-start-line").boundingBox())!;
  await drag(items.first(), -60, 0);
  await expect(page.locator(".compare-hint")).toHaveCount(0);
  await expect(page.locator(".compare-item.is-movable")).toHaveCount(1);
  expect(Math.abs((await items.first().boundingBox())!.x - line.x)).toBeLessThan(6);
  // A tap slides the other pencil to the line too; then the question is asked.
  await page.locator(".compare-item.is-movable").click();
  await expect(page.locator(".compare-item.is-movable")).toHaveCount(0);
  await spoken(/哪一枝鉛筆比較(長|短)/);
  await page.waitForTimeout(500);
  const right = await rightIndex();
  await items.nth(1 - right).click();
  await expect(status).toHaveText("再想想看");
  await spoken(/^再想想看。$/);
  await expect(header).toHaveText("第 2 題 / 8");
  await expect(status).toHaveText("");
  await items.nth(right).click();
  await answeredRight(2);

  // 3 比高矮, standing on the ground.
  await spoken(/哪一個小朋友比較(高|矮)/);
  await items.nth(await rightIndex()).click();
  await answeredRight(3);

  // 4 比高矮: one child stands on a box and is dragged down to the ground.
  await spoken(/先把小朋友拉到地上/);
  await expect(page.locator(".compare-box")).toHaveCount(1);
  await drag(page.locator(".compare-item.is-movable"), 0, 40);
  await expect(page.locator(".compare-item.is-movable")).toHaveCount(0);
  await spoken(/哪一個小朋友比較(高|矮)/);
  await page.waitForTimeout(500);
  await items.nth(await rightIndex()).click();
  await answeredRight(4);

  // 5–6 排順序: each tap shows its place, from the shortest up.
  for (const question of [5, 6]) {
    await spoken(/先點最(短|矮)的/);
    const values = await sizes();
    const order = values
      .map((value, index) => ({ value, index }))
      .sort((a, b) => a.value - b.value)
      .map((item) => item.index);
    await items.nth(order[0]).click();
    await items.nth(order[1]).click();
    await expect(page.locator(".compare-pick-number")).toHaveCount(2);
    await items.nth(order[2]).click();
    await answeredRight(question);
  }

  // 7 直線和曲線, 8 哪條路最近: a wrong guess can be tried again.
  await spoken(/哪一條是(直|曲)線/);
  await tapUntilRight(page.locator(".compare-lines button"), 7);
  await spoken(/哪一條路最近/);
  await expect(page.getByRole("img", { name: "小兔子" })).toBeVisible();
  await tapUntilRight(page.locator(".compare-route .route-flag"), 8);

  await expect(page.getByRole("heading", { name: "練習完成！" })).toBeVisible();
  await expect(page.locator(".compare-result-topics")).toContainText("比長短（先對齊）");
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kid-math-records-v1") ?? "{}"),
  );
  expect(records.rounds).toHaveLength(1);
  expect(records.rounds[0]).toMatchObject({ lessonId: 2, total: 8 });
  expect(records.rounds[0].needsPractice[0]).toEqual({ kind: "比長短（先對齊）" });
  expect(errors).toEqual([]);
});

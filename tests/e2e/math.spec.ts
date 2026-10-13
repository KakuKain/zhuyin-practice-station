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
  await page.getByRole("button", { name: "開始練習", exact: true }).click();

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

  // 畫圈圈: one circle in each cell of a 十格框; filled cells are numbered in reading order.
  await expect(page.locator(".math-header")).toContainText("第 5 題 / 8");
  await expect(page.locator("audio")).toHaveAttribute("src", /math-audio\/draw-\d+\.m4a/);
  const cells = page.locator(".math-draw .math-frame canvas");
  await expect(cells).toHaveCount(10);
  // Drawn in the second row first, then the first row: numbered by place, not by time.
  await stroke(page, cells.nth(6), circle(50, 50));
  await stroke(page, cells.nth(0), circle(50, 50));
  await expect(page.locator(".math-frame-number")).toHaveText(["1", "2"]);
  // 復原 takes back the latest circle; drawing it again restores two.
  await page.getByRole("button", { name: /^復原畫出/ }).click();
  await expect(page.locator(".math-frame-number")).toHaveCount(1);
  await stroke(page, cells.nth(1), circle(50, 50));

  // A reload continues the same round where it was.
  await page.reload();
  await page.getByRole("button", { name: /數學第一課/ }).click();
  await page.getByRole("button", { name: "繼續上次的練習" }).click();
  await expect(page.locator(".math-header")).toContainText("第 5 題 / 8");
  await expect(page.locator(".math-frame-number")).toHaveCount(2);

  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "下一題", exact: true }).click();
  await page.getByRole("button", { name: "寫完了，請家長檢查" }).click();
  const cards = page.locator(".math-check-card");
  await expect(cards).toHaveCount(8);
  // Answered questions start unmarked; unanswered ones start as 需要補強.
  await expect(cards.nth(0).locator(".math-check-toggle")).toHaveAttribute("aria-pressed", "false");
  await expect(cards.nth(1).locator(".math-check-toggle")).toHaveAttribute("aria-pressed", "true");
  await expect(cards.nth(4).locator(".math-check-toggle")).toHaveAttribute("aria-pressed", "false");
  await expect(cards.nth(4)).toContainText("畫了 2 格");
  await cards.nth(0).locator(".math-check-toggle").click();
  await page.getByRole("button", { name: "檢查完成" }).click();
  await expect(page.getByRole("heading", { name: "這一課練完了！" })).toBeVisible();
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kid-math-records-v1") ?? "{}"),
  );
  expect(records.rounds).toHaveLength(1);
  expect(records.rounds[0].needsPractice.length).toBe(7);
  expect(await page.evaluate(() => localStorage.getItem("kid-math-round-v1"))).toBeNull();

  // Back to the lesson page, then the course list, which stays on 數學 for this child.
  await page.getByRole("button", { name: "回到這一課" }).click();
  await expect(page.getByRole("button", { name: "開始練習", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "回到課程" }).click();
  await expect(page.getByRole("button", { name: "數學", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(errors).toEqual([]);
});

test("畫圈圈 boxes extra circles in red, erases a chosen one, and shows too many or too few to the parent", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  // A saved round: 畫出 2 個圈圈 and 畫出 4 個圈圈, each with two circles drawn.
  await page.evaluate(() => {
    const circle = Array.from({ length: 13 }, (_, step) => ({
      x: 50 + 30 * Math.cos((step / 12) * Math.PI * 2),
      y: 50 + 30 * Math.sin((step / 12) * Math.PI * 2),
    }));
    const cells = () => Array.from({ length: 10 }, (_, index) => (index < 2 ? [circle] : []));
    localStorage.setItem(
      "kid-math-round-v1",
      JSON.stringify({
        version: 1,
        lessonId: 1,
        questions: [
          { kind: "draw", target: 2 },
          { kind: "draw", target: 4 },
        ],
        ink: {},
        work: { 0: cells(), 1: cells() },
        index: 0,
        phase: "active",
        needsPractice: [],
        createdAt: 1,
        savedAt: Date.now(),
      }),
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "數學", exact: true }).click();
  await page.getByRole("button", { name: /數學第一課/ }).click();
  await page.getByRole("button", { name: "繼續上次的練習" }).click();

  const frame = page.locator(".math-draw .math-frame");
  const cells = frame.locator("canvas");
  const boxes = frame.locator(".math-frame-cell");
  const status = page.locator(".math-frame-over");
  // What the status says, without the 國字注音 glyphs drawn beside it for sighted readers.
  const said = () =>
    expect.poll(() =>
      status.evaluate((element) => {
        const copy = element.cloneNode(true) as HTMLElement;
        copy.querySelectorAll("[aria-hidden=true]").forEach((hidden) => hidden.remove());
        return copy.textContent?.replace(/\s+/g, " ").trim();
      }),
    );
  const undo = page.getByRole("button", { name: /^復原畫出/ });
  const eraser = page.getByRole("button", { name: /^擦掉一個圈圈/ });
  await expect(frame).not.toHaveClass(/is-over/);
  await said().toBe("");

  // Extra circles are counted in reading order, like the numbers on the cells.
  await stroke(page, cells.nth(7), circle(50, 50));
  await said().toBe("多畫了 1 個");
  await expect(undo).toHaveClass(/is-hint/);
  await stroke(page, cells.nth(2), circle(50, 50));
  await said().toBe("多畫了 2 個");
  await expect(frame.locator(".math-frame-cell.is-extra")).toHaveCount(2);

  // The eraser takes away the one circle tapped, then the pen is back; 復原 brings it back.
  await eraser.click();
  await expect(eraser).toHaveAttribute("aria-pressed", "true");
  await expect(frame.locator(".math-frame-erase")).toHaveCount(4);
  await cells.nth(0).click();
  await expect(eraser).toHaveAttribute("aria-pressed", "false");
  await expect(boxes.nth(0)).not.toHaveClass(/is-used/);
  await said().toBe("多畫了 1 個");
  await expect(boxes.nth(7)).toHaveClass(/is-extra/);
  await undo.click();
  await expect(boxes.nth(0)).toHaveClass(/is-used/);
  await said().toBe("多畫了 2 個");
  await undo.click();
  await said().toBe("多畫了 1 個");
  await expect(boxes.nth(2)).not.toHaveClass(/is-used/);
  // With the eraser on, drawing in an empty cell just draws.
  await eraser.click();
  await stroke(page, cells.nth(9), circle(50, 50));
  await expect(eraser).toHaveAttribute("aria-pressed", "false");
  await said().toBe("多畫了 2 個");
  await undo.click();
  await said().toBe("多畫了 1 個");

  // Too few is not shown while the child draws.
  await page.getByRole("button", { name: "下一題", exact: true }).click();
  await said().toBe("");
  await expect(frame.locator(".is-missing, .is-extra")).toHaveCount(0);

  // The parent sees the extra cell in a red box and the missing ones as dashed circles.
  await page.getByRole("button", { name: "寫完了，請家長檢查" }).click();
  const over = page.locator(".math-check-card").nth(0);
  await expect(over).toContainText("畫了 3 格，多畫 1 格");
  await expect(over.locator(".math-frame-cell.is-extra")).toHaveCount(1);
  const drawn = over.locator(".math-frame.is-preview .ink-preview");
  await expect(drawn).toHaveCount(3);
  for (const preview of await drawn.all()) {
    const [inner, cell] = await Promise.all([
      preview.boundingBox(),
      preview.locator("xpath=..").boundingBox(),
    ]);
    expect(Math.abs(inner!.height - cell!.height)).toBeLessThan(2);
  }
  const short = page.locator(".math-check-card").nth(1);
  await expect(short).toContainText("畫了 2 格，少畫 2 格");
  const missing = short.locator(".math-frame-cell");
  await expect(short.locator(".math-frame-cell.is-missing")).toHaveCount(2);
  await expect(missing.nth(2)).toHaveClass(/is-missing/);
  await expect(missing.nth(3)).toHaveClass(/is-missing/);
  expect(errors).toEqual([]);
});

test("第二課 比長短 has things lined up before comparing, lets a wrong tap be tried again and records it", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "數學", exact: true }).click();
  await page.getByRole("button", { name: /數學第二課/ }).click();
  await page.getByRole("button", { name: "開始練習", exact: true }).click();

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
    if (question < 6) await expect(header).toHaveText(`第 ${question + 1} 題 / 6`);
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
  await expect(header).toHaveText("第 1 題 / 6");
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
  await expect(header).toHaveText("第 2 題 / 6");
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

  // 5 直線和曲線, 6 哪條路最近: a wrong guess can be tried again.
  await spoken(/哪一條是(直|曲)線/);
  await tapUntilRight(page.locator(".compare-lines button"), 5);
  await spoken(/哪一條路最近/);
  await expect(page.getByRole("img", { name: "小兔子" })).toBeVisible();
  await tapUntilRight(page.locator(".compare-route .route-flag"), 6);

  await expect(page.getByRole("heading", { name: "這一課練完了！" })).toBeVisible();
  await expect(page.locator(".math-result")).toContainText("比長短（先對齊）");
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kid-math-records-v1") ?? "{}"),
  );
  expect(records.rounds).toHaveLength(1);
  expect(records.rounds[0]).toMatchObject({ lessonId: 2, total: 6 });
  expect(records.rounds[0].needsPractice[0]).toEqual({ kind: "比長短（先對齊）" });
  expect(errors).toEqual([]);
});

test("分與合's 加法 adds with pictures and circles, keeps 第一課's round and ends with the parent's check", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "數學", exact: true }).click();

  // An unfinished 第一課 round stays saved while 第四課 分與合 is practised.
  await page.getByRole("button", { name: /數學第一課/ }).click();
  await page.getByRole("button", { name: "開始練習", exact: true }).click();
  await stroke(page, page.getByLabel("寫數字"), [
    [30, 30],
    [60, 70],
  ]);
  // 返回 goes back to the lesson page, which now offers to continue.
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page.getByRole("button", { name: "繼續上次的練習" })).toBeVisible();
  await page.getByRole("button", { name: "回到課程" }).click();

  await page.getByRole("button", { name: /數學第四課/ }).click();
  await page.getByRole("button", { name: "開始練習", exact: true }).click();
  const header = page.locator(".math-header");
  const audio = page.locator("audio");
  // 加法 follows the 分合圖 questions.
  for (let i = 0; i < 6; i++)
    await page.getByRole("button", { name: "下一題", exact: true }).click();

  // 合在一起: the pictures can be marked, and the total is written.
  await expect(header).toContainText("合在一起");
  await expect(header).toContainText("第 7 題 / 10");
  await expect(audio).toHaveAttribute("src", /math-audio\/join-\d-\d\.m4a/);
  await expect(audio).toHaveAttribute("data-clip-text", /^左邊有.個，右邊有.個，合在一起有幾個？$/);
  const picture = page.locator(".math-join-group button").first();
  await picture.click();
  await expect(picture).toHaveAttribute("aria-pressed", "true");
  await stroke(page, page.getByLabel("寫答案", { exact: true }), [
    [40, 20],
    [55, 80],
  ]);
  for (let i = 0; i < 2; i++)
    await page.getByRole("button", { name: "下一題", exact: true }).click();

  // 畫圈圈算加法: each side numbers its own circles; the answer has its own square.
  await expect(header).toContainText("畫圈圈算加法");
  await expect(audio).toHaveAttribute("data-clip-text", /^.加.等於多少？先畫圈圈，再寫答案。$/);
  // A 十格框 for each number (cells 0–9 and 10–19), then the answer square.
  const frames = page.locator(".math-add-side .math-frame");
  await expect(frames).toHaveCount(2);
  await stroke(page, page.locator("canvas[data-word-index='0']"), circle(50, 50));
  await stroke(page, page.locator("canvas[data-word-index='1']"), circle(50, 50));
  await stroke(page, page.locator("canvas[data-word-index='10']"), circle(50, 50));
  await stroke(page, page.locator("canvas[data-word-index='20']"), [
    [30, 25],
    [70, 25],
    [40, 80],
  ]);
  const numbers = (side: number) => frames.nth(side).locator(".math-frame-number");
  await expect(numbers(0)).toHaveText(["1", "2"]);
  await expect(numbers(1)).toHaveText(["1"]);

  // A reload continues 分與合 with its circles.
  await page.reload();
  await page.getByRole("button", { name: /數學第四課/ }).click();
  await page.getByRole("button", { name: "繼續上次的練習" }).click();
  await expect(header).toContainText("第 9 題 / 10");
  await expect(numbers(0)).toHaveCount(2);
  await expect(numbers(1)).toHaveCount(1);

  await page.getByRole("button", { name: "下一題", exact: true }).click();
  await page.getByRole("button", { name: "寫完了，請家長檢查" }).click();
  const cards = page.locator(".math-check-card");
  await expect(cards).toHaveCount(10);
  await expect(cards.nth(0).locator(".math-check-toggle")).toHaveAttribute("aria-pressed", "true");
  await expect(cards.nth(6).locator(".math-check-toggle")).toHaveAttribute("aria-pressed", "false");
  await expect(cards.nth(7).locator(".math-check-toggle")).toHaveAttribute("aria-pressed", "true");
  await expect(cards.nth(8).locator(".math-check-toggle")).toHaveAttribute("aria-pressed", "false");
  await expect(cards.nth(8).locator("figcaption")).toHaveText([/畫了 2 格/, /畫了 1 格/]);
  await page.getByRole("button", { name: "檢查完成" }).click();
  await expect(page.getByRole("heading", { name: "這一課練完了！" })).toBeVisible();
  await expect(page.locator(".math-result")).toContainText("＋");

  const stored = await page.evaluate(() => ({
    records: JSON.parse(localStorage.getItem("kid-math-records-v1") ?? "{}"),
    lesson1: localStorage.getItem("kid-math-round-v1"),
    lesson3: localStorage.getItem("kid-math-round-v1-3"),
  }));
  expect(stored.records.rounds).toHaveLength(1);
  expect(stored.records.rounds[0]).toMatchObject({ lessonId: 3, total: 10 });
  expect(stored.records.rounds[0].needsPractice).toHaveLength(8);
  expect(stored.records.rounds[0].needsPractice[0].parts).toHaveLength(2);
  expect(stored.lesson3).toBeNull();
  expect(JSON.parse(stored.lesson1!).lessonId).toBe(1);

  await page.getByRole("button", { name: "回到這一課" }).click();
  await page.getByRole("button", { name: "回到課程" }).click();
  await page.getByRole("button", { name: /數學第一課/ }).click();
  await expect(page.getByRole("button", { name: "繼續上次的練習" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("第四課 分與合 reads 分合圖: the missing part, the total and a way to split, then the parent checks", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "數學", exact: true }).click();
  await page.getByRole("button", { name: /數學第四課/ }).click();
  await expect(page.getByRole("heading", { name: "分與合" })).toBeVisible();
  await page.getByRole("button", { name: "開始練習", exact: true }).click();
  const header = page.locator(".math-header");
  const audio = page.locator("audio");
  const next = page.getByRole("button", { name: "下一題", exact: true });
  const four: [number, number][] = [
    [60, 15],
    [25, 65],
    [80, 65],
  ];

  // 分一分: the total and one part are given; the other part is written.
  await expect(header).toContainText("分一分");
  await expect(header).toContainText("第 1 題 / 10");
  await expect(audio).toHaveAttribute("src", /math-audio\/split-\d+-\d+\.m4a/);
  await expect(audio).toHaveAttribute("data-clip-text", /^.可以分成.和幾？$/);
  await expect(page.getByRole("group", { name: /^分合圖：\d+ 分成 \d+ 和 ？$/ })).toBeVisible();
  const picture = page.locator(".math-pictures button").first();
  await picture.click();
  await expect(picture).toHaveAttribute("aria-pressed", "true");
  await stroke(page, page.getByLabel("寫答案，在右下"), four);
  for (let i = 0; i < 3; i++) await next.click();

  // 合一合: both parts are given; the total is written on top.
  await expect(header).toContainText("合一合");
  await expect(audio).toHaveAttribute("data-clip-text", /^.和.合在一起是幾？$/);
  await expect(page.getByRole("group", { name: /^分合圖：\d+ 和 \d+ 合起來是 ？$/ })).toBeVisible();
  await stroke(page, page.getByLabel("寫答案，在上面"), four);

  // A reload continues 第四課 where it was, with what was written.
  await page.reload();
  await page.getByRole("button", { name: /數學第四課/ }).click();
  await page.getByRole("button", { name: "繼續上次的練習" }).click();
  await expect(header).toContainText("第 4 題 / 10");
  await expect(page.getByRole("button", { name: "清空答案" })).toBeEnabled();
  for (let i = 0; i < 2; i++) await next.click();

  // 分分看: only the total is given; any two numbers that make it are written.
  await expect(header).toContainText("分分看");
  await expect(audio).toHaveAttribute("data-clip-text", /^.+可以分成幾和幾？寫出一種分法。$/);
  // Only one of the two numbers: not answered yet.
  await stroke(page, page.getByLabel("寫第一個數，在左下"), four);
  for (let i = 0; i < 4; i++) await next.click();
  await page.getByRole("button", { name: "寫完了，請家長檢查" }).click();

  const cards = page.locator(".math-check-card");
  await expect(cards).toHaveCount(10);
  const marked = (index: number) => cards.nth(index).locator(".math-check-toggle");
  for (const [index, pending] of [
    [0, "false"],
    [1, "true"],
    [3, "false"],
    [4, "true"],
    [5, "true"],
  ] as const)
    await expect(marked(index)).toHaveAttribute("aria-pressed", pending);
  await expect(cards.nth(0)).toContainText("分成");
  await expect(cards.nth(0).locator(".math-bond.is-preview .ink-preview")).toHaveCount(1);
  await expect(cards.nth(5)).toContainText("兩個數合起來是");
  await expect(cards.nth(5).locator(".math-bond.is-preview .ink-preview")).toHaveCount(1);
  await page.getByRole("button", { name: "檢查完成" }).click();
  await expect(page.getByRole("heading", { name: "這一課練完了！" })).toBeVisible();

  const stored = await page.evaluate(() => ({
    records: JSON.parse(localStorage.getItem("kid-math-records-v1") ?? "{}"),
    round: localStorage.getItem("kid-math-round-v1-3"),
  }));
  expect(stored.records.rounds).toHaveLength(1);
  expect(stored.records.rounds[0]).toMatchObject({ lessonId: 3, total: 10 });
  expect(stored.records.rounds[0].needsPractice).toHaveLength(8);
  expect(stored.round).toBeNull();
  expect(errors).toEqual([]);
});

test("第三課 排順序、比多少 is tapped: 第幾個, 數的順序, 比多少 and 比大小, each tried until right", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "數學", exact: true }).click();
  // 第三課 comes before 分與合 in the list, though it was made later.
  await expect(page.locator(".math-journey .journey-card")).toHaveText([
    /第一課.*認識/,
    /第二課.*比長短/,
    /第三課.*排順序、比多少/,
    /第四課.*分與合/,
  ]);
  await page.getByRole("button", { name: /數學第三課/ }).click();
  await expect(page.getByRole("heading", { name: "排順序、比多少" })).toBeVisible();
  await page.getByRole("button", { name: "開始練習", exact: true }).click();

  const header = page.locator(".math-header small");
  const audio = page.locator("audio");
  const status = page.locator(".compare-question [role=status]");
  const spoken = (sentence: RegExp) => expect(audio).toHaveAttribute("data-clip-text", sentence);
  const answeredRight = async (question: number) => {
    await expect(status).toHaveText("答對了！");
    if (question < 8) await expect(header).toHaveText(`第 ${question + 1} 題 / 8`);
  };
  const tapUntilRight = async (choices: Locator, question: number) => {
    for (let index = 0; ; index++) {
      await choices.nth(index).click();
      if ((await status.textContent()) === "答對了！") return answeredRight(question);
      await expect(status).toHaveText("");
    }
  };
  const places: Record<string, number> = { 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
  const place = async () =>
    places[/第(.)個/.exec((await audio.getAttribute("data-clip-text")) ?? "")![1]];
  const items = page.locator(".sequence-item");

  // 1 第幾個, from the left: the place counts from the marked end.
  await expect(header).toHaveText("第 1 題 / 8");
  await expect(audio).toHaveAttribute("src", /math-audio\/position-left-\d\.m4a/);
  await spoken(/^從左邊數，第.個是哪一個？點一下。$/);
  await items.nth((await place()) - 1).click();
  await answeredRight(1);

  // 2 第幾個, from the right: the first picture is never the answer, so it is a retry.
  await spoken(/^從右邊數，第.個是哪一個？點一下。$/);
  const fromRight = await place();
  await items.first().click();
  await expect(status).toHaveText("再想想看");
  await expect(status).toHaveText("");
  await items.nth((await items.count()) - fromRight).click();
  await answeredRight(2);

  // 3 數的順序: the missing number fills the gap.
  await spoken(/^中間少了哪一個數？點一下。$/);
  const shown = await page.locator(".sequence-numbers .sequence-card").allTextContents();
  const gap = shown.indexOf("？");
  const step = Number(shown[gap === 1 ? 3 : 1]) > Number(shown[gap === 1 ? 2 : 0]) ? 1 : -1;
  const missing = gap === 1 ? Number(shown[0]) + step : Number(shown[gap - 1]) + step;
  await page
    .locator(".sequence-choices .sequence-card", { hasText: new RegExp(`^${missing}$`) })
    .click();
  await expect(page.locator(".sequence-card.is-gap.is-filled")).toHaveText(String(missing));
  await answeredRight(3);

  // 4 從小到大: each tap takes its place in the row below.
  await spoken(/^從小到大，依順序點數字。$/);
  const cards = page.locator(".sequence-sort .sequence-choices .sequence-card");
  const values = (await cards.allTextContents()).map(Number);
  const sorted = [...values].sort((a, b) => a - b);
  await cards.nth(values.indexOf(sorted[0])).click();
  await cards.nth(values.indexOf(sorted[1])).click();
  await expect(cards.nth(values.indexOf(sorted[0])).locator(".compare-pick-number")).toHaveText(
    "1",
  );
  await expect(cards.nth(values.indexOf(sorted[1])).locator(".compare-pick-number")).toHaveText(
    "2",
  );
  await expect(page.locator(".sequence-numbers.is-tray .sequence-card:not(.is-gap)")).toHaveText(
    sorted.slice(0, 2).map(String),
  );
  for (const value of sorted.slice(2)) await cards.nth(values.indexOf(value)).click();
  await answeredRight(4);

  // 5–6 比多少: two rows and 一樣多; 7–8 比大小.
  await spoken(/^哪一排比較多？如果一樣多，就點一樣多。$/);
  await expect(page.getByRole("button", { name: "一樣多" })).toBeVisible();
  await tapUntilRight(page.locator(".sequence-rows > button"), 5);
  await spoken(/^哪一排比較少？/);
  await tapUntilRight(page.locator(".sequence-rows > button"), 6);
  await spoken(/^哪一個數比較大？點一下。$/);
  await tapUntilRight(page.locator(".sequence-choices.is-pair button"), 7);
  await spoken(/^哪一個數比較小？點一下。$/);
  await tapUntilRight(page.locator(".sequence-choices.is-pair button"), 8);

  await expect(page.getByRole("heading", { name: "這一課練完了！" })).toBeVisible();
  await expect(page.locator(".math-result")).toContainText("第幾個（從右邊數）");
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kid-math-records-v1") ?? "{}"),
  );
  expect(records.rounds).toHaveLength(1);
  expect(records.rounds[0]).toMatchObject({ lessonId: 4, total: 8 });
  expect(records.rounds[0].needsPractice[0]).toEqual({ kind: "第幾個（從右邊數）" });
  expect(errors).toEqual([]);
});

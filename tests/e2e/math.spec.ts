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

type SavedQuestion = { kind: string; target: number; parts?: number[] };

/** A written lesson's saved round: its questions, in the order this round asks them. */
async function savedQuestions(page: Page, key: string): Promise<SavedQuestion[]> {
  await expect.poll(() => page.evaluate((name) => localStorage.getItem(name), key)).not.toBeNull();
  return page.evaluate((name) => JSON.parse(localStorage.getItem(name)!).questions, key);
}

/** Steps with 上一題 and 下一題 to question `index` (from 0): each round mixes the order. */
async function goToQuestion(page: Page, index: number) {
  const header = page.locator(".math-header");
  for (;;) {
    const at = Number(/第 (\d+) 題/.exec((await header.textContent()) ?? "")?.[1]) - 1;
    if (at === index) return;
    const forward = at < index;
    await page.getByRole("button", { name: forward ? "下一題" : "上一題", exact: true }).click();
    await expect(header).toContainText(`第 ${forward ? at + 2 : at} 題`);
  }
}

/** The instruction now spoken, once 「答對了！」 or 「再想想看。」 has given way to it. */
async function prompt(page: Page) {
  const audio = page.locator("audio");
  await expect(audio).not.toHaveAttribute("data-clip-text", /^(答對了！|再想想看。)$/);
  return (await audio.getAttribute("data-clip-text")) ?? "";
}

/** Which kind of question an instruction asks, by the patterns a lesson's questions say. */
const kindOf = (text: string, kinds: Record<string, RegExp>) =>
  Object.entries(kinds).find(([, pattern]) => pattern.test(text))?.[0];

test("第一課 10以內的數 reads each question aloud, keeps the round and ends with the parent's check", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "數學", exact: true }).click();
  await page.getByRole("button", { name: /數學第一課/ }).click();
  await page.getByRole("button", { name: "開始練習", exact: true }).click();
  const header = page.locator(".math-header");
  const audio = page.locator("audio");
  await expect(header).toContainText("第 1 題 / 9");

  // The kinds of question come in another order each round; the saved round says where.
  const questions = await savedQuestions(page, "kid-math-round-v1");
  const count = questions.findIndex((question) => question.kind === "count" && question.target);
  const zero = questions.findIndex((question) => question.kind === "count" && !question.target);
  const draw = questions.findIndex((question) => question.kind === "draw");

  // 認識 1～5 or 6～10: the question is spoken, pictures can be marked, the number is written.
  await goToQuestion(page, count);
  await expect(header).toContainText(questions[count].target <= 5 ? "認識 1～5" : "認識 6～10");
  await expect(audio).toHaveAttribute("data-clip-text", "數一數，有幾個？用筆寫出數字。");
  const picture = page.locator(".math-pictures button").first();
  await picture.click();
  await expect(picture).toHaveAttribute("aria-pressed", "true");
  await stroke(page, page.getByLabel("寫數字"), [
    [30, 25],
    [70, 25],
    [45, 80],
  ]);

  // 認識 0: the place the pictures would be, empty; the prompt names what to count.
  await goToQuestion(page, zero);
  await expect(header).toContainText("認識 0");
  await expect(page.getByRole("img", { name: /^這裡沒有/ })).toBeVisible();
  await expect(audio).toHaveAttribute("data-clip-text", /^這裡有幾.+？用筆寫出數字。$/);

  // 表示數量: one circle in each cell of a 十格框; filled cells are numbered in reading order.
  await goToQuestion(page, draw);
  await expect(header).toContainText("表示數量");
  await expect(audio).toHaveAttribute("data-clip-text", /^畫出.+個圈圈。$/);
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
  await expect(header).toContainText(`第 ${draw + 1} 題 / 9`);
  await expect(page.locator(".math-frame-number")).toHaveCount(2);

  await goToQuestion(page, 8);
  await page.getByRole("button", { name: "寫完了，請家長檢查" }).click();
  const cards = page.locator(".math-check-card");
  await expect(cards).toHaveCount(9);
  const toggle = (index: number) => cards.nth(index).locator(".math-check-toggle");
  // Answered questions start unmarked; unanswered ones start as 需要補強.
  await expect(toggle(count)).toHaveAttribute("aria-pressed", "false");
  await expect(toggle(zero)).toHaveAttribute("aria-pressed", "true");
  await expect(cards.nth(zero)).toContainText("認識 0");
  await expect(toggle(draw)).toHaveAttribute("aria-pressed", "false");
  await expect(cards.nth(draw)).toContainText("畫了 2 格");
  await toggle(count).click();
  await page.getByRole("button", { name: "檢查完成" }).click();
  await expect(page.getByRole("heading", { name: "這一課練完了！" })).toBeVisible();
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kid-math-records-v1") ?? "{}"),
  );
  expect(records.rounds).toHaveLength(1);
  expect(records.rounds[0].needsPractice.length).toBe(8);
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
  // Tries each choice, the way a guessing child would, until the question is answered.
  const tapUntilRight = async (choices: Locator) => {
    for (let index = 0; ; index++) {
      await choices.nth(index).click();
      if ((await status.textContent()) === "答對了！") return;
      await expect(status).toHaveText("");
    }
  };

  // The seven kinds come in another order each round.
  const kinds = {
    lined: /哪一枝鉛筆比較(長|短)/,
    outOfLine: /先把每一枝鉛筆拉到紅線/,
    ground: /哪一個小朋友比較(高|矮)/,
    onBox: /先把小朋友拉到地上/,
    thickness: /^哪一本書比較(厚|薄)？點一下。$/,
    line: /哪一條是(直|曲)線/,
    route: /哪一條路最近/,
  };
  const asked: string[] = [];
  await expect(header).toHaveText("第 1 題 / 7");
  await expect(audio).toHaveAttribute("src", /math-audio\/[a-z-]+\.m4a/);
  for (let question = 1; question <= 7; question++) {
    await expect(header).toHaveText(`第 ${question} 題 / 7`);
    const kind = kindOf(await prompt(page), kinds);
    asked.push(kind ?? "?");
    if (kind === "lined") {
      // 比長短, lined up: answer straight away.
      await expect(page.locator(".compare-hint")).toHaveCount(0);
      await items.nth(await rightIndex()).click();
    } else if (kind === "outOfLine") {
      // A hand shows the drag, and only lined-up pencils can be compared.
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
      await spoken(kinds.lined);
      await page.waitForTimeout(500);
      const right = await rightIndex();
      await items.nth(1 - right).click();
      await expect(status).toHaveText("再想想看");
      await spoken(/^再想想看。$/);
      await expect(header).toHaveText(`第 ${question} 題 / 7`);
      await expect(status).toHaveText("");
      await items.nth(right).click();
    } else if (kind === "ground") {
      // 比高矮, standing on the ground.
      await items.nth(await rightIndex()).click();
    } else if (kind === "onBox") {
      // One child stands on a box and is dragged down to the ground.
      await expect(page.locator(".compare-box")).toHaveCount(1);
      await drag(page.locator(".compare-item.is-movable"), 0, 40);
      await expect(page.locator(".compare-item.is-movable")).toHaveCount(0);
      await spoken(kinds.ground);
      await page.waitForTimeout(500);
      await items.nth(await rightIndex()).click();
    } else if (kind === "thickness") {
      // 比厚薄: two books on a shelf.
      await expect(page.locator(".compare-book")).toHaveCount(2);
      await tapUntilRight(page.locator(".compare-book"));
    } else if (kind === "line") {
      // 直線和曲線: a wrong guess can be tried again.
      await tapUntilRight(page.locator(".compare-lines button"));
    } else if (kind === "route") {
      // 哪條路最近, part of 直線和曲線.
      await expect(page.getByRole("img", { name: "小兔子" })).toBeVisible();
      await tapUntilRight(page.locator(".compare-route .route-flag"));
    } else throw new Error(`an instruction 第二課 does not ask: ${await prompt(page)}`);
    await expect(status).toHaveText("答對了！");
    await spoken(/^答對了！$/);
    if (question < 7) await expect(header).toHaveText(`第 ${question + 1} 題 / 7`);
  }
  expect(asked.sort()).toEqual(Object.keys(kinds).sort());

  await expect(page.getByRole("heading", { name: "這一課練完了！" })).toBeVisible();
  await expect(page.locator(".math-result")).toContainText("比長短（先對齊）");
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kid-math-records-v1") ?? "{}"),
  );
  expect(records.rounds).toHaveLength(1);
  expect(records.rounds[0]).toMatchObject({ lessonId: 2, total: 7 });
  expect(records.rounds[0].needsPractice).toContainEqual({ kind: "比長短（先對齊）" });
  expect(errors).toEqual([]);
});

test("第七課 10以內的加法 adds with pictures, 0 and circles, keeps 第一課's round and ends with the parent's check", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "數學", exact: true }).click();

  // An unfinished 第一課 round stays saved while 第七課 is practised.
  await page.getByRole("button", { name: /數學第一課/ }).click();
  await page.getByRole("button", { name: "開始練習", exact: true }).click();
  const first = await savedQuestions(page, "kid-math-round-v1");
  await goToQuestion(
    page,
    first.findIndex((question) => question.kind === "count"),
  );
  await stroke(page, page.getByLabel("寫數字"), [
    [30, 30],
    [60, 70],
  ]);
  // 返回 goes back to the lesson page, which now offers to continue.
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page.getByRole("button", { name: "繼續上次的練習" })).toBeVisible();
  await page.getByRole("button", { name: "回到課程" }).click();

  await page.getByRole("button", { name: /數學第七課/ }).click();
  await expect(page.getByRole("heading", { name: "10以內的加法" })).toBeVisible();
  await page.getByRole("button", { name: "開始練習", exact: true }).click();
  const header = page.locator(".math-header");
  const audio = page.locator("audio");
  await expect(header).toContainText("第 1 題 / 8");
  const questions = await savedQuestions(page, "kid-math-round-v1-3");
  const join = questions.findIndex((question) => question.kind === "join");
  const zero = questions.findIndex(
    (question) => question.kind === "add" && question.parts!.includes(0),
  );
  const add = questions.findIndex(
    (question) => question.kind === "add" && !question.parts!.includes(0),
  );

  // 合起來是多少: the pictures can be marked, and the total is written.
  await goToQuestion(page, join);
  await expect(header).toContainText("合起來是多少");
  await expect(audio).toHaveAttribute("data-clip-text", /^左邊有.個，右邊有.個，合在一起有幾個？$/);
  const picture = page.locator(".math-join-group button").first();
  await picture.click();
  await expect(picture).toHaveAttribute("aria-pressed", "true");
  await stroke(page, page.getByLabel("寫答案", { exact: true }), [
    [40, 20],
    [55, 80],
  ]);

  // 0的加法: a number and 零, with an empty 十格框 for the 0.
  await goToQuestion(page, zero);
  await expect(header).toContainText("0的加法");
  await expect(audio).toHaveAttribute(
    "data-clip-text",
    /^(.加零|零加.)等於多少？先畫圈圈，再寫答案。$/,
  );
  await expect(
    page.locator(".math-add-number").nth(questions[zero].parts![0] === 0 ? 0 : 1),
  ).toHaveText("0");

  // 加加看: each side numbers its own circles; the answer has its own square.
  await goToQuestion(page, add);
  await expect(header).toContainText("加加看");
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

  // A reload continues 第七課 with its circles.
  await page.reload();
  await page.getByRole("button", { name: /數學第七課/ }).click();
  await page.getByRole("button", { name: "繼續上次的練習" }).click();
  await expect(header).toContainText(`第 ${add + 1} 題 / 8`);
  await expect(numbers(0)).toHaveCount(2);
  await expect(numbers(1)).toHaveCount(1);

  await goToQuestion(page, 7);
  await page.getByRole("button", { name: "寫完了，請家長檢查" }).click();
  const cards = page.locator(".math-check-card");
  await expect(cards).toHaveCount(8);
  const toggle = (index: number) => cards.nth(index).locator(".math-check-toggle");
  await expect(toggle(join)).toHaveAttribute("aria-pressed", "false");
  await expect(toggle(zero)).toHaveAttribute("aria-pressed", "true");
  await expect(cards.nth(zero)).toContainText("0的加法");
  await expect(toggle(add)).toHaveAttribute("aria-pressed", "false");
  await expect(cards.nth(add).locator("figcaption")).toHaveText([/畫了 2 格/, /畫了 1 格/]);
  await page.getByRole("button", { name: "檢查完成" }).click();
  await expect(page.getByRole("heading", { name: "這一課練完了！" })).toBeVisible();
  await expect(page.locator(".math-result")).toContainText("＋");

  const stored = await page.evaluate(() => ({
    records: JSON.parse(localStorage.getItem("kid-math-records-v1") ?? "{}"),
    lesson1: localStorage.getItem("kid-math-round-v1"),
    lesson3: localStorage.getItem("kid-math-round-v1-3"),
  }));
  expect(stored.records.rounds).toHaveLength(1);
  expect(stored.records.rounds[0]).toMatchObject({ lessonId: 3, total: 8 });
  expect(stored.records.rounds[0].needsPractice).toHaveLength(6);
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
  const four: [number, number][] = [
    [60, 15],
    [25, 65],
    [80, 65],
  ];
  await expect(header).toContainText("第 1 題 / 8");
  const questions = await savedQuestions(page, "kid-math-round-v1-4");
  const where = (kind: string, ten: boolean, skip = -1) =>
    questions.findIndex(
      (question, index) =>
        question.kind === kind && (question.target === 10) === ten && index !== skip,
    );
  const split = where("split", false);
  const combine = where("combine", false);

  // 分一分: the total and one part are given; the other part is written.
  await goToQuestion(page, split);
  await expect(header).toContainText("分一分");
  await expect(audio).toHaveAttribute("data-clip-text", /^.可以分成.和幾？$/);
  await expect(page.getByRole("group", { name: /^分合圖：\d+ 分成 \d+ 和 ？$/ })).toBeVisible();
  const picture = page.locator(".math-pictures button").first();
  await picture.click();
  await expect(picture).toHaveAttribute("aria-pressed", "true");
  await stroke(page, page.getByLabel("寫答案，在右下"), four);

  // 合一合: both parts are given; the total is written on top.
  await goToQuestion(page, combine);
  await expect(header).toContainText("合一合");
  await expect(audio).toHaveAttribute("data-clip-text", /^.和.合在一起是幾？$/);
  await expect(page.getByRole("group", { name: /^分合圖：\d+ 和 \d+ 合起來是 ？$/ })).toBeVisible();
  await stroke(page, page.getByLabel("寫答案，在上面"), four);

  // A reload continues 第四課 where it was, with what was written.
  await page.reload();
  await page.getByRole("button", { name: /數學第四課/ }).click();
  await page.getByRole("button", { name: "繼續上次的練習" }).click();
  await expect(header).toContainText(`第 ${combine + 1} 題 / 8`);
  await expect(page.getByRole("button", { name: "清空答案" })).toBeEnabled();

  // 10的分與合: 分一分 and 合一合 for 10, then 分分看, any two numbers that make 10.
  await goToQuestion(page, where("split", true));
  await expect(header).toContainText("10的分與合");
  await expect(audio).toHaveAttribute("data-clip-text", /^十可以分成.和幾？$/);
  const ways = where("ways", true);
  await goToQuestion(page, ways);
  await expect(audio).toHaveAttribute("data-clip-text", "十可以分成幾和幾？寫出一種分法。");
  // Only one of the two numbers: not answered yet.
  await stroke(page, page.getByLabel("寫第一個數，在左下"), four);
  await goToQuestion(page, 7);
  await page.getByRole("button", { name: "寫完了，請家長檢查" }).click();

  const cards = page.locator(".math-check-card");
  await expect(cards).toHaveCount(8);
  const marked = (index: number) => cards.nth(index).locator(".math-check-toggle");
  for (const [index, pending] of [
    [split, "false"],
    [where("split", false, split), "true"],
    [combine, "false"],
    [where("combine", false, combine), "true"],
    [ways, "true"],
  ] as const)
    await expect(marked(index)).toHaveAttribute("aria-pressed", pending);
  await expect(cards.nth(split)).toContainText("分成");
  await expect(cards.nth(split).locator(".math-bond.is-preview .ink-preview")).toHaveCount(1);
  await expect(cards.nth(ways)).toContainText("兩個數合起來是 10");
  await expect(cards.nth(ways).locator(".math-bond.is-preview .ink-preview")).toHaveCount(1);
  await page.getByRole("button", { name: "檢查完成" }).click();
  await expect(page.getByRole("heading", { name: "這一課練完了！" })).toBeVisible();

  const stored = await page.evaluate(() => ({
    records: JSON.parse(localStorage.getItem("kid-math-records-v1") ?? "{}"),
    round: localStorage.getItem("kid-math-round-v1-4"),
  }));
  expect(stored.records.rounds).toHaveLength(1);
  expect(stored.records.rounds[0]).toMatchObject({ lessonId: 4, total: 8 });
  expect(stored.records.rounds[0].needsPractice).toHaveLength(6);
  expect(stored.round).toBeNull();
  expect(errors).toEqual([]);
});

test("第三課 排順序、比多少 is tapped: 排數字, 排在第幾個, 第幾個和幾個 and 比多少, each tried until right", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "數學", exact: true }).click();
  // The textbook's lessons in order, 上學期 then 下學期; those not made yet are 製作中.
  const cards = page.locator(".math-journey .journey-card");
  await expect(cards).toHaveCount(18);
  await expect(page.locator(".math-term-title")).toHaveText([/上學期/, /下學期/]);
  for (const [index, title] of [
    [0, /第一課.*10以內的數/],
    [1, /第二課.*比長短/],
    [2, /第三課.*排順序、比多少/],
    [3, /第四課.*分與合/],
    [4, /第五課.*方盒、圓罐、球/],
    [5, /第六課.*30以內的數.*製作中/],
    [6, /第七課.*10以內的加法/],
    [8, /第九課.*幾點鐘.*製作中/],
    [9, /第一課.*50以內的數.*製作中/],
    [17, /第九課.*幾月幾日星期幾.*製作中/],
  ] as const)
    await expect(cards.nth(index)).toHaveText(title);
  await expect(cards.nth(4)).not.toContainText("製作中");
  await expect(cards.nth(5)).toBeDisabled();
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
  const tapUntilRight = async (choices: Locator) => {
    for (let index = 0; ; index++) {
      await choices.nth(index).click();
      if ((await status.textContent()) === "答對了！") return;
      await expect(status).toHaveText("");
    }
  };
  const numbers: Record<string, number> = { 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
  const said = async (pattern: RegExp) =>
    numbers[pattern.exec((await audio.getAttribute("data-clip-text")) ?? "")![1]];
  const items = page.locator(".sequence-item");

  // The kinds come in another order each round; 「點第三個」 always follows 「點三個」.
  const kinds = {
    missing: /^中間少了哪一個數？點一下。$/,
    sort: /^從小到大，依順序點數字。$/,
    left: /^從左邊數，第.個是哪一個？點一下。$/,
    right: /^從右邊數，第.個是哪一個？點一下。$/,
    group: /^從左邊數，點.個。$/,
    more: /^哪一排比較多？如果一樣多，就點一樣多。$/,
    less: /^哪一排比較少？/,
  };
  const asked: string[] = [];
  await expect(header).toHaveText("第 1 題 / 8");
  await expect(audio).toHaveAttribute("src", /math-audio\/[a-z0-9-]+\.m4a/);
  for (let question = 1; question <= 8; question++) {
    await expect(header).toHaveText(`第 ${question} 題 / 8`);
    const kind = kindOf(await prompt(page), kinds);
    asked.push(kind ?? "?");
    if (kind === "missing") {
      // 排數字: the missing number fills the gap.
      const shown = await page.locator(".sequence-numbers .sequence-card").allTextContents();
      const gap = shown.indexOf("？");
      const step = Number(shown[gap === 1 ? 3 : 1]) > Number(shown[gap === 1 ? 2 : 0]) ? 1 : -1;
      const missing = gap === 1 ? Number(shown[0]) + step : Number(shown[gap - 1]) + step;
      await page
        .locator(".sequence-choices .sequence-card", { hasText: new RegExp(`^${missing}$`) })
        .click();
      await expect(page.locator(".sequence-card.is-gap.is-filled")).toHaveText(String(missing));
    } else if (kind === "sort") {
      // 從小到大: each tap takes its place in the row below.
      const sortCards = page.locator(".sequence-sort .sequence-choices .sequence-card");
      const values = (await sortCards.allTextContents()).map(Number);
      const sorted = [...values].sort((a, b) => a - b);
      await sortCards.nth(values.indexOf(sorted[0])).click();
      await sortCards.nth(values.indexOf(sorted[1])).click();
      await expect(
        sortCards.nth(values.indexOf(sorted[0])).locator(".compare-pick-number"),
      ).toHaveText("1");
      await expect(
        sortCards.nth(values.indexOf(sorted[1])).locator(".compare-pick-number"),
      ).toHaveText("2");
      await expect(
        page.locator(".sequence-numbers.is-tray .sequence-card:not(.is-gap)"),
      ).toHaveText(sorted.slice(0, 2).map(String));
      for (const value of sorted.slice(2)) await sortCards.nth(values.indexOf(value)).click();
    } else if (kind === "left") {
      // 排在第幾個, from the left: the place counts from the marked end.
      await items.nth((await said(/第(.)個/)) - 1).click();
    } else if (kind === "right") {
      // From the right: the first picture is never the answer, so it is a retry.
      const fromRight = await said(/第(.)個/);
      await items.first().click();
      await expect(status).toHaveText("再想想看");
      await expect(status).toHaveText("");
      await items.nth((await items.count()) - fromRight).click();
    } else if (kind === "group") {
      // 幾個: the first ones from the left, in any order; then 第幾個: only that one.
      const count = await said(/點(.)個/);
      for (let index = count - 1; index >= 0; index--) await items.nth(index).click();
      await answeredRight(question);
      question++;
      asked.push("nth");
      await spoken(/^從左邊數，點第.個。$/);
      expect(await said(/第(.)個/)).toBe(count);
      await items.nth(count - 1).click();
    } else if (kind === "more" || kind === "less") {
      // 比多少: two rows and 一樣多.
      await expect(page.getByRole("button", { name: "一樣多" })).toBeVisible();
      await tapUntilRight(page.locator(".sequence-rows > button"));
    } else throw new Error(`an instruction 第三課 does not ask: ${await prompt(page)}`);
    await answeredRight(question);
  }
  expect(asked.sort()).toEqual([...Object.keys(kinds), "nth"].sort());

  await expect(page.getByRole("heading", { name: "這一課練完了！" })).toBeVisible();
  await expect(page.locator(".math-result")).toContainText("排在第幾個（從右邊數）");
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kid-math-records-v1") ?? "{}"),
  );
  expect(records.rounds).toHaveLength(1);
  expect(records.rounds[0]).toMatchObject({ lessonId: 7, total: 8 });
  expect(records.rounds[0].needsPractice).toContainEqual({ kind: "排在第幾個（從右邊數）" });
  expect(errors).toEqual([]);
});

test("第五課 方盒、圓罐、球 is tapped: 分類, 疊疊看、滾滾看, 描下來, 找圖形 and 做造型, each tried until right", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "數學", exact: true }).click();
  await page.getByRole("button", { name: /數學第五課/ }).click();
  await expect(page.getByRole("heading", { name: "方盒、圓罐、球" })).toBeVisible();
  await page.getByRole("button", { name: "開始練習", exact: true }).click();

  const header = page.locator(".math-header small");
  const audio = page.locator("audio");
  const status = page.locator(".compare-question [role=status]");
  const said = async (pattern: RegExp) =>
    pattern.exec((await audio.getAttribute("data-clip-text")) ?? "")![1];
  const card = (name: string) =>
    page.locator(".shape-choices").getByRole("button", { name, exact: true });
  const thing = async () =>
    (await page.locator(".shape-thing [role=img]").getAttribute("aria-label")) ?? "";
  const solids: Record<string, string> = {
    ...{ 面紙盒: "方盒", 禮物盒: "方盒", 骰子: "方盒" },
    ...{ 罐頭: "圓罐", 鼓: "圓罐", 餅乾罐: "圓罐" },
    ...{ 海灘球: "球", 柳丁: "球", 籃球: "球" },
  };
  // The shapes a drawing is made of, read from the drawing itself: a 正方形 is a square rect.
  const drawn = (art: Locator) =>
    art
      .locator("rect, circle, polygon")
      .evaluateAll((shapes) =>
        shapes.map((shape) =>
          shape.tagName === "circle"
            ? "圓形"
            : shape.tagName === "polygon"
              ? "三角形"
              : shape.getAttribute("width") === shape.getAttribute("height")
                ? "正方形"
                : "長方形",
        ),
      );

  // The kinds come in another order each round.
  const kinds = {
    classify: /^這是方盒、圓罐，還是球？點一下。$/,
    stack: /^哪一個不能疊起來？點一下。$/,
    roll: /^哪一個不會滾？點一下。$/,
    trace: /^把有顏色的這一面描下來，是什麼形狀？點一下。$/,
    find: /^把所有的.+都點出來。$/,
    build: /^這個造型用了幾個.+？點一下。$/,
  };
  const asked: string[] = [];
  const sorted: string[] = [];
  const traced: string[] = [];
  let missed = "";
  await expect(header).toHaveText("第 1 題 / 9");
  await expect(audio).toHaveAttribute("src", /math-audio\/[a-z-]+\.m4a/);
  for (let question = 1; question <= 9; question++) {
    await expect(header).toHaveText(`第 ${question} 題 / 9`);
    const kind = kindOf(await prompt(page), kinds);
    asked.push(kind ?? "?");
    if (kind === "classify") {
      // 分類: a thing from home is a 方盒, 圓罐 or 球; the first time, a wrong tap is tried again.
      const name = await thing();
      const solid = solids[name];
      if (!missed) {
        missed = `堆疊與分類（${name}是${solid}）`;
        await card(["方盒", "圓罐", "球"].find((other) => other !== solid)!).click();
        await expect(status).toHaveText("再想想看");
        await expect(status).toHaveText("");
      }
      sorted.push(solid);
      await card(solid).click();
    } else if (kind === "stack") {
      await card("球").click();
    } else if (kind === "roll") {
      await card("方盒").click();
    } else if (kind === "trace") {
      // 描下來: the coloured face of a box or a can.
      const name = await thing();
      traced.push(solids[name]);
      await card(
        solids[name] === "圓罐" ? "圓形" : name === "面紙盒" ? "長方形" : "正方形",
      ).click();
    } else if (kind === "find") {
      // 找圖形: every shape of one kind, in any order; each stays marked.
      const target = await said(/所有的(.+)都/);
      const pieces = page.locator(".shape-piece");
      const matching = (await drawn(page.locator(".shape-find"))).flatMap((shape, index) =>
        shape === target ? [index] : [],
      );
      expect(matching.length).toBeGreaterThanOrEqual(2);
      const [last, ...rest] = matching.reverse();
      for (const index of rest) {
        await pieces.nth(index).click();
        await expect(pieces.nth(index)).toHaveClass(/is-picked/);
      }
      await pieces.nth(last).click();
    } else if (kind === "build") {
      // 做造型: how many of a shape a picture uses.
      const named = await said(/幾個(.+)？/);
      const shapes = await drawn(page.locator(".shape-thing.is-picture"));
      const count = shapes.filter((shape) => shape === named).length;
      expect(count).toBeGreaterThanOrEqual(2);
      await page
        .locator(".sequence-choices .sequence-card", { hasText: new RegExp(`^${count}$`) })
        .click();
    } else throw new Error(`an instruction 第五課 does not ask: ${await prompt(page)}`);
    await expect(status).toHaveText("答對了！");
    if (question < 9) await expect(header).toHaveText(`第 ${question + 1} 題 / 9`);
  }
  expect(asked.sort()).toEqual(
    ["classify", "classify", "stack", "roll", "trace", "trace", "find", "build", "build"].sort(),
  );
  // 分類 asks about two kinds of solid; 描下來 traces a box and a can.
  expect(new Set(sorted).size).toBe(2);
  expect(traced.sort()).toEqual(["圓罐", "方盒"].sort());

  await expect(page.getByRole("heading", { name: "這一課練完了！" })).toBeVisible();
  await expect(page.locator(".math-result")).toContainText(missed);
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kid-math-records-v1") ?? "{}"),
  );
  expect(records.rounds[0]).toMatchObject({ lessonId: 5, total: 9 });
  expect(records.rounds[0].needsPractice).toEqual([{ kind: missed }]);
  expect(errors).toEqual([]);
});

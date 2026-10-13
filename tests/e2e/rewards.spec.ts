import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return Promise.resolve();
    };
  });
});

/** The floating button on the course list opens a menu: 今天的任務 and 集章卡. */
const openFromDock = async (page: Page, item: "今天的任務" | "集章卡") => {
  await page.getByRole("button", { name: "任務和集章卡" }).click();
  await page.getByRole("menuitem", { name: item }).click();
};

const openRewards = async (page: Page) => {
  await page.getByRole("button", { name: "更多" }).click();
  await page.getByRole("button", { name: /^集章卡/ }).click();
};

/** 數學第一課 with nothing written: the parent's check still finishes the practice. */
const finishMathLesson = async (page: Page) => {
  await page.getByRole("button", { name: "數學", exact: true }).click();
  await page.getByRole("button", { name: /數學第一課/ }).click();
  await page.getByRole("button", { name: "開始練習" }).click();
  for (let i = 0; i < 7; i++)
    await page.getByRole("button", { name: "下一題", exact: true }).click();
  await page.getByRole("button", { name: "寫完了，請家長檢查" }).click();
  await page.getByRole("button", { name: "檢查完成" }).click();
};

test("集章卡 is set up in three steps, stamps finished practice and trades a full card for a reward", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  // Off until a parent turns it on.
  await expect(page.getByRole("button", { name: "任務和集章卡" })).toHaveCount(0);

  await openRewards(page);
  await expect(page.getByRole("heading", { name: "誰會集章？" })).toBeVisible();
  await page.getByRole("button", { name: "下一步" }).click();
  // Three family activities come ticked; a parent can add their own.
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(3);
  await page.getByLabel("新增獎勵").fill("一起騎腳踏車");
  await page.getByRole("button", { name: "加入" }).click();
  await expect(page.getByRole("checkbox", { name: "一起騎腳踏車" })).toBeChecked();
  await page.getByRole("radio", { name: "5 格", exact: true }).click();
  await page.getByRole("button", { name: "下一步" }).click();
  await expect(page.getByText("蓋章不看對錯，也不會扣章")).toBeVisible();
  await page.getByRole("button", { name: "開始使用集章卡" }).click();
  await expect(page.getByRole("heading", { name: "孩子的卡" })).toBeVisible();

  // A finished practice earns a stamp, shown for a moment.
  await page.getByRole("button", { name: "課程" }).first().click();
  await expect(page.getByRole("button", { name: "任務和集章卡" })).toBeVisible();
  await finishMathLesson(page);
  const toast = page.locator(".stamp-toast");
  await expect(toast).toContainText("蓋了一個章！");
  // How full the card is shows only on the card itself.
  await expect(toast).not.toContainText("/");
  await page.getByRole("button", { name: "回到課程" }).click();
  await openFromDock(page, "集章卡");
  await expect(page.locator(".stamp-slots li.is-filled")).toHaveCount(1);
  await page.getByRole("button", { name: "關閉" }).click();

  // The parent sees where it came from and sends 鼓勵章 with a note.
  await openRewards(page);
  await expect(page.locator(".reward-log")).toContainText("數學第一課 認識 1～10");
  await expect(page.locator(".reward-log")).toContainText("需要補強 8 題");
  for (let i = 0; i < 4; i++) {
    await page.getByLabel("鼓勵的話").fill("今天自己主動來練習！");
    await page.getByRole("button", { name: "鼓勵章" }).click();
  }
  await expect(toast).toContainText("集滿一張卡了！");
  await expect(page.locator(".reward-log")).toContainText("「今天自己主動來練習！」");

  // The child opens the full card and chooses one of the parent's rewards.
  await page.getByRole("button", { name: "課程" }).first().click();
  // A full card puts a dot on the floating button.
  await expect(page.locator(".reward-dock-button .reward-dock-dot")).toBeVisible();
  await openFromDock(page, "集章卡");
  const card = page.getByRole("dialog", { name: "我的集章卡" });
  await expect(card.locator(".stamp-slots li.is-filled")).toHaveCount(5);
  await card.getByRole("button", { name: "一起騎腳踏車" }).click();
  await card.getByRole("button", { name: "就選這個" }).click();
  await expect(card).toContainText("你選了「一起騎腳踏車」！");
  await card.getByRole("button", { name: "好", exact: true }).click();
  await openFromDock(page, "集章卡");
  await expect(page.locator(".stamp-slots li.is-filled")).toHaveCount(0);
  await page.getByRole("button", { name: "關閉" }).click();
  const book = await page.evaluate(() => JSON.parse(localStorage.getItem("kid-stamps-v1")!));
  expect(book.redemptions).toEqual([expect.objectContaining({ reward: "一起騎腳踏車", size: 5 })]);
  expect(book.log).toHaveLength(5);

  // Past the day's stamps, a practice is logged and the child hears it kindly.
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("kid-stamps-v1")!);
    const now = Date.now();
    for (let i = 0; i < 5; i++)
      saved.log.push({
        id: `x${i}`,
        at: now - i * 1000,
        kind: "practice",
        subject: "zhuyin",
        detail: "第一課 聽寫",
        stamped: true,
      });
    localStorage.setItem("kid-stamps-v1", JSON.stringify(saved));
  });
  await page.reload();
  await finishMathLesson(page);
  await expect(toast).toContainText("今天好認真！");
  await page.getByRole("button", { name: "回到課程" }).click();
  await openRewards(page);
  await expect(page.locator(".reward-log li").first()).toContainText("今天的章已經蓋滿");
  expect(errors).toEqual([]);
});

test("a whole listening round stamps the card once the parent finishes checking it", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(() =>
    localStorage.setItem(
      "kid-reward-settings-v1",
      JSON.stringify({
        version: 1,
        enabled: true,
        cardSize: 10,
        dailyCap: 5,
        rewards: ["一起去公園玩"],
      }),
    ),
  );
  await page.reload();
  await page.getByRole("button", { name: /第一課，貓咪/ }).click();
  await page.getByRole("button", { name: /第二關 聽寫/ }).click();
  await page.getByRole("button", { name: "開始聽", exact: true }).click();
  await page.getByRole("button", { name: "結束作答並檢查", exact: true }).click();
  // Writing alone stamps nothing; the parent's check does.
  await expect(page.locator(".stamp-toast")).toHaveCount(0);
  await page.getByRole("button", { name: "完成檢查", exact: true }).click();
  await expect(page.locator(".stamp-toast")).toContainText("蓋了一個章！");
  const book = await page.evaluate(() => JSON.parse(localStorage.getItem("kid-stamps-v1")!));
  expect(book.log).toEqual([
    expect.objectContaining({ kind: "practice", detail: "第一課 聽寫", needsPractice: 10 }),
  ]);
});

test("a parent sets 今天的任務 from what needs help; finishing it earns a 任務章", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.evaluate(() => {
    localStorage.setItem(
      "kid-reward-settings-v1",
      JSON.stringify({
        version: 1,
        enabled: true,
        cardSize: 10,
        dailyCap: 5,
        rewards: ["一起玩桌遊"],
      }),
    );
    const at = Date.now() - 60 * 60 * 1000;
    localStorage.setItem(
      "kid-stamps-v1",
      JSON.stringify({
        version: 1,
        log: [
          {
            id: "m1",
            at,
            kind: "practice",
            subject: "math",
            detail: "數學第一課 認識 1～10",
            needsPractice: 3,
            taskKey: "math:1",
            stamped: true,
          },
        ],
        redemptions: [],
        cardStart: 0,
        archived: 0,
        tasks: [],
      }),
    );
  });
  await page.reload();

  // The log suggests what to work on; one tap makes it a task, and a parent can add more.
  await openRewards(page);
  const tasks = page.locator(".reward-tasks");
  await expect(tasks.locator(".reward-task-suggestions")).toContainText("需要補強 3 題");
  await tasks.getByRole("button", { name: "設為任務" }).click();
  await expect(tasks.locator(".reward-task-list")).toContainText("數學第一課 認識 1～10");
  await tasks.getByLabel("選擇任務").selectOption({ label: "第一課 聽寫" });
  await tasks.getByRole("button", { name: "加入任務" }).click();
  await expect(tasks.locator(".reward-task-list li")).toHaveCount(2);

  // The child sees them in 國字注音 and goes straight to the practice.
  await page.getByRole("button", { name: "課程" }).first().click();
  await openFromDock(page, "今天的任務");
  const today = page.getByRole("dialog", { name: "今天的任務" });
  await expect(today).toBeVisible();
  await expect(today.locator("li")).toHaveCount(2);
  await today.getByRole("button", { name: "去做：數學第一課 認識 1～10" }).click();
  await expect(page.getByRole("heading", { name: "認識 1～10" })).toBeVisible();
  await page.getByRole("button", { name: "開始練習" }).click();
  for (let i = 0; i < 7; i++)
    await page.getByRole("button", { name: "下一題", exact: true }).click();
  await page.getByRole("button", { name: "寫完了，請家長檢查" }).click();
  await page.getByRole("button", { name: "檢查完成" }).click();
  await expect(page.locator(".stamp-toast")).toContainText("完成今天的任務！");
  await page.getByRole("button", { name: "回到課程" }).click();
  await openFromDock(page, "今天的任務");
  await expect(today.locator("li.is-done")).toContainText("完成了");
  await page.getByRole("button", { name: "關閉" }).click();
  await openFromDock(page, "集章卡");
  await expect(page.locator(".stamp-slots li.is-filled")).toHaveCount(3);
  await page.getByRole("button", { name: "關閉" }).click();

  // The parent sees the 任務章 in the log and can cancel the other task.
  await openRewards(page);
  await expect(page.locator(".reward-log")).toContainText("今天的任務：數學第一課 認識 1～10");
  await tasks.getByRole("button", { name: "取消任務：第一課 聽寫" }).click();
  await expect(tasks.locator(".reward-task-list li")).toHaveCount(1);
  expect(errors).toEqual([]);
});

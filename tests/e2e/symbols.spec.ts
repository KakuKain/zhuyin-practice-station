import { test, expect } from "@playwright/test";
import { lessons, lessonNumerals } from "../../features/courses/course-data";
import { symbolGroups } from "../../features/symbols/symbols-data";

test("all lesson titles and lesson headings use annotated text without changing accessible names", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".journey-card-copy strong .annotated-text")).toHaveCount(9);
  expect(
    await page
      .locator(".journey-card-copy strong")
      .first()
      .evaluate((element) => getComputedStyle(element).getPropertyValue("text-wrap-style")),
  ).toBe("pretty");
  await page.evaluate(() => document.fonts.load('400 24px "KidLessonYoSans"'));
  for (const width of [320, page.viewportSize()!.width]) {
    await page.setViewportSize({ width, height: page.viewportSize()!.height });
    const overlaps = await page.locator(".journey-card").evaluateAll((cards) =>
      cards.some((card) => {
        const title = card.querySelector("strong [aria-hidden='true']")!;
        const art = card.querySelector(".journey-art")!.getBoundingClientRect();
        return [...title.getClientRects()].some((line) => line.right > art.left + 1);
      }),
    );
    expect(overlaps).toBe(false);
  }
  for (const [index, lesson] of lessons.entries()) {
    await page
      .getByRole("button", { name: new RegExp(`第${lessonNumerals[index]}課，${lesson.title}`) })
      .click();
    const heading = page.getByRole("heading", { name: lesson.title, exact: true });
    await expect(heading).toBeVisible();
    expect(
      await heading.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("text-wrap-style"),
      ),
    ).toBe("pretty");
    const font = await heading
      .locator(".annotated-text")
      .evaluate((element) => getComputedStyle(element).fontFamily);
    expect(font).toContain("KidLessonYoSans");
    await expect(page.locator(".lesson-curriculum-heading > strong > .annotated-text")).toHaveCount(
      2,
    );
    expect(
      await page
        .locator(".lesson-curriculum-heading > strong .annotated-text > [aria-hidden='true']")
        .first()
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    ).toBeGreaterThanOrEqual(20);
    await expect(page.getByRole("button", { name: "國字＋注音", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      await page
        .locator(".lesson-text-line")
        .first()
        .evaluate((element) => getComputedStyle(element).fontFamily),
    ).toContain("KidLessonYoSans");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByRole("button", { name: "回到課程", exact: true }).click();
  }
});

test("all-symbol navigation has separate consonant/vowel grids and normal-speed interruptible audio", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/listening-audio/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "主要導覽" });
  await expect(nav.getByRole("button")).toHaveCount(4);
  await nav.getByRole("button", { name: "注音", exact: true }).click();
  await expect(page.getByRole("heading", { name: "全部注音", exact: true })).toBeVisible();
  const wrappingStyles = await page
    .locator(".symbol-page h1, .symbol-page h2, .symbol-page p, .bottom-nav button")
    .evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).getPropertyValue("text-wrap-style")),
    );
  expect(wrappingStyles.every((style) => style === "pretty")).toBe(true);
  await expect(nav.getByRole("button", { name: "注音", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("region", { name: "聲符", exact: true }).getByRole("button"),
  ).toHaveCount(21);
  await expect(
    page.getByRole("region", { name: "韻符", exact: true }).getByRole("button"),
  ).toHaveCount(16);
  for (const group of symbolGroups) {
    const region = page.getByRole("region", { name: group.title, exact: true });
    await expect(region.locator(".symbol-chart-grid")).toHaveAttribute("dir", "rtl");
    const boxes = await region.getByRole("button").evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect();
        return { x: box.x, y: box.y };
      }),
    );
    for (let column = 1; column < group.columns; column++) {
      expect(boxes[column].x).toBeLessThan(boxes[column - 1].x);
      expect(boxes[column].y).toBeCloseTo(boxes[0].y);
    }
    expect(boxes[group.columns].y).toBeGreaterThan(boxes[0].y);
  }
  const first = page.getByRole("button", { name: "播放注音符號 ㄅ", exact: true });
  await first.click();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await expect(first).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("status")).toContainText("正在載入音檔");
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((audio: HTMLAudioElement) => !audio.paused && audio.readyState >= 2),
    )
    .toBe(true);
  expect(
    await page.locator("audio").evaluate((audio: HTMLAudioElement) => audio.playbackRate),
  ).toBe(1);
  await page.getByRole("button", { name: "播放注音符號 ㄩ", exact: true }).click();
  await expect(first).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".symbol-chart-button[aria-pressed='true']")).toHaveCount(1);
  await nav.getByRole("button", { name: "練習", exact: true }).click();
  expect(await page.locator("audio").evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(
    true,
  );
  await nav.getByRole("button", { name: "注音", exact: true }).click();
  await expect(page.locator(".symbol-chart-button[aria-pressed='true']")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const sizes = await page.locator(".symbol-chart-button").evaluateAll((buttons) =>
    buttons.map((button) => {
      const box = button.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }),
  );
  expect(sizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
  expect(errors).toEqual([]);
});

test("failed chart audio shows an actionable error and can be retried", async ({ page }) => {
  await page.route("**/listening-audio/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "注音", exact: true }).click();
  const symbol = page.getByRole("button", { name: "播放注音符號 ㄠ", exact: true });
  await symbol.click();
  await expect(page.getByRole("status")).toContainText("音檔無法播放");
  await expect(symbol).toHaveAttribute("aria-pressed", "false");
  await expect(symbol).toHaveAttribute("aria-busy", "false");
  await page.unroute("**/listening-audio/**");
  await symbol.click();
  await expect(page.getByRole("status")).not.toContainText("音檔無法播放");
  await expect
    .poll(() => page.locator("audio").evaluate((audio: HTMLAudioElement) => !audio.paused))
    .toBe(true);
  await expect(symbol).toHaveAttribute("aria-pressed", "false", { timeout: 10_000 });
});

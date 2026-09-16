import { expect, test } from "@playwright/test";

test.use({ timezoneId: "Asia/Shanghai" });
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-16T08:00:00Z"));
});

test("888px viewport uses a compact sidebar without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 888, height: 693 });
  await page.goto("/tests/ui/preview.html");
  const sidebar = page.locator(".app-sidebar");
  await expect(sidebar).toHaveAttribute("data-mode", "compact");
  await expect(sidebar.locator(".app-nav-label").first()).toBeHidden();
  const titlebarBox = await page.locator(".app-titlebar").boundingBox();
  const sidebarBox = await sidebar.boundingBox();
  expect(titlebarBox?.width).toBe(888);
  expect(sidebarBox?.x).toBe(0);
  expect(sidebarBox?.y).toBe(titlebarBox?.height);
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    sidebar: document.querySelector<HTMLElement>(".app-sidebar")!.scrollWidth -
      document.querySelector<HTMLElement>(".app-sidebar")!.clientWidth,
    main: document.querySelector<HTMLElement>(".app-main")!.scrollWidth -
      document.querySelector<HTMLElement>(".app-main")!.clientWidth,
  }));
  expect(overflow).toEqual({ document: 0, sidebar: 0, main: 0 });
});

test("toolbar keeps one primary action and never wraps at 888px", async ({ page }) => {
  await page.setViewportSize({ width: 888, height: 693 });
  await page.goto("/tests/ui/preview.html");
  await expect(page.locator(".app-toolbar .app-btn-primary")).toHaveCount(1);
  const rows = await page.locator(".app-toolbar-actions > *").evaluateAll((items) =>
    new Set(items.map((item) => Math.round(item.getBoundingClientRect().top))).size,
  );
  expect(rows).toBe(1);
});

test("600px viewport keeps navigation in a labeled drawer", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 500 });
  await page.goto("/tests/ui/preview.html");
  await expect(page.locator(".app-sidebar")).toHaveAttribute("data-mode", "drawer");
  await page.getByTestId("navigation-trigger").click();
  await expect(page.locator(".app-sidebar-nav").getByRole("button", { name: "当前账户" })).toBeVisible();
});

test("macOS drawer mode keeps an operable trigger beyond the traffic-light inset", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
  });
  await page.setViewportSize({ width: 600, height: 500 });
  await page.goto("/tests/ui/preview.html");
  const trigger = page.getByTestId("navigation-trigger");
  await expect(trigger).toBeVisible();
  const triggerBox = await trigger.boundingBox();
  expect(triggerBox?.x).toBeGreaterThanOrEqual(72);
  await trigger.click();
  await expect(page.locator(".app-sidebar")).toHaveAttribute("data-mode", "drawer");
  await expect(page.locator(".app-shell")).toHaveClass(/is-drawer-open/);
});

test("closed drawer is inert and restores trigger focus after keyboard or scrim close", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 500 });
  await page.goto("/tests/ui/preview.html");
  const sidebar = page.locator(".app-sidebar");
  const trigger = page.getByTestId("navigation-trigger");
  const firstNavigationItem = sidebar
    .locator(".app-sidebar-nav")
    .getByRole("button", { name: "当前账户" });

  await expect(trigger).toHaveAttribute("aria-controls", "app-sidebar-navigation");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  expect(await sidebar.evaluate((element) => element.inert)).toBe(true);

  await page.locator(".app-titlebar-close").focus();
  await page.keyboard.press("Tab");
  expect(await sidebar.evaluate((element) => element.contains(document.activeElement))).toBe(false);

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(sidebar).not.toHaveAttribute("aria-hidden", "true");
  expect(await sidebar.evaluate((element) => element.inert)).toBe(false);
  await expect(firstNavigationItem).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Space");
  await expect(firstNavigationItem).toBeFocused();
  await page.locator(".app-drawer-scrim").click({ position: { x: 590, y: 490 } });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test("open drawer wraps reverse Tab from the first control to the last", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 500 });
  await page.goto("/tests/ui/preview.html");
  const sidebar = page.locator(".app-sidebar");
  const firstNavigationItem = sidebar
    .locator(".app-sidebar-nav")
    .getByRole("button", { name: "当前账户" });
  const lastDrawerControl = sidebar.locator(".app-account-summary");

  await page.getByTestId("navigation-trigger").click();
  await expect(firstNavigationItem).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(lastDrawerControl).toBeFocused();
  expect(await page.locator(".app-titlebar").evaluate((element) => element.inert)).toBe(true);
  expect(await page.locator(".app-main").evaluate((element) => element.inert)).toBe(true);
  await expect(page.locator(".app-titlebar")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".app-main")).toHaveAttribute("aria-hidden", "true");
});

test("open drawer wraps forward Tab without focusing the scrim", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 500 });
  await page.goto("/tests/ui/preview.html");
  const sidebar = page.locator(".app-sidebar");
  const firstNavigationItem = sidebar
    .locator(".app-sidebar-nav")
    .getByRole("button", { name: "当前账户" });
  const lastDrawerControl = sidebar.locator(".app-account-summary");
  const scrim = page.locator(".app-drawer-scrim");

  await page.getByTestId("navigation-trigger").click();
  await lastDrawerControl.focus();
  await page.keyboard.press("Tab");
  await expect(firstNavigationItem).toBeFocused();
  await expect(scrim).toHaveAttribute("tabindex", "-1");
  await expect(scrim).not.toBeFocused();
});

test("keyboard navigation closes the drawer and restores trigger focus", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 500 });
  await page.goto("/tests/ui/preview.html");
  const sidebar = page.locator(".app-sidebar");
  const trigger = page.getByTestId("navigation-trigger");
  const firstNavigationItem = sidebar
    .locator(".app-sidebar-nav")
    .getByRole("button", { name: "当前账户" });

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(firstNavigationItem).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toBeFocused();
});

test("wide windows can honor the saved compact preference without sidebar overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 700 });
  await page.goto("/tests/ui/preview.html");
  const sidebar = page.locator(".app-sidebar");
  await expect(sidebar).toHaveAttribute("data-mode", "expanded");
  await page.getByRole("button", { name: "折叠侧栏" }).click();
  await expect(sidebar).toHaveAttribute("data-mode", "compact");
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(72);
  const sidebarOverflow = await sidebar.evaluate((element) =>
    element.scrollWidth - element.clientWidth,
  );
  expect(sidebarOverflow).toBe(0);
});

test("account actions are grouped and delete stays behind the more menu", async ({ page }) => {
  await page.setViewportSize({ width: 1120, height: 760 });
  await page.goto("/tests/ui/preview.html");
  await expect(page.locator(".current-account-hero")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "移除账户" })).toBeHidden();
  await page.getByRole("button", { name: "更多账户操作" }).click();
  await expect(page.getByRole("button", { name: "移除账户" })).toBeVisible();
  const quotaLimits = page.locator(".quota-limits");
  await expect(quotaLimits.getByText("5 小时额度")).toBeVisible();
  await expect(quotaLimits.getByText("7 天额度")).toBeVisible();
});

test("dashboard shows four summary metrics and a real peak date", async ({ page }) => {
  await page.setViewportSize({ width: 1120, height: 760 });
  await page.goto("/tests/ui/preview.html");
  await expect(page.locator("[data-testid='summary-metric']")).toHaveCount(4);
  await expect(page.getByText("峰值日期")).toBeVisible();
  await expect(page.getByText(/2026年9月14日|2026\/9\/14/)).toBeVisible();
  await expect(page.getByText("0%")).toBeVisible();
  await expect(page.getByText("最长任务")).toHaveCount(0);
  await expect(page.getByText("当前额度充足，无需切换账户。")).toBeVisible();
});

for (const skin of ["default", "glass", "graphite", "mint", "illustrated"] as const) {
  test(`${skin} skin keeps the approved dashboard structure`, async ({ page }) => {
    await page.setViewportSize({ width: 1120, height: 760 });
    await page.goto(`/tests/ui/preview.html?skin=${skin}`);
    await expect(page.locator(".current-account-hero")).toBeVisible();
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )).toBe(0);
    await expect(page).toHaveScreenshot(`current-account-${skin}-1120x760.png`, {
      animations: "disabled",
      fullPage: true,
    });
  });
}

test("default dashboard remains usable at the minimum window", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 500 });
  await page.goto("/tests/ui/preview.html?skin=default");
  await expect(page.locator(".current-account-hero")).toBeVisible();
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    main: document.querySelector<HTMLElement>(".app-main")!.scrollWidth -
      document.querySelector<HTMLElement>(".app-main")!.clientWidth,
  }));
  expect(overflow).toEqual({ document: 0, main: 0 });
  await expect(page).toHaveScreenshot("current-account-default-600x500.png", {
    animations: "disabled",
    fullPage: true,
  });
  await page.getByRole("button", { name: "更多账户操作" }).click();
  await expect(page.getByRole("button", { name: "移除账户" })).toBeVisible();
  await page.getByRole("button", { name: "更多账户操作" }).click();
  const fullStatsButton = page.getByRole("button", { name: "查看完整统计" });
  await fullStatsButton.scrollIntoViewIfNeeded();
  await expect(fullStatsButton).toBeInViewport();
  await fullStatsButton.click();
});

for (const viewport of [
  { width: 900, height: 700 },
  { width: 1440, height: 900 },
] as const) {
  test(`default dashboard has no overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/ui/preview.html?skin=default");
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sidebar: document.querySelector<HTMLElement>(".app-sidebar")!.scrollWidth -
        document.querySelector<HTMLElement>(".app-sidebar")!.clientWidth,
      main: document.querySelector<HTMLElement>(".app-main")!.scrollWidth -
        document.querySelector<HTMLElement>(".app-main")!.clientWidth,
    }));
    expect(overflow).toEqual({ document: 0, sidebar: 0, main: 0 });
  });
}

for (const skin of [
  "default", "mint", "graphite", "aurora", "cyberpunk", "minecraft", "glass",
  "mcwood", "illustrated", "anime-sunset", "anime-neon", "anime-forest", "anime-stars",
] as const) {
  test(`${skin} skin has no structural overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 1120, height: 760 });
    await page.goto(`/tests/ui/preview.html?skin=${skin}`);
    await expect(page.locator(".current-account-hero")).toBeVisible();
    await expect(page.locator("[data-testid='summary-metric']")).toHaveCount(4);
    if (skin === "default") {
      await expect(page.locator("html")).not.toHaveAttribute("data-skin");
    } else {
      await expect(page.locator("html")).toHaveAttribute("data-skin", skin);
    }
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sidebar: document.querySelector<HTMLElement>(".app-sidebar")!.scrollWidth -
        document.querySelector<HTMLElement>(".app-sidebar")!.clientWidth,
      main: document.querySelector<HTMLElement>(".app-main")!.scrollWidth -
        document.querySelector<HTMLElement>(".app-main")!.clientWidth,
    }));
    expect(overflow).toEqual({ document: 0, sidebar: 0, main: 0 });
    if (skin === "minecraft" || skin === "mcwood") {
      const screenshotPath = test.info().outputPath(`${skin}-readability.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });
      await test.info().attach(`${skin}-readability`, {
        path: screenshotPath,
        contentType: "image/png",
      });
    }
  });
}

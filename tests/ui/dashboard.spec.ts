import { expect, test } from "@playwright/test";

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

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

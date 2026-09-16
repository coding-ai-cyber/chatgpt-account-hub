import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "dashboard.spec.ts",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:1420",
    colorScheme: "light",
    locale: "zh-CN",
  },
  webServer: {
    command: "pnpm dev --host 127.0.0.1",
    url: "http://127.0.0.1:1420/tests/ui/preview.html",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

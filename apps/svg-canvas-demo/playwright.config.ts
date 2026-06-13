import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e/specs",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL: "http://localhost:5174",
		viewport: { width: 1440, height: 900 },
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		// テスト専用フックは data-testid で統一する（data-kind/data-id は機能契約のため使い分ける）
		testIdAttribute: "data-testid",
	},
	webServer: {
		command: "pnpm dev",
		port: 5174,
		reuseExistingServer: !process.env.CI,
	},
});

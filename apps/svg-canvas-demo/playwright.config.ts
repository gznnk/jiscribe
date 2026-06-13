import { defineConfig } from "@playwright/test";

// headed 実行（--headed / --ui）の時だけ、目視しやすいように
// 直列実行（workers: 1）＋ slowMo を有効にする。
// （テスト後の待機はワーカー側で testInfo.project.use.headless を見て判定する。
//  process.argv はこのメインプロセスでしか --headed を持たないため。）
const isHeaded =
	process.argv.includes("--headed") || process.argv.includes("--ui");

export default defineConfig({
	testDir: "./e2e/specs",
	fullyParallel: !isHeaded,
	workers: isHeaded ? 1 : undefined,
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
		// headed Chromium ではクリップボード読み取りで権限ポップアップが出てテストが止まる。
		// 権限を付与してポップアップを抑止する（ヘッドレスでも害はない）。
		permissions: ["clipboard-read", "clipboard-write"],
		launchOptions: isHeaded ? { slowMo: 500 } : {},
	},
	webServer: {
		command: "pnpm dev",
		port: 5174,
		reuseExistingServer: !process.env.CI,
	},
});

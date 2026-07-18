import { createServer } from "node:net";

import { defineConfig } from "@playwright/test";

// headed 実行（--headed / --ui）の時だけ、目視しやすいように
// 直列実行（workers: 1）＋ slowMo を有効にする。
// （テスト後の待機はワーカー側で testInfo.project.use.headless を見て判定する。
//  process.argv はこのメインプロセスでしか --headed を持たないため。）
const isHeaded =
	process.argv.includes("--headed") || process.argv.includes("--ui");

// e2e 専用サーバーのポートを実行ごとに OS の空きポート（エフェメラル領域）から取得する。
// 固定ポートだと dev サーバー（dev:demo / dev:web 等）と競合し、複数 e2e の同時起動もできない。
// この config はワーカー各プロセスでも再評価されるため、最初に決めたポートを
// PLAYWRIGHT_PORT に焼き付けて全プロセスで共有する（さもないと baseURL と
// webServer の起動ポートがワーカーごとにズレて ERR_CONNECTION_REFUSED になる）。
const port = process.env.PLAYWRIGHT_PORT
	? Number(process.env.PLAYWRIGHT_PORT)
	: await new Promise<number>((resolve, reject) => {
			const probe = createServer();
			probe.on("error", reject);
			probe.listen(0, "127.0.0.1", () => {
				const address = probe.address();
				const freePort =
					typeof address === "object" && address ? address.port : 0;
				probe.close(() => resolve(freePort));
			});
		});
process.env.PLAYWRIGHT_PORT = String(port);

export default defineConfig({
	testDir: "./e2e/specs",
	fullyParallel: !isHeaded,
	workers: isHeaded ? 1 : undefined,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL: `http://localhost:${port}`,
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
		// 掴んだ空きポートに strictPort で固定。ズレて別ポートに逃げると
		// baseURL と食い違って全テストが接続失敗するため、逃がさず即エラーにする。
		command: `pnpm dev:harness --port ${port} --strictPort`,
		port,
		// ポートは実行ごとに変わるので reuse しない（毎回専用サーバーを起動・破棄）。
		reuseExistingServer: false,
	},
});

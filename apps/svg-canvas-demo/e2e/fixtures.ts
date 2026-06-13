import { test as base } from "@playwright/test";

import { CanvasDriver } from "./support/CanvasDriver";

type CanvasFixtures = {
	/** アプリを開いてロード完了まで待った状態のキャンバスドライバ */
	canvas: CanvasDriver;
};

export const test = base.extend<CanvasFixtures>({
	canvas: async ({ page }, use) => {
		const canvas = new CanvasDriver(page);
		await canvas.goto();
		// クリップボード権限を付与しているため readText() が実 OS クリップボードを
		// 返す。テスト間の持ち越しを防ぐため、各テスト開始時に空にしておく
		// （内部クリップボードのみに依存する前提を保つ）。
		await page.evaluate(() => navigator.clipboard.writeText("")).catch(() => {});
		await use(canvas);
	},
});

// headed 実行（--headed / --ui）の時だけ、各テスト完了後に少し待って
// 最終状態を目視できるようにする。
// 注意: process.argv はメインプロセス（config）でしか --headed を持たず、
// env mutation はワーカー再生成（失敗時など）で伝わらないことがある。
// ワーカー内で確実に取れる解決済み use.headless を見る（headed なら false）。
test.afterEach(async ({ page }, testInfo) => {
	if (testInfo.project.use.headless === false) {
		await page.waitForTimeout(1000);
	}
});

export { expect } from "@playwright/test";

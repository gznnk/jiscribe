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
		await use(canvas);
	},
});

export { expect } from "@playwright/test";

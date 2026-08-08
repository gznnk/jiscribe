import { test as base } from "@playwright/test";

import { CanvasDriver } from "./support/CanvasDriver";

type CanvasFixtures = {
	/** Canvas driver with the app opened and loading complete. */
	canvas: CanvasDriver;
};

export const test = base.extend<CanvasFixtures>({
	canvas: async ({ page }, use) => {
		const canvas = new CanvasDriver(page);
		await canvas.goto();
		// Clipboard permission is granted, so readText() returns the real OS clipboard. Empty it
		// at the start of each test to stop carry-over and keep tests resting only on the
		// internal clipboard.
		await page
			.evaluate(() => navigator.clipboard.writeText(""))
			.catch(() => {});
		await use(canvas);
	},
});

// Pause briefly after each test under a headed run (--headed / --ui) so the final state can
// be seen. Only the main process (config) has --headed on process.argv, and env mutation may
// not survive a worker respawn after a failure, so this reads the resolved use.headless, which
// a worker can always see and which is false when headed.
test.afterEach(async ({ page }, testInfo) => {
	if (testInfo.project.use.headless === false) {
		await page.waitForTimeout(1000);
	}
});

export { expect } from "@playwright/test";

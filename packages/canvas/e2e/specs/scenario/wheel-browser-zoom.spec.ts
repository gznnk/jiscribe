import type { Page } from "@playwright/test";

import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * A Ctrl-held wheel over the canvas chrome is cancelled, which is what keeps the
 * browser from zooming the whole page.
 *
 * The canvas wheel listener covers the drawing region alone, so the toolbar and the
 * sidebars beside it used to hand a Ctrl+wheel — and a trackpad pinch, which arrives
 * as the same event — straight to the browser: the page zoomed while the drawing
 * stayed where it was. useBlockBrowserZoom cancels it at the canvas root instead.
 *
 * Whether the browser actually zoomed is not observable from the page, so the
 * assertion is on the event: a listener on `window` runs after the root's capture
 * listener and sees `defaultPrevented`. A plain wheel has to stay untouched there,
 * or a sidebar's list would stop scrolling.
 */

/** Records `defaultPrevented` of each wheel that reaches window, oldest first. */
async function recordWheelCancellation(page: Page) {
	await page.evaluate(() => {
		const cancelled: boolean[] = [];
		Object.assign(window, { __wheelCancelled: cancelled });
		// Bubble phase on window: it runs after the canvas root's capture listener,
		// so a cancelled event is already marked by the time it is recorded.
		window.addEventListener("wheel", (e) => {
			cancelled.push(e.defaultPrevented);
		});
	});
}

async function readWheelCancellation(page: Page): Promise<boolean[]> {
	return page.evaluate(
		() =>
			(window as unknown as { __wheelCancelled: boolean[] }).__wheelCancelled,
	);
}

/** Turns the wheel over the center of `selector`, optionally holding Ctrl. */
async function wheelOver(
	page: Page,
	selector: string,
	{ ctrl }: { ctrl: boolean },
) {
	const box = await page.locator(selector).boundingBox();
	if (!box) {
		throw new Error(`${selector} has no box`);
	}
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	if (ctrl) {
		await page.keyboard.down("Control");
	}
	await page.mouse.wheel(0, -120);
	if (ctrl) {
		await page.keyboard.up("Control");
	}
}

test.describe("Ctrl+wheel over the canvas chrome", () => {
	test("is cancelled over the toolbar and leaves the view where it was", async ({
		canvas,
	}) => {
		const viewBoxBefore = await canvas.getViewBox();
		await recordWheelCancellation(canvas.page);

		await wheelOver(canvas.page, selectors.toolbar, { ctrl: true });

		await expect
			.poll(() => readWheelCancellation(canvas.page), {
				message: "the Ctrl+wheel over the toolbar is cancelled",
			})
			.toEqual([true]);
		// The chrome only swallows the gesture: zooming stays with the drawing region.
		expect(await canvas.getViewBox()).toBe(viewBoxBefore);
	});

	test("is cancelled over the shape library sidebar", async ({ canvas }) => {
		await canvas.page.locator(selectors.stencilLibraryToggle).click();
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanel),
		).toBeVisible();
		await recordWheelCancellation(canvas.page);

		await wheelOver(canvas.page, selectors.stencilLibraryPanel, { ctrl: true });

		await expect
			.poll(() => readWheelCancellation(canvas.page), {
				message: "the Ctrl+wheel over the sidebar is cancelled",
			})
			.toEqual([true]);
	});

	test("leaves a plain wheel over the sidebar to native scrolling", async ({
		canvas,
	}) => {
		await canvas.page.locator(selectors.stencilLibraryToggle).click();
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanel),
		).toBeVisible();
		await recordWheelCancellation(canvas.page);

		await wheelOver(canvas.page, selectors.stencilLibraryPanel, {
			ctrl: false,
		});

		await expect
			.poll(() => readWheelCancellation(canvas.page), {
				message: "the plain wheel over the sidebar reaches the browser",
			})
			.toEqual([false]);
	});
});

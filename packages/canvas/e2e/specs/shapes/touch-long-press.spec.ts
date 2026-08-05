import type { Page } from "@playwright/test";

import { test, expect } from "../../fixtures";
import type { TouchPoint } from "../../support/cdpTouch";
import {
	dispatchTouch,
	enableTouch,
	flushFrames,
} from "../../support/cdpTouch";
import { selectors } from "../../support/selectors";

/**
 * Touch long press: holding a touch within the drag slop for
 * LONG_PRESS_DURATION_MS (500ms) opens the context menu, wherever the press
 * lands (background or shape), mirroring the right-button click. The lift that
 * follows fires no click, so the menu stays open until the next tap.
 */

const FIRST_FINGER_ID = 1;

// LONG_PRESS_DURATION_MS (500ms) plus slack for timer + RAF delivery
const HOLD_MS = 700;

const contextMenu = (page: Page) =>
	page.locator(selectors.contextMenuAny).first();

// Same guard as the other touch specs: capture races surface only as uncaught
// page errors, which menu assertions would pass right over.
let pageErrors: Error[] = [];
test.beforeEach(({ page }) => {
	pageErrors = [];
	page.on("pageerror", (error) => pageErrors.push(error));
});
test.afterEach(() => {
	expect(pageErrors, "uncaught page errors").toEqual([]);
});

test.describe("touch long press opens the context menu", () => {
	test("holding on the background opens the menu and it survives the lift", async ({
		canvas,
		page,
	}) => {
		const client = await enableTouch(page);
		const tp = (p: TouchPoint): TouchPoint => ({ ...p, ...canvas.toScreen(p) });

		await dispatchTouch(client, "touchStart", [
			tp({ x: 400, y: 300, id: FIRST_FINGER_ID }),
		]);
		await page.waitForTimeout(HOLD_MS);
		await flushFrames(page);

		await expect(contextMenu(page)).toBeVisible();

		// Lifting fires no click, so the menu stays open
		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);
		await expect(contextMenu(page)).toBeVisible();

		// The next background tap closes it
		await dispatchTouch(client, "touchStart", [
			tp({ x: 800, y: 600, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);
		await expect(contextMenu(page)).toHaveCount(0);
	});

	test("holding on a shape opens the menu without moving the shape", async ({
		canvas,
		page,
	}) => {
		// Rect centered at (500, 260)
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();

		const client = await enableTouch(page);
		const tp = (p: TouchPoint): TouchPoint => ({ ...p, ...canvas.toScreen(p) });
		const transform0 = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		)?.transform;

		await dispatchTouch(client, "touchStart", [
			tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
		]);
		await page.waitForTimeout(HOLD_MS);
		await flushFrames(page);

		await expect(contextMenu(page)).toBeVisible();

		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);
		expect(
			(await canvas.captureObjects()).find((obj) => obj.id === id)?.transform,
		).toBe(transform0);
	});

	test("a hold that becomes a drag opens no menu", async ({ canvas, page }) => {
		const client = await enableTouch(page);
		const tp = (p: TouchPoint): TouchPoint => ({ ...p, ...canvas.toScreen(p) });

		await dispatchTouch(client, "touchStart", [
			tp({ x: 400, y: 300, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchMove", [
			tp({ x: 500, y: 300, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await page.waitForTimeout(HOLD_MS);
		await flushFrames(page);

		await expect(contextMenu(page)).toHaveCount(0);

		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);
	});
});

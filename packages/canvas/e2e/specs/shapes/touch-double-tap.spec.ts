import type { Page } from "@playwright/test";

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import type { TouchPoint } from "../../support/cdpTouch";
import {
	dispatchTouch,
	enableTouch,
	flushFrames,
} from "../../support/cdpTouch";

/**
 * Touch double tap: two taps pair into a doubleClick over a distance a finger
 * actually lands within, not the mouse one. Each tap may wander anywhere inside
 * the touch drag slop (DRAG_THRESHOLD_TOUCH, 10px), so two taps a human means as
 * one double tap routinely sit further apart than the mouse pairing distance
 * (DOUBLE_CLICK_DISTANCE_THRESHOLD, 5px); touch is measured against
 * DOUBLE_CLICK_DISTANCE_THRESHOLD_TOUCH (20px) instead.
 *
 * The pairing itself is unit-tested in isDoubleClick; what is checked here is
 * that the widened threshold reaches a real gesture — a double tap that misses
 * by a finger's width still opens the text editor — and that it stays bounded.
 * The CDP touch driving caveats live in support/cdpTouch.ts.
 */

const FIRST_FINGER_ID = 1;

// Between DOUBLE_CLICK_DISTANCE_THRESHOLD (5px) and its touch counterpart (20px):
// a miss the mouse threshold rejects and the touch threshold accepts.
const WITHIN_TOUCH_SLOP_PX = 12;

// Past DOUBLE_CLICK_DISTANCE_THRESHOLD_TOUCH (20px), still on the shape.
const BEYOND_TOUCH_SLOP_PX = 30;

// Same guard as the other touch specs: capture races surface only as uncaught
// page errors, which editor assertions would pass right over.
let pageErrors: Error[] = [];
test.beforeEach(({ page }) => {
	pageErrors = [];
	page.on("pageerror", (error) => pageErrors.push(error));
});
test.afterEach(() => {
	expect(pageErrors, "uncaught page errors").toEqual([]);
});

test.describe("touch double tap pairs within the touch slop", () => {
	/**
	 * Tap twice on the shape center, the second tap offset along x by `offsetPx`.
	 *
	 * @param canvas - Driver for the canvas the taps land on; supplies the
	 *   content-to-screen conversion
	 * @param page - Page the CDP touch session is opened on
	 * @param offsetPx - Distance between the two taps, in screen pixels. Applied
	 *   after the conversion because the pairing distance is measured in client
	 *   coordinates, not world ones
	 */
	const doubleTapWithOffset = async (
		canvas: CanvasDriver,
		page: Page,
		offsetPx: number,
	) => {
		const client = await enableTouch(page);
		const center = canvas.toScreen({ x: 500, y: 260 });

		for (const dx of [0, offsetPx]) {
			const point: TouchPoint = {
				x: center.x + dx,
				y: center.y,
				id: FIRST_FINGER_ID,
			};
			await dispatchTouch(client, "touchStart", [point]);
			await dispatchTouch(client, "touchEnd", []);
			await flushFrames(page);
		}
	};

	test("a second tap a finger's width off still starts text editing", async ({
		canvas,
		page,
	}) => {
		// Rect centered at (500, 260)
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await doubleTapWithOffset(canvas, page, WITHIN_TOUCH_SLOP_PX);

		await expect(canvas.textEditorSurface()).toHaveCount(1);
	});

	test("a second tap past the touch slop is a separate tap, not a double tap", async ({
		canvas,
		page,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await doubleTapWithOffset(canvas, page, BEYOND_TOUCH_SLOP_PX);

		await expect(canvas.textEditorSurface()).toHaveCount(0);
	});
});

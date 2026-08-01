import { test, expect } from "../../fixtures";
import type { TouchPoint } from "../../support/cdpTouch";
import {
	dispatchTouch,
	enableTouch,
	flushFrames,
	parseViewBox,
} from "../../support/cdpTouch";

/**
 * Multi-touch spec: the two-finger pinch (pan + zoom) and the palm-rejection
 * behavior inherited from issue #25. One-finger touch panning lives in
 * touch-pan.spec.ts; the CDP touch driving caveats live in support/cdpTouch.ts.
 *
 * Spec (GestureRecognizer's pinch state machine):
 * - a second touch pointerdown before dragStart discards the pending press and
 *   enters pinch mode (no click fires)
 * - during an object drag a second touch is ignored and the first finger's drag
 *   continues (the intent of #25 is preserved)
 * - finger moves during a pinch are consumed as zoom (finger-distance ratio)
 *   and scroll (midpoint movement)
 */

const FIRST_FINGER_ID = 1;
const SECOND_FINGER_ID = 2;

// Touch releases race the RAF-deferred processing: a lifted touch is no longer an
// active pointer and a bare set/releasePointerCapture throws NotFoundError. That
// error surfaces only as an uncaught page error — assertions on shapes/viewBox
// still pass — so every test in this file fails on any uncaught error explicitly.
let pageErrors: Error[] = [];
test.beforeEach(({ page }) => {
	pageErrors = [];
	page.on("pageerror", (error) => pageErrors.push(error));
});
test.afterEach(() => {
	expect(pageErrors, "uncaught page errors").toEqual([]);
});

test.describe("two-finger pinch (pan + zoom)", () => {
	test("spreading the fingers zooms in by the finger-distance ratio", async ({
		canvas,
		page,
	}) => {
		const client = await enableTouch(page);
		// CDP takes raw screen coordinates, so content coordinates are converted before sending.
		const tp = (p: TouchPoint): TouchPoint => ({ ...p, ...canvas.toScreen(p) });

		const [, , width0, height0] = parseViewBox(await canvas.getViewBox());

		// Put both fingers down at (400,300)-(600,300): finger distance 200
		await dispatchTouch(client, "touchStart", [
			tp({ x: 400, y: 300, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchStart", [
			tp({ x: 400, y: 300, id: FIRST_FINGER_ID }),
			tp({ x: 600, y: 300, id: SECOND_FINGER_ID }),
		]);
		await flushFrames(page);

		// Spread the second finger to (800,300): distance 200 -> 400 = 2x zoom
		await dispatchTouch(client, "touchMove", [
			tp({ x: 400, y: 300, id: FIRST_FINGER_ID }),
			tp({ x: 800, y: 300, id: SECOND_FINGER_ID }),
		]);
		await flushFrames(page);

		// 2x zoom = the viewBox width and height halve
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox())[2], {
				message: "doubling the finger distance halves the viewBox width",
			})
			.toBeCloseTo(width0 / 2, 3);
		expect(parseViewBox(await canvas.getViewBox())[3]).toBeCloseTo(
			height0 / 2,
			3,
		);

		await dispatchTouch(client, "touchEnd", []);
	});

	test("moving both fingers in parallel pans without changing zoom", async ({
		canvas,
		page,
	}) => {
		const client = await enableTouch(page);
		const tp = (p: TouchPoint): TouchPoint => ({ ...p, ...canvas.toScreen(p) });

		const [minX0, minY0, width0] = parseViewBox(await canvas.getViewBox());

		await dispatchTouch(client, "touchStart", [
			tp({ x: 400, y: 300, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchStart", [
			tp({ x: 400, y: 300, id: FIRST_FINGER_ID }),
			tp({ x: 600, y: 300, id: SECOND_FINGER_ID }),
		]);
		await flushFrames(page);

		// Both fingers +100px to the right (distance stays 200): midpoint +100 -> minX -100
		await dispatchTouch(client, "touchMove", [
			tp({ x: 500, y: 300, id: FIRST_FINGER_ID }),
			tp({ x: 700, y: 300, id: SECOND_FINGER_ID }),
		]);
		await flushFrames(page);

		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox())[0], {
				message:
					"a parallel two-finger move makes the content follow the fingers (minX decreases)",
			})
			.toBeCloseTo(minX0 - 100, 3);
		const [, minY, width] = parseViewBox(await canvas.getViewBox());
		expect(minY).toBeCloseTo(minY0, 3);
		expect(width).toBeCloseTo(width0, 3);

		await dispatchTouch(client, "touchEnd", []);
	});

	test("a pinch starting on a shape neither moves nor selects it", async ({
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

		const [, , width0] = parseViewBox(await canvas.getViewBox());
		const transform0 = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		)?.transform;

		// First finger on the shape's center; the second lands before it moves -> pinch
		await dispatchTouch(client, "touchStart", [
			tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchStart", [
			tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
			tp({ x: 700, y: 260, id: SECOND_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchMove", [
			tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
			tp({ x: 900, y: 260, id: SECOND_FINGER_ID }),
		]);
		await flushFrames(page);

		// The zoom does take effect
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox())[2], {
				message: "a pinch starting over a shape still zooms",
			})
			.toBeCloseTo(width0 / 2, 3);

		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);

		// The shape did not move and the press did not become a tap (no selection controls)
		expect(
			(await canvas.captureObjects()).find((obj) => obj.id === id)?.transform,
		).toBe(transform0);
		expect(await canvas.hasAnyControl()).toBe(false);
	});
});

test.describe("multi-touch during an object drag (issue #25)", () => {
	test("a second touch during an object drag is ignored and the shape commits at the drag position", async ({
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

		const viewBox0 = await canvas.getViewBox();

		// First finger: press on the shape's center and drag to the final position
		// (800, 560) — in one touchMove, since a finger's later moves have no effect
		await dispatchTouch(client, "touchStart", [
			tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchMove", [
			tp({ x: 800, y: 560, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);

		// A second finger lands after the drag is confirmed: no pinch, just ignored
		await dispatchTouch(client, "touchStart", [
			tp({ x: 800, y: 560, id: FIRST_FINGER_ID }),
			tp({ x: 150, y: 780, id: SECOND_FINGER_ID }),
		]);
		await flushFrames(page);

		await expect
			.poll(
				async () =>
					(await canvas.captureObjects()).find((obj) => obj.id === id)
						?.transform,
				{
					message:
						"the drag position survives the second finger's interruption",
				},
			)
			.toBe("matrix(1, 0, 0, 1, 800, 560)");

		// Neither zoom nor pan happened
		expect(await canvas.getViewBox()).toBe(viewBox0);

		// Releasing both fingers commits at the final position
		await dispatchTouch(client, "touchEnd", [
			tp({ x: 150, y: 780, id: SECOND_FINGER_ID }),
		]);
		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);

		expect(
			(await canvas.captureObjects()).find((obj) => obj.id === id)?.transform,
		).toBe("matrix(1, 0, 0, 1, 800, 560)");
	});
});

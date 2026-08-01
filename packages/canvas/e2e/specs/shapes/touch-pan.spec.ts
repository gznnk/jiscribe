import { test, expect } from "../../fixtures";
import type { TouchPoint } from "../../support/cdpTouch";
import {
	dispatchTouch,
	enableTouch,
	flushFrames,
	parseViewBox,
} from "../../support/cdpTouch";

/**
 * One-finger touch panning: on touch, a drag on the canvas background pans the
 * viewport instead of area-selecting (area selection is unavailable on touch for
 * now), and a second finger landing mid-pan converts the pan into a pinch.
 * Object drags and taps keep their meaning. The CDP touch driving caveats live
 * in support/cdpTouch.ts.
 */

const FIRST_FINGER_ID = 1;
const SECOND_FINGER_ID = 2;

// Same guard as multitouch.spec.ts: capture races surface only as uncaught page
// errors (NotFoundError), which shape/viewBox assertions would pass right over.
let pageErrors: Error[] = [];
test.beforeEach(({ page }) => {
	pageErrors = [];
	page.on("pageerror", (error) => pageErrors.push(error));
});
test.afterEach(() => {
	expect(pageErrors, "uncaught page errors").toEqual([]);
});

test.describe("one-finger touch pan", () => {
	test("a background drag pans the viewport and shows no area-selection rect", async ({
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
		await dispatchTouch(client, "touchMove", [
			tp({ x: 550, y: 380, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);

		// Content follows the finger: +150/+80 drag moves minX/minY by -150/-80
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox())[0], {
				message: "a background touch drag pans the viewport (minX decreases)",
			})
			.toBeCloseTo(minX0 - 150, 3);
		const [, minY, width] = parseViewBox(await canvas.getViewBox());
		expect(minY).toBeCloseTo(minY0 - 80, 3);
		expect(width).toBeCloseTo(width0, 3);

		// No area selection was started
		expect(
			await canvas.page.locator('[data-testid="area-selection-rect"]').count(),
		).toBe(0);

		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);
	});

	test("a second finger landing mid-pan converts the pan into a pinch", async ({
		canvas,
		page,
	}) => {
		const client = await enableTouch(page);
		const tp = (p: TouchPoint): TouchPoint => ({ ...p, ...canvas.toScreen(p) });

		const [minX0, , width0] = parseViewBox(await canvas.getViewBox());

		// Pan with one finger: +100 to the right
		await dispatchTouch(client, "touchStart", [
			tp({ x: 400, y: 300, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchMove", [
			tp({ x: 500, y: 300, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox())[0])
			.toBeCloseTo(minX0 - 100, 3);

		// Second finger lands mid-pan and spreads: the pan converts into a pinch
		await dispatchTouch(client, "touchStart", [
			tp({ x: 500, y: 300, id: FIRST_FINGER_ID }),
			tp({ x: 700, y: 300, id: SECOND_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchMove", [
			tp({ x: 500, y: 300, id: FIRST_FINGER_ID }),
			tp({ x: 900, y: 300, id: SECOND_FINGER_ID }),
		]);
		await flushFrames(page);

		// Finger distance 200 -> 400 = 2x zoom, seamlessly after the pan
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox())[2], {
				message: "the pinch entered from a pan still zooms",
			})
			.toBeCloseTo(width0 / 2, 3);

		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);
	});

	test("panning keeps the selection; the tap that follows clears it", async ({
		canvas,
		page,
	}) => {
		// drawShape leaves the new shape selected (controls shown)
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		expect(await canvas.hasAnyControl()).toBe(true);

		const client = await enableTouch(page);
		const tp = (p: TouchPoint): TouchPoint => ({ ...p, ...canvas.toScreen(p) });

		const [minX0] = parseViewBox(await canvas.getViewBox());

		// Pan on empty background: the selection must survive
		await dispatchTouch(client, "touchStart", [
			tp({ x: 150, y: 600, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchMove", [
			tp({ x: 250, y: 650, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);

		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox())[0])
			.toBeCloseTo(minX0 - 100, 3);
		expect(await canvas.hasAnyControl()).toBe(true);

		// A background tap resolves to a click and clears the selection
		await dispatchTouch(client, "touchStart", [
			tp({ x: 900, y: 700, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);

		await expect
			.poll(async () => canvas.hasAnyControl(), {
				message: "the tap after the pan deselects",
			})
			.toBe(false);
	});

	test("panning keeps an active text edit open; the tap that follows commits it", async ({
		canvas,
		page,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		const client = await enableTouch(page);
		const tp = (p: TouchPoint): TouchPoint => ({ ...p, ...canvas.toScreen(p) });
		const editor = canvas.page.locator("textarea");

		// Double-tap the shape to start text editing
		for (let tap = 0; tap < 2; tap++) {
			await dispatchTouch(client, "touchStart", [
				tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
			]);
			await dispatchTouch(client, "touchEnd", []);
			await flushFrames(page);
		}
		await expect(editor).toHaveCount(1);

		// Pan on empty background: the editor must stay open
		await dispatchTouch(client, "touchStart", [
			tp({ x: 150, y: 600, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchMove", [
			tp({ x: 250, y: 650, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);
		await expect(editor).toHaveCount(1);

		// A background tap commits and closes the editor
		await dispatchTouch(client, "touchStart", [
			tp({ x: 900, y: 700, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);
		await expect(editor).toHaveCount(0);
	});

	test("a one-finger drag on a shape still moves the shape, not the viewport", async ({
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

		await dispatchTouch(client, "touchStart", [
			tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchMove", [
			tp({ x: 700, y: 400, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);

		await expect
			.poll(
				async () =>
					(await canvas.captureObjects()).find((obj) => obj.id === id)
						?.transform,
				{ message: "the shape follows the finger" },
			)
			.toBe("matrix(1, 0, 0, 1, 700, 400)");
		expect(await canvas.getViewBox()).toBe(viewBox0);
	});
});

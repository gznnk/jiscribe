import { halfDevicePixelInWorld } from "./halfDevicePixelInWorld";
import { test, expect } from "../../fixtures";

/**
 * Keyboard zoom (Ctrl+= / Ctrl+-) snaps to fixed stops.
 *
 * zoom-keyboard.spec only watches the direction (shrink / widen) and the
 * preserved center. The implementation (ZoomInCommand/ZoomOutCommand) snaps to
 * fixed stops the way Miro does (.../75/100/125/150/..., ZOOM_STOPS in
 * constants/zoom.ts), so zooming in and back out always returns to the stop it
 * started from, 100% for instance. Reverting to a geometric progression
 * (x1.1/x0.9 each time), or stops that drift so 100% is never reached again,
 * survive direction and center checks, so the stop values themselves are pinned
 * here.
 *
 * The initial zoom is 100% (CanvasMapper's zoom:1). viewBox width is
 * width/round(zoom,4), so zoom = vb0.width / vb.width recovers it to ~1e-4.
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

const centerX = (vb: ViewBox): number => vb.minX + vb.width / 2;
const centerY = (vb: ViewBox): number => vb.minY + vb.height / 2;

/** Current zoom factor, relative to the initial zoom of 100%. */
const zoomOf = (vb0: ViewBox, vb: ViewBox): number => vb0.width / vb.width;

test.describe("keyboard zoom snapping to fixed stops", () => {
	test("snaps to the stops 100% -> 125% -> 150% on Ctrl+=", async ({
		canvas,
	}) => {
		const vb0 = parseViewBox(await canvas.getViewBox());

		await canvas.zoomIn();
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).width)
			.toBeLessThan(vb0.width);
		const vb1 = parseViewBox(await canvas.getViewBox());

		await canvas.zoomIn();
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).width)
			.toBeLessThan(vb1.width);
		const vb2 = parseViewBox(await canvas.getViewBox());

		// One stop up from 100% is 125%, one more is 150%.
		expect(zoomOf(vb0, vb1)).toBeCloseTo(1.25, 3);
		expect(zoomOf(vb0, vb2)).toBeCloseTo(1.5, 3);
		// The height follows the same stop.
		expect(vb0.height / vb2.height).toBeCloseTo(1.5, 3);

		// Anchored on the center: the world coordinates of the screen center hold across the steps.
		const slack = await halfDevicePixelInWorld(canvas, vb2.width);
		expect(Math.abs(centerX(vb2) - centerX(vb0))).toBeLessThanOrEqual(slack);
		expect(Math.abs(centerY(vb2) - centerY(vb0))).toBeLessThanOrEqual(slack);
	});

	test("snaps to the stops 100% -> 75% -> 50% on Ctrl+-", async ({
		canvas,
	}) => {
		const vb0 = parseViewBox(await canvas.getViewBox());

		await canvas.zoomOut();
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).width)
			.toBeGreaterThan(vb0.width);
		const vb1 = parseViewBox(await canvas.getViewBox());

		await canvas.zoomOut();
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).width)
			.toBeGreaterThan(vb1.width);
		const vb2 = parseViewBox(await canvas.getViewBox());

		// One stop down from 100% is 75%, one more is 50%.
		expect(zoomOf(vb0, vb1)).toBeCloseTo(0.75, 3);
		expect(zoomOf(vb0, vb2)).toBeCloseTo(0.5, 3);
		expect(vb0.height / vb2.height).toBeCloseTo(0.5, 3);

		const slack = await halfDevicePixelInWorld(canvas, vb2.width);
		expect(Math.abs(centerX(vb2) - centerX(vb0))).toBeLessThanOrEqual(slack);
		expect(Math.abs(centerY(vb2) - centerY(vb0))).toBeLessThanOrEqual(slack);
	});

	test("returns to exactly 100% when zooming out after zooming in", async ({
		canvas,
	}) => {
		const vb0 = parseViewBox(await canvas.getViewBox());

		await canvas.zoomIn();
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).width)
			.toBeLessThan(vb0.width);

		await canvas.zoomOut();
		await expect
			.poll(async () => zoomOf(vb0, parseViewBox(await canvas.getViewBox())))
			.toBeCloseTo(1, 3);

		// A geometric progression would land on 1.0x1.1x0.9=0.99, never back at 100%.
		const vbBack = parseViewBox(await canvas.getViewBox());
		expect(zoomOf(vb0, vbBack)).toBeCloseTo(1, 3);
	});
});

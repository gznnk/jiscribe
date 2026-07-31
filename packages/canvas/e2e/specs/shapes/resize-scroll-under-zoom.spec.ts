import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Non-regression for #72. With zoom != 1, scrolling by wheel while a resize drag
 * is held must keep the bottomRight handle (the path that uses event.last as the
 * cursor's world position) following the real viewport movement.
 *
 * The old implementation added the raw pixel scrollDelta to currentPos (= last).
 * The viewport only moves by scrollDelta/zoom (world units), so with zoom != 1
 * last drifted by a factor of zoom and the resize came away from the cursor.
 * Moving goes through delta and was unaffected.
 *
 * The check compares the world width bottomRight gained (deltaW) against the
 * real viewport movement (the growth of the viewBox minX = worldShift):
 *   - fixed: deltaW ~= worldShift, the handle follows the real movement
 *   - regressed: deltaW ~= scrollDelta (raw px, zoom times worldShift)
 *
 * The expected value is measured straight from the viewBox because
 * viewport.width is a fixed 1000 rather than the real SVG width, so
 * `scrollDelta * (viewBox width / SVG screen width)` only matches the real
 * movement where the SVG renders 1000px wide. worldShift (the minX growth)
 * equals the real movement regardless of the rendered width.
 */

const TOLERANCE_PX = 14;

/** The viewBox minX (world coordinates; horizontal scrolling moves this value). */
async function viewBoxMinX(canvas: CanvasDriver): Promise<number> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	return Number(raw.trim().split(/\s+/)[0]);
}

/** World length of one screen pixel (viewBox width / SVG screen width); smaller the more you zoom in. */
async function worldPerScreenPixel(canvas: CanvasDriver): Promise<number> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const vbWidth = Number(raw.trim().split(/\s+/)[2]);
	const svgScreenWidth = await canvas.page.evaluate(() => {
		const svgs = [...document.querySelectorAll("svg")];
		let best = 0;
		let width = 0;
		for (const svg of svgs) {
			const rect = svg.getBoundingClientRect();
			const area = rect.width * rect.height;
			if (area > best) {
				best = area;
				width = rect.width;
			}
		}
		return width;
	});
	return vbWidth / svgScreenWidth;
}

/** Screen-coordinate center of a transform handle (boundingBox returns screen coordinates). */
async function handleScreenCenter(
	canvas: CanvasDriver,
	handle: "bottomRight",
): Promise<{ x: number; y: number }> {
	const control = canvas.page.locator(selectors.transformControl(handle));
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`cannot locate the ${handle} transform handle`);
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe("scrolling mid-resize under zoom (#72)", () => {
	test("makes bottomRight follow the real viewport movement, not raw pixels, on a wheel scroll during a held drag", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 180 },
			{ x: 520, y: 340 },
		);
		// drawShape auto-selects. Zoom with the handles still up; zooming does not clear the selection.
		const rect = canvas.objectById(id);

		// Zoom in around the shape's center, which therefore keeps its screen position.
		// ctrl+wheel is a fixed 1.1 per notch, so repeat until the scale is small enough.
		const box0 = await rect.boundingBox();
		if (!box0) {
			throw new Error("cannot read the shape's boundingBox");
		}
		const center = canvas.toContent({
			x: box0.x + box0.width / 2,
			y: box0.y + box0.height / 2,
		});
		for (let i = 0; i < 15; i++) {
			if ((await worldPerScreenPixel(canvas)) < 0.5) {
				break;
			}
			await canvas.wheel(center, { deltaY: -200, ctrl: true });
		}

		// Near zoom 1, worldShift ~= scrollDelta and the regression hides, so pin that
		// the zoom-in went far enough (a small scale means a high zoom).
		expect(await worldPerScreenPixel(canvas)).toBeLessThan(0.6);

		// Start a resize on the bottomRight handle and keep it held.
		const handle = await handleScreenCenter(canvas, "bottomRight");
		const worldWInit = Number(await rect.getAttribute("width"));

		await canvas.page.mouse.move(handle.x, handle.y);
		await canvas.page.mouse.down();
		// Widen a little outward to establish the drag and leave headroom.
		await canvas.page.mouse.move(handle.x + 60, handle.y + 40, { steps: 6 });

		try {
			// Read the baseline only once that movement has reached the world width.
			await expect
				.poll(async () => Number(await rect.getAttribute("width")), {
					message: "establishing the drag grows the world width",
				})
				.toBeGreaterThan(worldWInit + 5);
			const widthBefore = Number(await rect.getAttribute("width"));
			const minXBefore = await viewBoxMinX(canvas);

			// Scroll horizontally by wheel during the held drag, without moving the cursor.
			// deltaX>0 grows viewport.minX by scrollDelta/zoom, and the world under the
			// fixed cursor moves right by the same amount. bottomRight follows it, so
			// the world width grows.
			const scrollDelta = 160;
			await canvas.page.mouse.wheel(scrollDelta, 0);

			await expect
				.poll(async () => Number(await rect.getAttribute("width")), {
					message: "the world width grows and settles after the scroll",
				})
				.toBeGreaterThan(widthBefore + 1);
			const widthAfter = Number(await rect.getAttribute("width"));
			const deltaW = widthAfter - widthBefore;

			// The real viewport movement in world units; after the fix bottomRight's gain matches it.
			const worldShift = (await viewBoxMinX(canvas)) - minXBefore;

			// After the fix, bottomRight's gain ~= the real viewport movement.
			// Measured straight from the viewBox, so the SVG's rendered pixel width does not matter.
			expect(Math.abs(deltaW - worldShift)).toBeLessThanOrEqual(TOLERANCE_PX);
			// With the regression (raw px added) deltaW ~= scrollDelta, zoom times
			// worldShift, which lands more than TOLERANCE away from worldShift
			// (< scrollDelta) and fails here.
			expect(deltaW).toBeLessThan(scrollDelta * 0.85);
		} finally {
			await canvas.page.mouse.up();
		}
	});
});

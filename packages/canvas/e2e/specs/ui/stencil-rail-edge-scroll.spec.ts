import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Edge scrolling must not fire spuriously when a D&D starts from the stencil rail,
 * while still working once the pointer has left the edge zone (arm-on-leave).
 *
 * The rail touches the left of the canvas, so at the moment a button is grabbed and
 * dragged toward the canvas the cursor is necessarily inside the left edge zone (or
 * beyond the edge, which counts the same). Edge scrolling arms only after the
 * pointer leaves the zone during the drag, so the grab itself scrolls nothing.
 *
 * Observed through minX of the SVG viewBox (`minX minY w h`), which moves on leftward
 * scrolling. With the default viewport (zoom=1, the SVG drawn nearly 1:1 in its
 * container) the left zone is about 20px on screen, so a point a few px from the edge
 * is inside the zone and 200px in is clearly outside.
 */

/** minX of the viewBox (world coordinates; moves on horizontal scrolling). */
async function viewBoxMinX(canvas: CanvasDriver): Promise<number> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("cannot get the viewBox");
	}
	return Number(raw.trim().split(/\s+/)[0]);
}

/** Screen center of the Rectangle tool button (boundingBox returns screen coordinates). */
async function rectButtonCenter(
	canvas: CanvasDriver,
): Promise<{ x: number; y: number }> {
	const button = canvas.page.locator(selectors.toolButton("Rectangle"));
	const box = await button.boundingBox();
	if (!box) {
		throw new Error("cannot get the position of the Rectangle button");
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe("Stencil rail D&D edge scrolling (arm-on-leave)", () => {
	test("does not pan the canvas when grabbing from the rail and staying in the left zone", async ({
		canvas,
	}) => {
		const minXBefore = await viewBoxMinX(canvas);

		const from = await rectButtonCenter(canvas);
		// A few px right of the left edge, inside the zone. Vertically near the
		// middle to stay clear of the top and bottom edges.
		const leftZoneX = canvas.toScreen({ x: 0, y: 0 }).x + 4;
		const holdY = canvas.toScreen({ x: 0, y: 300 }).y;

		await canvas.page.mouse.move(from.x, from.y);
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(leftZoneX, holdY, { steps: 12 });

			// A spurious scroll would move minX on its own within a few frames. Since this
			// asserts that nothing happens, wait for enough frames before comparing.
			await canvas.page.waitForTimeout(400);

			expect(await viewBoxMinX(canvas)).toBe(minXBefore);
		} finally {
			await canvas.page.mouse.up();
		}
	});

	test("edge-scrolls leftward when returning to the left edge after leaving the zone once (armed)", async ({
		canvas,
	}) => {
		const minXBefore = await viewBoxMinX(canvas);

		const from = await rectButtonCenter(canvas);
		const leftX = canvas.toScreen({ x: 0, y: 0 }).x;
		const holdY = canvas.toScreen({ x: 0, y: 300 }).y;

		await canvas.page.mouse.move(from.x, from.y);
		await canvas.page.mouse.down();
		try {
			// Arm: move right past the left edge zone (well inside).
			await canvas.page.mouse.move(leftX + 220, holdY, { steps: 12 });
			// Back into the left zone and hold: armed, so leftward scrolling starts.
			await canvas.page.mouse.move(leftX + 4, holdY, { steps: 10 });

			// Leftward scrolling keeps decreasing minX on its own; sync by polling.
			await expect
				.poll(() => viewBoxMinX(canvas), {
					message:
						"once armed, the left edge triggers edge scrolling (minX decreases)",
				})
				.toBeLessThan(minXBefore - 1);
		} finally {
			await canvas.page.mouse.up();
		}
	});
});

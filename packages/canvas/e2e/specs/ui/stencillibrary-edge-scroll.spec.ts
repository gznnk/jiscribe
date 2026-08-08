import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Edge scrolling must not fire spuriously when a D&D starts from the StencilLibrary
 * (the top toolbar), while still working once the pointer has left the edge zone
 * (arm-on-leave).
 *
 * The toolbar touches the top of the Canvas, so at the moment a button is grabbed and
 * dragged toward the canvas the cursor is necessarily inside the top edge zone (within
 * about 20px of the edge). The old implementation fired edge scrolling right from
 * dragStart and panned the canvas before the pointer had even moved inside. Now it arms
 * only after the pointer leaves the edge zone during the drag, so only the spurious
 * scroll right after grabbing disappears.
 *
 * Observed through minY of the SVG viewBox (`minX minY w h`), which moves on upward
 * scrolling. With the default viewport (zoom=1, the SVG drawn nearly 1:1 in its
 * container) the top zone is about 20px on screen, so a point a few px from the edge is
 * inside the zone and 200px below is clearly outside.
 */

/** minY of the viewBox (world coordinates; moves on vertical scrolling). */
async function viewBoxMinY(canvas: CanvasDriver): Promise<number> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("cannot get the viewBox");
	}
	return Number(raw.trim().split(/\s+/)[1]);
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

test.describe("StencilLibrary D&D edge scrolling (arm-on-leave)", () => {
	test("does not pan the canvas when grabbing from the edge and staying in the top zone", async ({
		canvas,
	}) => {
		const minYBefore = await viewBoxMinY(canvas);

		const from = await rectButtonCenter(canvas);
		// A few px below the top edge, inside the zone. Horizontally near the center to
		// stay clear of the side edges.
		const holdX = canvas.toScreen({ x: 400, y: 0 }).x;
		const topZoneY = canvas.toScreen({ x: 0, y: 0 }).y + 4;

		await canvas.page.mouse.move(from.x, from.y);
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(holdX, topZoneY, { steps: 12 });

			// A spurious scroll would move minY on its own within a few frames. Since this
			// asserts that nothing happens, wait for enough frames before comparing.
			await canvas.page.waitForTimeout(400);

			expect(await viewBoxMinY(canvas)).toBe(minYBefore);
		} finally {
			await canvas.page.mouse.up();
		}
	});

	test("edge-scrolls upward when returning to the top after leaving the zone once (armed)", async ({
		canvas,
	}) => {
		const minYBefore = await viewBoxMinY(canvas);

		const from = await rectButtonCenter(canvas);
		const holdX = canvas.toScreen({ x: 400, y: 0 }).x;
		const topY = canvas.toScreen({ x: 0, y: 0 }).y;

		await canvas.page.mouse.move(from.x, from.y);
		await canvas.page.mouse.down();
		try {
			// Arm: move down past the top edge zone (well inside).
			await canvas.page.mouse.move(holdX, topY + 220, { steps: 12 });
			// Back into the top zone and hold: armed, so upward scrolling starts.
			await canvas.page.mouse.move(holdX, topY + 4, { steps: 10 });

			// Upward scrolling keeps decreasing minY on its own; sync by polling.
			await expect
				.poll(() => viewBoxMinY(canvas), {
					message:
						"once armed, the top edge triggers edge scrolling (minY decreases)",
				})
				.toBeLessThan(minYBefore - 1);
		} finally {
			await canvas.page.mouse.up();
		}
	});
});

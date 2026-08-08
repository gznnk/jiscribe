import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Guards the boundary of the snap threshold (SNAP_THRESHOLD_PX = 8).
 *
 * snap.spec covers snapping inside the threshold (distance 3) thoroughly, but
 * the negative side, that nothing snaps once it is beyond the threshold, was
 * unchecked. A regression that widens the threshold, sticking to distant shapes,
 * survives the snapping tests. Here the same center-to-center layout is used at
 * distance 5 (inside, snaps) and distance 12 (outside, stays raw) to pin the
 * boundary.
 *
 * zoom=1 with no panning, so screen coordinates are SVG coordinates. B's center
 * approaches A's center X=500, and the difference in width keeps B's left/right
 * off every candidate, leaving only the center X in play.
 */

// A: 200 x 100 centered at (500,200), so centerX=500
const drawWideA = (canvas: CanvasDriver) =>
	canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });

/** Draws B (100 x 100, initially centered at (400,450)). */
const drawSquareB = (canvas: CanvasDriver) =>
	canvas.drawShape("Rectangle", { x: 350, y: 400 }, { x: 450, y: 500 });

async function transformOf(
	canvas: CanvasDriver,
	id: string,
): Promise<string | null | undefined> {
	return (await canvas.captureObjects()).find((o) => o.id === id)?.transform;
}

test.describe("snap threshold boundary", () => {
	test("snaps onto the other shape's center when the center X is inside the threshold (distance 5)", async ({
		canvas,
	}) => {
		await drawWideA(canvas);
		const bId = await drawSquareB(canvas);
		await canvas.deselect();

		// B's center (400,450) -> (505,450): center X 505 is 5 from A's center X 500 (<= 8).
		await canvas.dragInspecting(
			{ x: 400, y: 450 },
			{ x: 505, y: 450 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(1);
				expect(await canvas.snapGuideCoordinates("x")).toEqual([500]);
			},
		);

		// After release the center X snaps to 500.
		await expect
			.poll(() => transformOf(canvas, bId))
			.toBe("matrix(1, 0, 0, 1, 500, 450)");
	});

	test("does not snap and stays at the raw position when the center X is outside the threshold (distance 12)", async ({
		canvas,
	}) => {
		await drawWideA(canvas);
		const bId = await drawSquareB(canvas);
		await canvas.deselect();

		// B's center (400,450) -> (512,450): center X 512 is 12 from A's center X 500 (> 8).
		// Beyond the threshold, so no guide appears and nothing snaps.
		await canvas.dragInspecting(
			{ x: 400, y: 450 },
			{ x: 512, y: 450 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(0);
			},
		);

		// After release it keeps the raw center X of 512.
		await expect
			.poll(() => transformOf(canvas, bId))
			.toBe("matrix(1, 0, 0, 1, 512, 450)");
	});
});

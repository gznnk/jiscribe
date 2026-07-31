import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Pins the "anchor = the opposite edge" behavior of an edge handle (single axis)
 * resize.
 *
 * resize.spec only looks at whether things moved. The numeric relations at the
 * heart of the resize implementation
 *   - the dragged edge moves while the opposite edge stays fixed
 *   - the size changes by the dragged amount
 *   - the center shifts by half of it, since the opposite edge is fixed
 *   - the orthogonal axis (width <-> height) and its center do not move
 * were unchecked. A mistaken anchor (both sides moving around a fixed center,
 * say) breaks "the center shifts by half" and fails here.
 *
 * Snapping can pull dimensions even for a single shape, so it is disabled with
 * ctrl to measure the handle's plain follow. zoom=1, so screen movement is world
 * movement.
 */

const TOLERANCE_PX = 2;

/** Reads the shape's current size (width/height) and center (e,f of the transform). */
async function frameOf(
	canvas: CanvasDriver,
	id: string,
): Promise<{ width: number; height: number; cx: number; cy: number }> {
	return canvas.objectById(id).evaluate((el) => {
		const transform = el.getAttribute("transform") ?? "";
		const match = transform.match(/^matrix\((.+)\)$/);
		const parts = match ? match[1].split(",").map((s) => Number(s.trim())) : [];
		return {
			width: Number(el.getAttribute("width")),
			height: Number(el.getAttribute("height")),
			cx: parts[4],
			cy: parts[5],
		};
	});
}

/**
 * One case per edge handle.
 * The drawn rect (400,200)-(600,320) is width=200 / height=120 centered at
 * (500,260), with top y=200, bottom y=320, left x=400 and right x=600.
 * `to` is where the handle (the edge midpoint) is moved, in content coordinates.
 */
const CASES = [
	{
		handle: "bottomCenter" as const,
		to: { x: 500, y: 420 }, // bottom edge 100 down
		expect: { dWidth: 0, dHeight: 100, dcx: 0, dcy: 50 },
	},
	{
		handle: "topCenter" as const,
		to: { x: 500, y: 140 }, // top edge 60 up
		expect: { dWidth: 0, dHeight: 60, dcx: 0, dcy: -30 },
	},
	{
		handle: "rightCenter" as const,
		to: { x: 680, y: 260 }, // right edge 80 right
		expect: { dWidth: 80, dHeight: 0, dcx: 40, dcy: 0 },
	},
	{
		handle: "leftCenter" as const,
		to: { x: 360, y: 260 }, // left edge 40 left
		expect: { dWidth: 40, dHeight: 0, dcx: -20, dcy: 0 },
	},
];

test.describe("anchor behavior of an edge handle resize", () => {
	for (const testCase of CASES) {
		test(`${testCase.handle}: keeps the opposite edge fixed, changes the size by the drag and the center by half of it`, async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 600, y: 320 },
			);
			const before = await frameOf(canvas, id);

			await canvas.dragTransformHandle(testCase.handle, testCase.to, {
				ctrl: true,
			});

			// Wait for the resize to land, meaning the primary axis size changed.
			const primaryIsWidth = testCase.expect.dWidth !== 0;
			await expect
				.poll(async () =>
					primaryIsWidth
						? (await frameOf(canvas, id)).width
						: (await frameOf(canvas, id)).height,
				)
				.not.toBe(primaryIsWidth ? before.width : before.height);

			const after = await frameOf(canvas, id);
			// The size changes by the dragged amount.
			expect(
				Math.abs(after.width - before.width - testCase.expect.dWidth),
			).toBeLessThanOrEqual(TOLERANCE_PX);
			expect(
				Math.abs(after.height - before.height - testCase.expect.dHeight),
			).toBeLessThanOrEqual(TOLERANCE_PX);
			// With the opposite edge fixed, the center shifts by half the dragged amount.
			expect(
				Math.abs(after.cx - before.cx - testCase.expect.dcx),
			).toBeLessThanOrEqual(TOLERANCE_PX);
			expect(
				Math.abs(after.cy - before.cy - testCase.expect.dcy),
			).toBeLessThanOrEqual(TOLERANCE_PX);
		});
	}
});

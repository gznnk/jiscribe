import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Pins the exact size, center and signs after a resize flip.
 *
 * resize-flip.spec goes as far as the matrix signs flipping and width/height
 * staying positive. The implementation keeps the opposite edge as the anchor, so
 * pulling the right edge handle 100px past the left edge (x=400) to x=300 leaves
 * the shape occupying [300,400]:
 *   - the width is the overshoot = 100 (absolute value)
 *   - center x = (300+400)/2 = 350, from holding the opposite edge at 400
 *   - the flipped scaleX = matrix.a = -1 (no rotation)
 *   - the orthogonal axis (height, center y) is unchanged
 * A mistaken anchor or center calculation survives a sign-only check, so the
 * numbers are pinned here. Snapping is disabled with ctrl. zoom=1.
 */

const TOLERANCE_PX = 2;

type Frame = {
	width: number;
	height: number;
	a: number;
	cx: number;
	cy: number;
};

async function frameOf(canvas: CanvasDriver, id: string): Promise<Frame> {
	return canvas.objectById(id).evaluate((el) => {
		const transform = el.getAttribute("transform") ?? "";
		const match = transform.match(/^matrix\((.+)\)$/);
		const parts = match ? match[1].split(",").map((s) => Number(s.trim())) : [];
		return {
			width: Number(el.getAttribute("width")),
			height: Number(el.getAttribute("height")),
			a: parts[0],
			cx: parts[4],
			cy: parts[5],
		};
	});
}

test.describe("exact dimensions after a resize flip", () => {
	test("occupies [300,400] when the right edge is pulled 100px past the left edge (width 100, center 350, a=-1)", async ({
		canvas,
	}) => {
		// Rect (400,200)-(560,300): left 400, right 560, width 160, height 100, center (480,250).
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 560, y: 300 },
		);
		const before = await frameOf(canvas, id);
		expect(before.a).toBeGreaterThan(0);

		// Pull the right-center handle 100px past the left edge (400), to x=300 (ctrl: no snapping).
		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: 300, y: 250 },
			{ ctrl: true },
		);

		// Wait for the flip (a<0) to apply.
		await expect
			.poll(async () => (await frameOf(canvas, id)).a, {
				message: "a turns negative on a horizontal flip",
			})
			.toBeLessThan(0);

		const after = await frameOf(canvas, id);
		// The width is the overshoot, 100, kept positive as an absolute value.
		expect(Math.abs(after.width - 100)).toBeLessThanOrEqual(TOLERANCE_PX);
		// The flipped scaleX is -1 (no rotation, so a = scaleX).
		expect(Math.abs(after.a - -1)).toBeLessThanOrEqual(0.02);
		// Holding the opposite edge (400) puts center x at (300+400)/2 = 350.
		expect(Math.abs(after.cx - 350)).toBeLessThanOrEqual(TOLERANCE_PX);
		// The orthogonal axis (height, center y) is unchanged.
		expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		expect(Math.abs(after.cy - before.cy)).toBeLessThanOrEqual(TOLERANCE_PX);
	});
});

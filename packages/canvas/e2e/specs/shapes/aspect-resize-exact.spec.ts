import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Pins the exact dimensions of a Shift (aspect-preserving) resize.
 *
 * With the bottomRight handle the implementation
 *   - projects the cursor onto the topLeft->bottomRight diagonal,
 *   - takes newWidth = projected x - topLeft.x and newHeight = newWidth / (width/height),
 *   - anchors topLeft, so center = topLeft + (w/2, h/2).
 * Dropping the cursor on a point of the diagonal must give exactly 2x, so the
 * dimensions, center and ratio are all checked numerically. A mistaken
 * projection or scale factor leaves the ratio close but shifts size and center.
 *
 * Snapping is disabled with ctrl (it does not fire for a single shape, but just
 * in case). zoom=1.
 */

const TOLERANCE_PX = 2;

/** Rect (400,200)-(560,300): width=160 / height=100 / ratio 1.6 / topLeft(400,200) */
const RECT_FROM = { x: 400, y: 200 };
const RECT_TO = { x: 560, y: 300 };
const TOP_LEFT = { x: 400, y: 200 };
const START_WIDTH = 160;
const START_HEIGHT = 100;

/** Reads the shape's size and its center (e,f of the transform matrix). */
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

test.describe("exact dimensions of a Shift resize", () => {
	test("scales to exactly 2x with topLeft fixed when Shift+bottomRight lands on the diagonal", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		const before = await frameOf(canvas, id);
		expect(before.width).toBeCloseTo(START_WIDTH, 1);
		expect(before.height).toBeCloseTo(START_HEIGHT, 1);

		// Twice the diagonal offset (160,100) from topLeft(400,200) = (720,400).
		// The point is on the diagonal, so it projects onto itself. newWidth=320, newHeight=320/1.6=200.
		await canvas.dragTransformHandle(
			"bottomRight",
			{ x: 720, y: 400 },
			{ shift: true, ctrl: true },
		);

		await expect
			.poll(async () => (await frameOf(canvas, id)).width, {
				message: "the width grows on Shift+bottomRight",
			})
			.toBeGreaterThan(before.width + 1);

		const after = await frameOf(canvas, id);
		// Exactly doubled.
		expect(Math.abs(after.width - START_WIDTH * 2)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		expect(Math.abs(after.height - START_HEIGHT * 2)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		// The ratio stays exactly 1.6 through the enlargement.
		expect(after.width / after.height).toBeCloseTo(
			START_WIDTH / START_HEIGHT,
			2,
		);
		// topLeft is the anchor, so the center is topLeft + (newW/2, newH/2) = (560, 300).
		expect(Math.abs(after.cx - (TOP_LEFT.x + START_WIDTH))).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		expect(
			Math.abs(after.cy - (TOP_LEFT.y + START_HEIGHT)),
		).toBeLessThanOrEqual(TOLERANCE_PX);
	});
});

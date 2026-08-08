import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Pins the exact proportional scaling of a multi-select resize.
 *
 * The implementation works off the bbox of the whole selection, anchoring the
 * opposite corner and scaling every child's size and center by the same factor.
 *
 * Dropping on the bbox diagonal (1.5x along the direction (560,100) from the
 * anchor) gives scaleX==scaleY==1.5, so the expected values are unique whether
 * or not multi-select resize preserves the aspect ratio. Each child's size and
 * center must land exactly on 1.5x relative to the anchor; a wrong factor, or a
 * factor that differs per child, fails here.
 *
 * Snapping is disabled with ctrl. zoom=1.
 */

const TOLERANCE_PX = 3;

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

test.describe("exact proportional scaling of a multi-select resize", () => {
	test("scales every child to exactly 1.5x when the corner handle is pulled along the diagonal", async ({
		canvas,
	}) => {
		// A: (220,160)-(380,260) centered at (300,210) / B: (620,160)-(780,260) centered at (700,210).
		// Group bbox: left 220, top 160, right 780, bottom 260 (560 x 100).
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 220, y: 160 },
			{ x: 380, y: 260 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 620, y: 160 },
			{ x: 780, y: 260 },
		);
		await canvas.deselect();

		// Select both with a fully enclosing marquee.
		await canvas.drag({ x: 180, y: 120 }, { x: 820, y: 300 }, 12);

		// Bottom-right corner (780,260) to (1060,310) on the diagonal, anchored at the top-left (220,160).
		// That is 1.5x along the direction (560,100), so scaleX==scaleY==1.5 either way.
		await canvas.dragTransformHandle(
			"bottomRight",
			{ x: 1060, y: 310 },
			{ ctrl: true },
		);

		await expect
			.poll(async () => (await frameOf(canvas, a)).width, {
				message: "A grows wider",
			})
			.toBeGreaterThan(160);

		const af = await frameOf(canvas, a);
		const bf = await frameOf(canvas, b);

		// Sizes go 1.5x: width 160 -> 240, height 100 -> 150, at the same factor for both children.
		expect(Math.abs(af.width - 240)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(af.height - 150)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(bf.width - 240)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(bf.height - 150)).toBeLessThanOrEqual(TOLERANCE_PX);

		// Centers move to 1.5x their distance from the anchor (220,160): A(300,210) -> (340,235), B(700,210) -> (940,235).
		expect(Math.abs(af.cx - 340)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(af.cy - 235)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(bf.cx - 940)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(bf.cy - 235)).toBeLessThanOrEqual(TOLERANCE_PX);
	});
});

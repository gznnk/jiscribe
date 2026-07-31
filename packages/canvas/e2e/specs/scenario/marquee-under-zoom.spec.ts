import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Marquee selection under a non-unit viewBox (while zoomed) must map the rect
 * drawn on screen back to world before testing containment (the screen->world
 * selection hit test).
 *
 * drag / resize / draw-under-zoom all guard transform paths — moving, resizing
 * and creating shapes — and never touch selection (the containment test in
 * collectIdsInArea). Failing to convert the marquee rect to world selects
 * different shapes than the ones enclosed on screen, and at zoom=1 content ==
 * world hides it. This zooms out to get scale > 1, encloses only A on screen and
 * confirms via a group nudge that only A was selected.
 */

/** On-screen bbox of a shape as left/top/right/bottom in content coordinates */
async function contentBox(
	canvas: CanvasDriver,
	id: string,
): Promise<{ left: number; top: number; right: number; bottom: number }> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`cannot read the boundingBox of shape ${id}`);
	}
	const topLeft = canvas.toContent({ x: box.x, y: box.y });
	return {
		left: topLeft.x,
		top: topLeft.y,
		right: topLeft.x + box.width,
		bottom: topLeft.y + box.height,
	};
}

test.describe("marquee selection under zoom", () => {
	test("selects only A when only A is enclosed on screen after zooming out", async ({
		canvas,
	}) => {
		// Place A (left) and B (right) far apart.
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 560, y: 200 },
			{ x: 700, y: 320 },
		);
		await canvas.deselect();

		// Zoom out anchored at the screen center: both shapes stay on screen and scale > 1.
		const initialViewBox = await canvas.getViewBox();
		await canvas.wheel({ x: 500, y: 300 }, { deltaY: 200, ctrl: true });
		await expect
			.poll(() => canvas.getViewBox(), {
				message: "zooming out changes the viewBox",
			})
			.not.toBe(initialViewBox);

		// Measure the on-screen positions after the zoom.
		const aBox = await contentBox(canvas, a);
		const bBox = await contentBox(canvas, b);

		// Putting the marquee's right edge midway between A's right and B's left
		// encloses A fully and leaves B out.
		const splitX = (aBox.right + bBox.left) / 2;
		// Pin down the premise that makes the test meaningful: A inside, B outside.
		expect(aBox.right).toBeLessThan(splitX);
		expect(bBox.left).toBeGreaterThan(splitX);

		// Drag from empty space above and left of A so that only A is enclosed.
		await canvas.drag(
			{ x: aBox.left - 15, y: aBox.top - 15 },
			{ x: splitX, y: aBox.bottom + 15 },
			12,
		);

		// Read the selection off which shape moves under a 1px nudge to the right.
		const aBefore = await canvas.objectById(a).getAttribute("transform");
		const bBefore = await canvas.objectById(b).getAttribute("transform");

		await canvas.nudge("right");

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "the enclosed A moves",
			})
			.not.toBe(aBefore);
		// B was not enclosed, so it stays put.
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(bBefore);
	});
});

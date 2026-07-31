import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Cursor-anchored Ctrl+wheel zoom.
 *
 * driver-input.spec only watches that zooming changes the viewBox, leaving the
 * core UX invariant — the point under the cursor does not move on screen —
 * unguarded. The zoom computation in CanvasEventHandler, where minX/minY are
 * recomputed from the offset ratio, breaks easily under refactoring, and when it
 * does the target flies off somewhere while nothing on screen looks broken.
 *
 * The method: zoom with the cursor on a shape's center and the shape should
 * grow without its on-screen center moving, because the SVG point under the
 * cursor is held fixed. Screen coordinates come from the DOM element's
 * boundingBox.
 */

const TOLERANCE_PX = 2;

/**
 * Center of a shape in content coordinates. boundingBox returns screen
 * coordinates, so toContent() brings it into the same content coordinates the
 * driver's input methods (wheel and friends) take.
 */
async function screenCenter(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`cannot read the boundingBox of shape ${id}`);
	}
	return canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
}

/** On-screen width of a shape */
async function screenWidth(canvas: CanvasDriver, id: string): Promise<number> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`cannot read the boundingBox of shape ${id}`);
	}
	return box.width;
}

test.describe("cursor anchoring of Ctrl+wheel zoom", () => {
	test("keeps the shape's screen position while it grows when zooming in on its center", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();

		const before = await screenCenter(canvas, id);
		const widthBefore = await screenWidth(canvas, id);

		// Zoom in with the cursor on the shape center.
		await canvas.wheel(before, { deltaY: -200, ctrl: true });

		// Wait for the zoom to land, i.e. for the shape to have grown.
		await expect
			.poll(() => screenWidth(canvas, id), {
				message: "zooming in grows the shape on screen",
			})
			.toBeGreaterThan(widthBefore + 1);

		// The point under the cursor, the shape center, does not move on screen.
		const after = await screenCenter(canvas, id);
		expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(TOLERANCE_PX);
	});

	test("keeps the shape's screen position while it shrinks when zooming out on its center", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();

		const before = await screenCenter(canvas, id);
		const widthBefore = await screenWidth(canvas, id);

		await canvas.wheel(before, { deltaY: 200, ctrl: true });

		await expect
			.poll(() => screenWidth(canvas, id), {
				message: "zooming out shrinks the shape on screen",
			})
			.toBeLessThan(widthBefore - 1);

		const after = await screenCenter(canvas, id);
		expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(TOLERANCE_PX);
	});

	test("anchors on the cursor: zooming on A's center holds A in place and moves the distant B", async ({
		canvas,
	}) => {
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 900, y: 500 },
			{ x: 1000, y: 560 },
		);
		await canvas.deselect();

		const aBefore = await screenCenter(canvas, a);
		const bBefore = await screenCenter(canvas, b);
		const aWidthBefore = await screenWidth(canvas, a);

		// Zoom in with the cursor on A's center.
		await canvas.wheel(aBefore, { deltaY: -200, ctrl: true });

		await expect
			.poll(() => screenWidth(canvas, a))
			.toBeGreaterThan(aWidthBefore + 1);

		const aAfter = await screenCenter(canvas, a);
		const bAfter = await screenCenter(canvas, b);

		// A, under the cursor, does not move on screen.
		expect(Math.abs(aAfter.x - aBefore.x)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(aAfter.y - aBefore.y)).toBeLessThanOrEqual(TOLERANCE_PX);

		// B, far from the anchor, does move on screen, proving the anchor is the cursor
		// rather than the screen center.
		const bMoved = Math.hypot(bAfter.x - bBefore.x, bAfter.y - bBefore.y);
		expect(bMoved).toBeGreaterThan(5);
	});
});

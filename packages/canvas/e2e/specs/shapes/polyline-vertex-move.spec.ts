import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Moving a polyline vertex, plus undo / redo.
 *
 * polyline-vertex guards inserting and deleting vertices; dragging an existing
 * vertex handle (part=vertex) to move it (VertexControlHandler's drag) is a
 * separate path. A vertex move rewrites a single element of the points array,
 * and failing to record a history entry gives the asymmetric regression where a
 * moved vertex cannot be undone. Guarded by round-tripping the points string.
 */

/** Drags from the center of the control matched by the CSS selector. */
async function dragControl(
	canvas: CanvasDriver,
	controlSelector: string,
	to: { x: number; y: number },
) {
	const control = canvas.page.locator(controlSelector);
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`cannot locate the control ${controlSelector}`);
	}
	// box is in screen coordinates while drag takes content coordinates, hence toContent.
	await canvas.drag(
		canvas.toContent({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
		to,
		10,
	);
}

test.describe("moving a polyline vertex", () => {
	test("changes the coordinates on a vertex handle drag, reverts on undo and reapplies on redo", async ({
		canvas,
	}) => {
		// Horizontal 2-point polyline (300,300 -> 600,300). Selected right after drawing, so the vertex handles show.
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 300 },
		);
		const before = await canvas.objectById(id).getAttribute("points");

		// Drag the right vertex (index 1) diagonally upward.
		await dragControl(canvas, `[data-id="${id}"][data-part="vertex:1"]`, {
			x: 650,
			y: 180,
		});

		await expect
			.poll(() => canvas.objectById(id).getAttribute("points"), {
				message: "points change when the vertex moves",
			})
			.not.toBe(before);
		const moved = await canvas.objectById(id).getAttribute("points");

		// undo returns the original vertex coordinates.
		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("points"), {
				message: "undo returns the vertex to its original coordinates",
			})
			.toBe(before);

		// redo reapplies the moved coordinates.
		await canvas.redo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("points"), {
				message: "redo reapplies the vertex move",
			})
			.toBe(moved);
	});
});

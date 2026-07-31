import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Adding vertices to a polygon (a closed shape).
 *
 * polyline-vertex.spec covers midpoint insertion on an open polyline. A polygon
 * is closed, so VertexInsertControls also puts a midpoint handle on the closing
 * segment from the last vertex back to the first (the closed path). Guarded
 * through the points attribute: a midpoint drag adds one vertex on a closed
 * shape too.
 */

/** Counts vertices in the points attribute (space-separated "x1,y1 x2,y2 ..."). */
async function vertexCount(canvas: CanvasDriver, id: string): Promise<number> {
	const points = await canvas.objectById(id).getAttribute("points");
	return points ? points.trim().split(/\s+/).length : 0;
}

/** Drags by a relative amount from the center of the control matched by the CSS selector. */
async function dragControlBy(
	canvas: CanvasDriver,
	controlSelector: string,
	delta: { dx: number; dy: number },
) {
	const control = canvas.page.locator(controlSelector);
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`cannot locate the control ${controlSelector}`);
	}
	// box is in screen coordinates, so convert to content coordinates before adding the delta.
	const from = canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
	await canvas.drag(from, { x: from.x + delta.dx, y: from.y + delta.dy }, 10);
}

test.describe("adding polygon vertices", () => {
	test("adds a vertex to the closed shape when a segment midpoint handle is dragged", async ({
		canvas,
	}) => {
		// Place a polygon with a diagonal drag (selected right after drawing, so the vertex handles show)
		const id = await canvas.drawShape(
			"Polygon",
			{ x: 400, y: 200 },
			{ x: 600, y: 360 },
		);
		const before = await vertexCount(canvas, id);
		expect(before).toBeGreaterThanOrEqual(3); // a closed shape needs at least 3 vertices

		// Drag segment 0's midpoint handle outward to insert one vertex
		await dragControlBy(
			canvas,
			`[data-id="${id}"][data-part="vertex-insert:0"]`,
			{ dx: 0, dy: 80 },
		);

		await expect
			.poll(() => vertexCount(canvas, id), {
				message: "the midpoint drag adds one vertex",
			})
			.toBe(before + 1);
		// Still a polygon, so it stays closed
		const created = (await canvas.captureObjects()).find((o) => o.id === id);
		expect(created?.tag).toBe("polygon");
	});

	test("removes one vertex when a selected vertex handle is deleted and restores it with undo", async ({
		canvas,
	}) => {
		// The default polygon is a regular pentagon (5 vertices), and a closed shape needs 3 at minimum, so one can go.
		const id = await canvas.drawShape(
			"Polygon",
			{ x: 400, y: 200 },
			{ x: 600, y: 360 },
		);
		const before = await vertexCount(canvas, id);
		expect(before).toBe(5);

		// Click the vertex 0 (straight up) handle to select it; a selected handle takes the selection fill.
		// Delete only after that fill change lands, which is when selectedVertex is committed.
		const selectedFill = await canvas.normalizeColor("#0d99ff");
		await canvas.page.click(`[data-id="${id}"][data-part="vertex:0"]`);
		await expect
			.poll(
				() =>
					canvas.page
						.locator(`[data-id="${id}"][data-part="vertex:0"]`)
						.evaluate((el) => getComputedStyle(el).fill),
				{ message: "the vertex is selected, showing the selection fill" },
			)
			.toBe(selectedFill);
		await canvas.deleteSelection();

		// One vertex fewer, and it stays a closed polygon.
		await expect
			.poll(() => vertexCount(canvas, id), {
				message: "deleting leaves 4 vertices",
			})
			.toBe(before - 1);
		const afterDelete = (await canvas.captureObjects()).find(
			(o) => o.id === id,
		);
		expect(afterDelete?.tag).toBe("polygon");

		// undo brings the vertex count back.
		await canvas.undo();
		await expect
			.poll(() => vertexCount(canvas, id), {
				message: "undo restores 5 vertices",
			})
			.toBe(before);
	});
});

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Polyline vertex editing (adding and deleting).
 *
 * Guards vertex insertion (VertexInsertHandler) and deletion by selecting a
 * vertex handle then pressing Delete (VertexControlHandler.handleClick ->
 * DeleteCommand's selectedVertex path). The points attribute is checked: a
 * midpoint handle drag adds a vertex, and deleting a selected middle vertex
 * removes one.
 *
 * Sync note: a vertex counts as selected once its fill turns the selection color
 * (#0d99ff). Delete is pressed only after that commit.
 *
 * Check note: removing the middle vertex turns the polyline back into a
 * horizontal straight line (height 0). Playwright's toBeVisible() treats a
 * zero-height element as hidden, so existence is checked with count (and the
 * vertex count).
 */

/** Counts vertices in the points attribute ("x1,y1 x2,y2" -> 2). */
async function vertexCount(canvas: CanvasDriver, id: string): Promise<number> {
	const points = await canvas.objectById(id).getAttribute("points");
	return points ? points.trim().split(/\s+/).length : 0;
}

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

test.describe("polyline vertex editing", () => {
	test("adds a vertex when a segment midpoint handle is dragged", async ({
		canvas,
	}) => {
		// Horizontal 2-point polyline (midpoint at 450,300). Selected right after drawing, so the vertex handles show.
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 300 },
		);
		expect(await vertexCount(canvas, id)).toBe(2);

		// Drag segment 0's midpoint handle down to insert a vertex in the middle
		await dragControl(
			canvas,
			`[data-id="${id}"][data-part="vertex-insert:0"]`,
			{ x: 450, y: 420 },
		);

		await expect
			.poll(() => vertexCount(canvas, id), {
				message: "the midpoint drag brings the count to 3 vertices",
			})
			.toBe(3);
	});

	test("removes a vertex when a middle vertex handle is selected and deleted", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 300 },
		);
		// First drag the midpoint to reach 3 points (the inserted vertex is index 1)
		await dragControl(
			canvas,
			`[data-id="${id}"][data-part="vertex-insert:0"]`,
			{ x: 450, y: 420 },
		);
		await expect.poll(() => vertexCount(canvas, id)).toBe(3);

		// Click the middle vertex handle to select it; a selected handle takes the selection fill.
		// Delete only after that fill change, which is when selectedVertex is committed.
		const selectedFill = await canvas.normalizeColor("#0d99ff");
		await canvas.page.click(`[data-id="${id}"][data-part="vertex:1"]`);
		await expect
			.poll(
				() =>
					canvas.page
						.locator(`[data-id="${id}"][data-part="vertex:1"]`)
						.evaluate((el) => getComputedStyle(el).fill),
				{ message: "the vertex is selected, showing the selection fill" },
			)
			.toBe(selectedFill);
		await canvas.deleteSelection();

		// The shape itself stays (checked with count, not visibility, since it becomes a zero-height line) and only loses one vertex
		await expect
			.poll(() => vertexCount(canvas, id), {
				message: "deleting brings it back to 2 vertices",
			})
			.toBe(2);
		expect(await canvas.objectById(id).count()).toBe(1);
	});
});

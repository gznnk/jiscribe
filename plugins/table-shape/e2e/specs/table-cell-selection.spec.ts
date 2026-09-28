import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import { cellRect, selectionOutlines } from "../support/tableDom";

/**
 * Selecting cells of a table, in a real browser. The table declares no part kind
 * of its own for them: its cells *are* the text slots core registers for every
 * slot-bearing type, so clicking one, widening the run and outlining every cell of
 * it all come from the shared machinery. What this spec answers is that the table
 * actually rides it — that the boxes the overlay draws are the cell rects the grid
 * lays out, which only a browser can say.
 */

/** The content coordinate at the middle of one cell. */
async function cellCenter(
	canvas: CanvasDriver,
	objectId: string,
	cellId: string,
): Promise<{ x: number; y: number }> {
	const cell = await cellRect(canvas, objectId, cellId);
	return canvas.toContent({
		x: cell.x + cell.width / 2,
		y: cell.y + cell.height / 2,
	});
}

/** Clicks the middle of one cell of the already-selected table. */
async function clickCell(
	canvas: CanvasDriver,
	objectId: string,
	cellId: string,
): Promise<void> {
	await canvas.clickAt(await cellCenter(canvas, objectId, cellId));
}

/** Shift-clicks the middle of one cell, which widens the run to it. */
async function shiftClickCell(
	canvas: CanvasDriver,
	objectId: string,
	cellId: string,
): Promise<void> {
	await canvas.shiftClickAt(await cellCenter(canvas, objectId, cellId));
}

test.describe("table cell selection", () => {
	test("outlines the one cell a click lands in, inside the table's own outline", async ({
		canvas,
	}) => {
		// Placed and left selected, which is when a click addresses a cell rather
		// than the object.
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");

		const outlines = await selectionOutlines(canvas);
		// The table's own box first, the cell's second (SelectionOverlay).
		expect(outlines).toHaveLength(2);
		expect(outlines[1].width).toBeCloseTo(outlines[0].width / 2, 6);
		expect(outlines[1].height).toBeCloseTo(outlines[0].height / 2, 6);
		expect(outlines[1].x).toBeCloseTo(outlines[0].x, 6);
		expect(outlines[1].y).toBeCloseTo(outlines[0].y, 6);
	});

	test("widens to the run of cells between the anchor and a Shift-clicked one", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");
		await shiftClickCell(canvas, id, "r0c1");

		// One box per cell of the run, on top of the table's own.
		expect(await selectionOutlines(canvas)).toHaveLength(3);

		// The run is taken in the order the type lists its cells, which is row by
		// row — so reaching the far corner takes in the whole 2x2 grid.
		await shiftClickCell(canvas, id, "r1c1");
		expect(await selectionOutlines(canvas)).toHaveLength(5);
	});

	test("collapses back to one cell on a plain click", async ({ canvas }) => {
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");
		await shiftClickCell(canvas, id, "r1c1");
		await clickCell(canvas, id, "r1c0");

		const outlines = await selectionOutlines(canvas);
		expect(outlines).toHaveLength(2);
		// The lower-left cell: the bottom half of the box, on its left.
		expect(outlines[1].x).toBeCloseTo(outlines[0].x, 6);
		expect(outlines[1].y).toBeCloseTo(
			outlines[0].y + outlines[0].height / 2,
			6,
		);
	});

	test("puts the width handles away while cells are the operated target", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await expect(
			canvas.page.locator(selectors.transformControl("leftCenter")),
		).toBeVisible();

		await clickCell(canvas, id, "r0c0");

		// Resizing acts on the whole table, so its handles would compete with the
		// box drawn around the cell (isObjectPartOutlined).
		await expect(
			canvas.page.locator(selectors.transformControl("leftCenter")),
		).toHaveCount(0);
	});
});

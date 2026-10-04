import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCount,
	cellRect,
	clickInsertBadge,
	selectedCellIds,
	selectionOutlines,
} from "../support/tableDom";

/**
 * Selecting cells of a table, in a real browser. The table declares no part kind
 * of its own for them: its cells *are* the text slots core registers for every
 * slot-bearing type, so clicking one and outlining it both come from the shared
 * machinery, and only what a range of them means is the table's own
 * (collectTableCellRange). What this spec answers is that the table actually
 * rides it — that the boxes the overlay draws are the cell rects the grid lays
 * out, which only a browser can say.
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

	test("widens to the rectangle between the anchor and a Shift-clicked cell", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		// A third column, so the rectangle and the row-major run stop coinciding:
		// on the 2x2 a table is placed as, they are the same four cells.
		await clickInsertBadge(canvas, "columnInsert", 2);
		await expect.poll(async () => cellCount(canvas, id)).toBe(6);

		await clickCell(canvas, id, "r0c0");
		await shiftClickCell(canvas, id, "r0c1");
		expect(await selectedCellIds(canvas, id)).toEqual(["r0c0", "r0c1"]);

		// Reaching the cell below takes in the block the two ends stand at opposite
		// corners of, in the order the type lists its cells — and not r0c2, which
		// the slot order puts between the two ends but the rectangle never reaches.
		await shiftClickCell(canvas, id, "r1c1");
		expect(await selectedCellIds(canvas, id)).toEqual([
			"r0c0",
			"r0c1",
			"r1c0",
			"r1c1",
		]);
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

import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCount,
	cellRect,
	partOutlineRects,
	pressInsertTrack,
	selectedCellIds,
	tableOutlineRect,
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

/** Ctrl-clicks the middle of one cell, which adds it to the pick or takes it out. */
async function ctrlClickCell(
	canvas: CanvasDriver,
	objectId: string,
	cellId: string,
): Promise<void> {
	await canvas.ctrlClickAt(await cellCenter(canvas, objectId, cellId));
}

test.describe("table cell selection", () => {
	test("outlines the one cell a click lands in, in place of the table's own outline", async ({
		canvas,
	}) => {
		// Placed and left selected, which is when a click addresses a cell rather
		// than the object.
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");

		const table = await tableOutlineRect(canvas, id);
		const outlines = await partOutlineRects(canvas);
		expect(outlines).toHaveLength(1);
		expect(outlines[0].width).toBeCloseTo(table.width / 2, 0);
		expect(outlines[0].height).toBeCloseTo(table.height / 2, 0);
		expect(outlines[0].x).toBeCloseTo(table.x, 0);
		expect(outlines[0].y).toBeCloseTo(table.y, 0);
	});

	test("widens to the rectangle between the anchor and a Shift-clicked cell", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		// A third column, so the rectangle and the row-major run stop coinciding:
		// on the 2x2 a table is placed as, they are the same four cells.
		await clickCell(canvas, id, "r0c1");
		await pressInsertTrack(canvas, "ArrowRight");
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

	test("adds a cell apart from the picked one on a Ctrl-click", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");
		await ctrlClickCell(canvas, id, "r1c1");

		// Two cells on a diagonal, which no single range reaches. Outlined at all,
		// they also say the table stayed the selection rather than toggled out.
		expect(await selectedCellIds(canvas, id)).toEqual(["r0c0", "r1c1"]);
	});

	test("takes one cell out of a Shift rectangle on a Ctrl-click", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");
		await shiftClickCell(canvas, id, "r1c1");
		await ctrlClickCell(canvas, id, "r0c1");

		expect(await selectedCellIds(canvas, id)).toEqual(["r0c0", "r1c0", "r1c1"]);
	});

	test("collapses back to one cell on a plain click", async ({ canvas }) => {
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");
		await shiftClickCell(canvas, id, "r1c1");
		await clickCell(canvas, id, "r1c0");

		const table = await tableOutlineRect(canvas, id);
		const outlines = await partOutlineRects(canvas);
		expect(outlines).toHaveLength(1);
		// The lower-left cell: the bottom half of the box, on its left.
		expect(outlines[0].x).toBeCloseTo(table.x, 0);
		expect(outlines[0].y).toBeCloseTo(table.y + table.height / 2, 0);
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

	test("tints a picked cell's box, and outlines it only while its text is edited", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const cell = await cellRect(canvas, id, "r0c0");
		await canvas.page.mouse.dblclick(
			cell.x + cell.width / 2,
			cell.y + cell.height / 2,
		);
		await canvas.waitForTextEditor();

		const outline = canvas.page.locator(selectors.partOutline);
		await expect(outline).toHaveCount(1);
		expect(
			await outline.evaluate((element) => getComputedStyle(element).fill),
		).toBe("none");

		await canvas.page.keyboard.press("Escape");
		await expect(canvas.textEditorSurface()).toHaveCount(0);

		await expect(outline).toHaveCount(1);
		expect(
			await outline.evaluate((element) => getComputedStyle(element).fill),
		).not.toBe("none");
	});

	test("hangs the ObjectMenu under the picked cell rather than under the whole table", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const objectMenu = canvas.page.locator(selectors.objectMenu);
		const menuCenterX = async (): Promise<number | undefined> => {
			const box = await objectMenu.boundingBox();
			return box === null ? undefined : box.x + box.width / 2;
		};

		// Diagonal cells, so both the column (center x) and the row (top) differ.
		const menuTops: number[] = [];
		const cellBottoms: number[] = [];
		for (const cellId of ["r0c0", "r1c1"]) {
			await clickCell(canvas, id, cellId);
			const cell = await cellRect(canvas, id, cellId);
			// The menu's left edge is rounded to whole px, so its center can sit half a px off.
			await expect
				.poll(async () =>
					Math.abs(
						((await menuCenterX()) ?? Infinity) - (cell.x + cell.width / 2),
					),
				)
				.toBeLessThanOrEqual(1);
			menuTops.push((await objectMenu.boundingBox())?.y ?? NaN);
			cellBottoms.push(cell.y + cell.height);
		}
		// The gap below the cell is the same for both, so the menu follows the row.
		expect(
			Math.abs(menuTops[1] - menuTops[0] - (cellBottoms[1] - cellBottoms[0])),
		).toBeLessThanOrEqual(1);
	});
});

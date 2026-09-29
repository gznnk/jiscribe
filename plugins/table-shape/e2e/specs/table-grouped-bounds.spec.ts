import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCenter,
	cellCount,
	cellRect,
	clickInsertBadge,
	clickTrackGrip,
	tableOutlineRect,
	trackGrip,
} from "../support/tableDom";
import type { ClientRect } from "../support/tableDom";

/**
 * A table inside a group, reshaped every way the UI offers, with the group's own
 * frame having to follow each time.
 *
 * A group's frame is cached on the group rather than derived on read, so whoever
 * reshapes a child has to settle it. The table is the first shape that reshapes
 * itself from several directions at once — a command, a control, a drag — and the
 * settling used to depend on which of them was used: an edit handing over a box it
 * had already derived left the frame behind, while one leaving the box to the
 * type's resizer did not. Same act, two answers.
 *
 * What a browser is asked here is the visible half of that: the outline drawn
 * around the selected group has to end where the table ends, whichever way the
 * table was reshaped.
 */

/** How far apart two client-pixel edges may sit and still count as the same edge. */
const EDGE_TOLERANCE_PX = 1.5;

/**
 * The selected group's own outline. The overlay draws one per selected id and per
 * descendant, and a group's is the union of the rest, so the tallest is it.
 */
async function groupOutlineRect(canvas: CanvasDriver): Promise<ClientRect> {
	return canvas.page.evaluate(() => {
		const outlines = [
			...document.querySelectorAll('[data-layer="selection-overlay"] rect'),
		];
		if (outlines.length === 0) {
			throw new Error("nothing is selected, so no outline is drawn");
		}
		const boxes = outlines.map((outline) => outline.getBoundingClientRect());
		const tallest = boxes.reduce((widest, box) =>
			box.height > widest.height ? box : widest,
		);
		return {
			x: tallest.x,
			y: tallest.y,
			width: tallest.width,
			height: tallest.height,
		};
	});
}

/**
 * Places a table, draws a rectangle clear above it, and groups the two. The
 * rectangle is what makes the group's frame a union rather than a copy of the
 * table's, so a frame left unsettled cannot pass by accident.
 *
 * @returns The table's object id, the group left selected
 */
async function groupTableWithRectAbove(canvas: CanvasDriver): Promise<string> {
	const tableId = await canvas.placeShape("Table");
	const table = await tableOutlineRect(canvas, tableId);
	await canvas.deselect();

	// Well above the table and narrower than it, so the group's bottom edge is
	// the table's alone.
	const from = canvas.toContent({ x: table.x + 10, y: table.y - 180 });
	const to = canvas.toContent({ x: table.x + 90, y: table.y - 100 });
	await canvas.drawShape("Rectangle", from, to);
	await canvas.deselect();

	const rectCenter = canvas.toContent({
		x: table.x + 50,
		y: table.y - 140,
	});
	await canvas.selectAt(await cellCenter(canvas, tableId, "r0c0"));
	await canvas.ctrlClickAt(rectCenter);
	await canvas.group();

	return tableId;
}

/**
 * Drills from the group down to the table itself, which is what draws the grips
 * and the `+` badges. Two clicks: the first picks the topmost ancestor, the second
 * the member inside it (determineSelection's "immediate parent is selected").
 *
 * They land on different cells on purpose. Two clicks within 5px of each other
 * pair into a doubleClick (DOUBLE_CLICK_DISTANCE_THRESHOLD), which over a table
 * opens the cell for editing instead of stepping into the group.
 */
async function enterTable(
	canvas: CanvasDriver,
	tableId: string,
): Promise<void> {
	await canvas.deselect();
	await canvas.clickAt(await cellCenter(canvas, tableId, "r1c1"));
	await canvas.clickAt(await cellCenter(canvas, tableId, "r0c0"));
	await expect(trackGrip(canvas, "rowGrip", 0)).toBeVisible();
}

/**
 * Re-picks the whole group and asserts its outline ends where the table does. The
 * bottom edge is the telling one: the table grows and shrinks downward, so a frame
 * nobody settled hangs below the table after a removal and cuts through it after
 * an insertion.
 */
async function expectGroupOutlineToEndAtTable(
	canvas: CanvasDriver,
	tableId: string,
): Promise<void> {
	await canvas.deselect();
	await canvas.selectAt(await cellCenter(canvas, tableId, "r0c0"));

	await expect
		.poll(
			async () => {
				const outline = await groupOutlineRect(canvas);
				const table = await tableOutlineRect(canvas, tableId);
				return Math.abs(outline.y + outline.height - (table.y + table.height));
			},
			{ message: "the group's outline ends where the table ends" },
		)
		.toBeLessThanOrEqual(EDGE_TOLERANCE_PX);
}

test.describe("a grouped table's parent bounds", () => {
	test("start out fitting the table", async ({ canvas }) => {
		const tableId = await groupTableWithRectAbove(canvas);

		await expectGroupOutlineToEndAtTable(canvas, tableId);
	});

	test("follow a row removed with the Delete key", async ({ canvas }) => {
		const tableId = await groupTableWithRectAbove(canvas);
		await enterTable(canvas, tableId);

		await clickTrackGrip(canvas, "rowGrip", 1);
		await canvas.deleteSelection();
		await expect.poll(async () => cellCount(canvas, tableId)).toBe(2);

		await expectGroupOutlineToEndAtTable(canvas, tableId);
	});

	test("follow a row removed from the right-click menu", async ({ canvas }) => {
		const tableId = await groupTableWithRectAbove(canvas);
		await enterTable(canvas, tableId);

		await clickTrackGrip(canvas, "rowGrip", 1);
		await canvas.openContextMenu(await cellCenter(canvas, tableId, "r0c0"));
		await canvas.clickContextMenuCommand("table.deleteRow");
		await expect.poll(async () => cellCount(canvas, tableId)).toBe(2);

		await expectGroupOutlineToEndAtTable(canvas, tableId);
	});

	test("follow a row inserted from the right-click menu", async ({
		canvas,
	}) => {
		const tableId = await groupTableWithRectAbove(canvas);
		await enterTable(canvas, tableId);

		await clickTrackGrip(canvas, "rowGrip", 1);
		await canvas.openContextMenu(await cellCenter(canvas, tableId, "r0c0"));
		await canvas.clickContextMenuCommand("table.insertRowBelow");
		await expect.poll(async () => cellCount(canvas, tableId)).toBe(6);

		await expectGroupOutlineToEndAtTable(canvas, tableId);
	});

	test("follow a row inserted from a + badge", async ({ canvas }) => {
		const tableId = await groupTableWithRectAbove(canvas);
		await enterTable(canvas, tableId);

		// The badge past the last row, so the table grows downward.
		await clickInsertBadge(canvas, "rowInsert", 2);
		await expect.poll(async () => cellCount(canvas, tableId)).toBe(6);

		await expectGroupOutlineToEndAtTable(canvas, tableId);
	});

	test("follow a row boundary dragged taller", async ({ canvas }) => {
		const tableId = await groupTableWithRectAbove(canvas);
		await enterTable(canvas, tableId);

		const before = await tableOutlineRect(canvas, tableId);
		const boundary = await cellRect(canvas, tableId, "r0c0");
		await canvas.drag(
			canvas.toContent({
				x: boundary.x + boundary.width / 2,
				y: boundary.y + boundary.height,
			}),
			canvas.toContent({
				x: boundary.x + boundary.width / 2,
				y: boundary.y + boundary.height + 60,
			}),
		);
		await expect
			.poll(async () => (await tableOutlineRect(canvas, tableId)).height)
			.toBeGreaterThan(before.height);

		await expectGroupOutlineToEndAtTable(canvas, tableId);
	});
});

import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import { cellCenter, cellCount, clickTrackGrip } from "../support/tableDom";

/**
 * What the Delete key means over a table, which depends entirely on what is
 * picked: a range of cells is emptied, a track is removed, and the table itself
 * is deleted. All three are the one keystroke resolving through the type's part
 * definitions, so only a real browser shows that the right one answers.
 */

/** Whether the table is still on the canvas at all. */
async function tableExists(
	canvas: CanvasDriver,
	objectId: string,
): Promise<boolean> {
	return (await canvas.captureObjects()).some(
		(object) => object.id === objectId,
	);
}

/**
 * Writes `text` into one cell and leaves nothing selected. Typing opens the
 * editor with a double click, so it needs no selection of its own, and
 * committing clicks empty space.
 */
async function fillCell(
	canvas: CanvasDriver,
	objectId: string,
	cellId: string,
	text: string,
): Promise<void> {
	await canvas.typeTextAt(await cellCenter(canvas, objectId, cellId), text);
	await canvas.commitText();
}

/**
 * Picks one cell of the table. The table has to be picked up first, a cell only
 * being addressable once its shape is the selection — and picked up by a
 * different cell, two clicks on the same spot being a double click, which opens
 * the editor instead.
 */
async function pickCell(
	canvas: CanvasDriver,
	objectId: string,
	cellId: string,
	viaCellId: string,
): Promise<void> {
	await canvas.selectAt(await cellCenter(canvas, objectId, viaCellId));
	await canvas.clickAt(await cellCenter(canvas, objectId, cellId));
}

test.describe("table delete", () => {
	test("empties the picked cell and leaves the grid standing", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await fillCell(canvas, id, "r0c0", "clear me");
		await fillCell(canvas, id, "r1c1", "keep me");

		await pickCell(canvas, id, "r0c0", "r0c1");
		await canvas.deleteSelection();

		await expect(canvas.page.getByText("clear me")).toHaveCount(0);
		// Only what was picked: the other cell keeps its text, every cell keeps its
		// place, and the table itself is untouched.
		await expect(canvas.page.getByText("keep me").first()).toBeVisible();
		expect(await cellCount(canvas, id)).toBe(4);
		expect(await tableExists(canvas, id)).toBe(true);
	});

	test("removes the row a grip selected, and only that row", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await fillCell(canvas, id, "r0c0", "first row");
		await canvas.selectAt(await cellCenter(canvas, id, "r0c1"));

		await clickTrackGrip(canvas, "rowGrip", 1);
		await canvas.deleteSelection();

		// One row of two columns left, and it is the row that was not picked.
		await expect.poll(async () => cellCount(canvas, id)).toBe(2);
		await expect(canvas.page.getByText("first row").first()).toBeVisible();
		expect(await tableExists(canvas, id)).toBe(true);
	});

	test("removes the column a grip selected, and only that column", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await fillCell(canvas, id, "r0c0", "first column");
		await canvas.selectAt(await cellCenter(canvas, id, "r1c1"));

		await clickTrackGrip(canvas, "columnGrip", 1);
		await canvas.deleteSelection();

		await expect.poll(async () => cellCount(canvas, id)).toBe(2);
		await expect(canvas.page.getByText("first column").first()).toBeVisible();
		expect(await tableExists(canvas, id)).toBe(true);
	});

	test("deletes the whole table when nothing inside it is picked", async ({
		canvas,
	}) => {
		// Placed and left selected as a whole, no cell and no track picked.
		const id = await canvas.placeShape("Table");

		await canvas.deleteSelection();

		await expect.poll(async () => tableExists(canvas, id)).toBe(false);
	});

	test("does nothing with nothing selected", async ({ canvas }) => {
		const id = await canvas.placeShape("Table");
		await canvas.deselect();

		await canvas.deleteSelection();

		expect(await tableExists(canvas, id)).toBe(true);
		expect(await cellCount(canvas, id)).toBe(4);
	});

	test("puts a removed row back in one undo", async ({ canvas }) => {
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "rowGrip", 0);
		await canvas.deleteSelection();
		await expect.poll(async () => cellCount(canvas, id)).toBe(2);

		await canvas.undo();

		await expect.poll(async () => cellCount(canvas, id)).toBe(4);
	});

	test("refuses to take the last row rather than falling through to the table", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "rowGrip", 1);
		await canvas.deleteSelection();
		await expect.poll(async () => cellCount(canvas, id)).toBe(2);

		// A removal clears the part selection, so the one row left has to be picked
		// again — by the grip it kept, which is not the one just clicked, two
		// clicks on a spot being a double click. Delete over it is then spent, not
		// passed on to the object.
		await clickTrackGrip(canvas, "rowGrip", 0);
		await canvas.deleteSelection();

		expect(await cellCount(canvas, id)).toBe(2);
		expect(await tableExists(canvas, id)).toBe(true);
	});
});

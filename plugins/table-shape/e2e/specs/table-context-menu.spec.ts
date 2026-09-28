import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import { cellCenter, cellCount, clickTrackGrip } from "../support/tableDom";

/**
 * The rows a right-click on a table adds. They are the only pointing surface the
 * insertions and the removals have — neither is in the ObjectMenu — so what a
 * browser has to answer is that they are drawn, drawn in the right place, and
 * that their enabled state follows the selection already standing: a right-click
 * changes no selection, so a table picked as a whole must show them off rather
 * than offer a row that does nothing.
 */

/** Every command id the open context menu lists, in the order it draws them. */
async function contextMenuCommandIds(canvas: CanvasDriver): Promise<string[]> {
	return canvas.page.evaluate(() =>
		[...document.querySelectorAll('[data-id="context-menu"]')].map((row) =>
			(row.getAttribute("data-part") ?? "").replace(/^command:/, ""),
		),
	);
}

/** The menu row for one command. */
function contextMenuRow(canvas: CanvasDriver, commandId: string) {
	return canvas.page.locator(selectors.contextMenuCommand(commandId));
}

/** The grid rows, in the order the contribution lists them. */
const GRID_COMMAND_IDS = [
	"table.insertRowAbove",
	"table.insertRowBelow",
	"table.insertColumnLeft",
	"table.insertColumnRight",
	"table.deleteRow",
	"table.deleteColumn",
];

test.describe("table context menu", () => {
	test("puts the grid rows above the built-in block", async ({ canvas }) => {
		const id = await canvas.placeShape("Table");

		await canvas.openContextMenu(await cellCenter(canvas, id, "r0c0"));

		const ids = await contextMenuCommandIds(canvas);
		expect(ids.slice(0, GRID_COMMAND_IDS.length)).toEqual(GRID_COMMAND_IDS);
		// The built-in block follows, whole and in its own order.
		expect(ids.indexOf("cut")).toBeGreaterThan(
			ids.indexOf("table.deleteColumn"),
		);
	});

	test("draws them disabled while the table is picked but no cell or track is", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");

		await canvas.openContextMenu(await cellCenter(canvas, id, "r0c0"));

		// Present and visibly off, not present-and-silent: nothing names a row or a
		// column to act on, and a right-click does not pick one.
		for (const commandId of GRID_COMMAND_IDS) {
			await expect(contextMenuRow(canvas, commandId)).toBeVisible();
			await expect(contextMenuRow(canvas, commandId)).toBeDisabled();
		}
	});

	test("turns them on once a cell is picked", async ({ canvas }) => {
		const id = await canvas.placeShape("Table");
		await canvas.selectAt(await cellCenter(canvas, id, "r0c1"));
		await canvas.clickAt(await cellCenter(canvas, id, "r0c0"));

		await canvas.openContextMenu(await cellCenter(canvas, id, "r0c0"));

		for (const commandId of GRID_COMMAND_IDS) {
			await expect(contextMenuRow(canvas, commandId)).toBeEnabled();
		}
	});

	test("inserts the row the chosen item names", async ({ canvas }) => {
		const id = await canvas.placeShape("Table");
		await canvas.selectAt(await cellCenter(canvas, id, "r0c1"));
		await canvas.clickAt(await cellCenter(canvas, id, "r0c0"));

		await canvas.openContextMenu(await cellCenter(canvas, id, "r0c0"));
		await canvas.clickContextMenuCommand("table.insertRowBelow");

		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
	});

	test("removes the row a grip selected, the menu naming what the Delete key infers", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "rowGrip", 1);

		await canvas.openContextMenu(await cellCenter(canvas, id, "r0c0"));
		await canvas.clickContextMenuCommand("table.deleteRow");

		await expect.poll(async () => cellCount(canvas, id)).toBe(2);
	});

	test("offers only the removal the selection can bear", async ({ canvas }) => {
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "rowGrip", 0);

		await canvas.openContextMenu(await cellCenter(canvas, id, "r0c0"));

		// A row selection names a row and no column, so the column removal — and
		// the column insertions with it — stay off.
		await expect(contextMenuRow(canvas, "table.deleteRow")).toBeEnabled();
		await expect(contextMenuRow(canvas, "table.deleteColumn")).toBeDisabled();
		await expect(
			contextMenuRow(canvas, "table.insertColumnLeft"),
		).toBeDisabled();
	});

	test("adds nothing to the menu opened away from the table", async ({
		canvas,
	}) => {
		await canvas.placeShape("Table");

		// Empty canvas, the spot the driver deselects at: the press names no
		// object, so the built-in block stands on its own.
		await canvas.openContextMenu({ x: 70, y: 820 });

		const ids = await contextMenuCommandIds(canvas);
		expect(ids.filter((id) => id.startsWith("table."))).toEqual([]);
		expect(ids[0]).toBe("cut");
	});
});

import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCenter,
	cellCount,
	clickTrackGrip,
	fillCell,
	isTextDrawnInCell,
} from "../support/tableDom";

/**
 * Inserting a row or a column from the properties sidebar's Insert section, in a
 * real browser. What only a browser answers is that a plugin's row survives the
 * narrowing a picked part applies to the sidebar (`pickedPartKinds`), that it
 * offers the insertions the picked kind names — a row's two, a column's two, a
 * cell's four — and that a press reaches the command it is labelled with.
 */

/** The table's Insert section, as its declaration names it. */
const INSERT_SECTION_ID = "table-insert";

const ROW_COMMAND_IDS = ["table.insertRowAbove", "table.insertRowBelow"];
const COLUMN_COMMAND_IDS = [
	"table.insertColumnLeft",
	"table.insertColumnRight",
];

/** The ids of the table insertions the sidebar offers, in the order it draws them. */
async function offeredInsertCommandIds(
	canvas: CanvasDriver,
): Promise<string[]> {
	return canvas.page
		.locator(`${selectors.propertyPanel} [data-action^="command:table.insert"]`)
		.evaluateAll((buttons) =>
			buttons.map((button) =>
				(button.getAttribute("data-action") ?? "").replace(/^command:/, ""),
			),
		);
}

async function clickPanelCommand(
	canvas: CanvasDriver,
	commandId: string,
): Promise<void> {
	await canvas.page.click(selectors.propertyPanelCommand(commandId));
}

test.describe("table insert from the properties sidebar", () => {
	test("offers nothing with the table selected as a whole", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		await canvas.placeShape("Table");

		await expect(
			canvas.page.locator(selectors.propertyPanelSection(INSERT_SECTION_ID)),
			"no heading is left standing over an empty section",
		).toHaveCount(0);
		expect(await offeredInsertCommandIds(canvas)).toEqual([]);
	});

	test("offers a picked row's two insertions, and inserts below it", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "rowGrip", 0);

		await expect
			.poll(() => offeredInsertCommandIds(canvas))
			.toEqual(ROW_COMMAND_IDS);
		await expect(
			canvas.page.locator(
				selectors.propertyPanelCommand("table.insertRowBelow"),
			),
			"the button is named by the command's own label",
		).toHaveText("Insert Row Below");

		await clickPanelCommand(canvas, "table.insertRowBelow");
		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
	});

	test("offers a picked column's two insertions, and inserts left of it", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "columnGrip", 1);

		await expect
			.poll(() => offeredInsertCommandIds(canvas))
			.toEqual(COLUMN_COMMAND_IDS);

		await clickPanelCommand(canvas, "table.insertColumnLeft");
		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
	});

	test("offers a picked cell all four, each of which inserts", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		const id = await canvas.placeShape("Table");
		await canvas.clickAt(await cellCenter(canvas, id, "r0c0"));

		await expect
			.poll(() => offeredInsertCommandIds(canvas))
			.toEqual([...ROW_COMMAND_IDS, ...COLUMN_COMMAND_IDS]);

		// The cell stays picked across each insertion (moved with the grid), so the
		// section stays up for the next press.
		await clickPanelCommand(canvas, "table.insertRowAbove");
		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
		await clickPanelCommand(canvas, "table.insertRowBelow");
		await expect.poll(async () => cellCount(canvas, id)).toBe(8);
		await clickPanelCommand(canvas, "table.insertColumnLeft");
		await expect.poll(async () => cellCount(canvas, id)).toBe(12);
		await clickPanelCommand(canvas, "table.insertColumnRight");
		await expect.poll(async () => cellCount(canvas, id)).toBe(16);
	});

	test("inserts outside a Shift-picked run of rows, above its first and below its last", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "rowGrip", 0);
		await clickPanelCommand(canvas, "table.insertRowBelow");
		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
		for (const [cellId, text] of [
			["r0c0", "row one"],
			["r1c0", "row two"],
			["r2c0", "row three"],
		] as const) {
			await fillCell(canvas, id, cellId, text);
		}
		await canvas.selectAt(await cellCenter(canvas, id, "r0c1"));

		await clickTrackGrip(canvas, "rowGrip", 1);
		await clickTrackGrip(canvas, "rowGrip", 2, "shift");
		await expect
			.poll(() => offeredInsertCommandIds(canvas))
			.toEqual(ROW_COMMAND_IDS);

		await clickPanelCommand(canvas, "table.insertRowAbove");
		await expect.poll(async () => cellCount(canvas, id)).toBe(8);
		await expect
			.poll(() => isTextDrawnInCell(canvas, id, "row two", "r2c0"))
			.toBe(true);
		expect(await isTextDrawnInCell(canvas, id, "row one", "r0c0")).toBe(true);

		// The run moved down with the grid, so "below" still means below its last row.
		await clickPanelCommand(canvas, "table.insertRowBelow");
		await expect.poll(async () => cellCount(canvas, id)).toBe(10);
		expect(await isTextDrawnInCell(canvas, id, "row three", "r3c0")).toBe(true);
		expect(await isTextDrawnInCell(canvas, id, "row two", "r2c0")).toBe(true);
	});

	test("inserts outside the span of Ctrl-picked columns that are not adjacent", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "columnGrip", 0);
		await clickPanelCommand(canvas, "table.insertColumnRight");
		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
		for (const [cellId, text] of [
			["r0c0", "col one"],
			["r0c1", "col two"],
			["r0c2", "col three"],
		] as const) {
			await fillCell(canvas, id, cellId, text);
		}
		await canvas.selectAt(await cellCenter(canvas, id, "r1c1"));

		await clickTrackGrip(canvas, "columnGrip", 0);
		await clickTrackGrip(canvas, "columnGrip", 2, "ctrl");
		await expect
			.poll(() => offeredInsertCommandIds(canvas))
			.toEqual(COLUMN_COMMAND_IDS);

		await clickPanelCommand(canvas, "table.insertColumnLeft");
		await expect.poll(async () => cellCount(canvas, id)).toBe(8);
		await expect
			.poll(() => isTextDrawnInCell(canvas, id, "col one", "r0c1"))
			.toBe(true);

		await clickPanelCommand(canvas, "table.insertColumnRight");
		await expect.poll(async () => cellCount(canvas, id)).toBe(10);
		expect(await isTextDrawnInCell(canvas, id, "col three", "r0c3")).toBe(true);
		expect(await isTextDrawnInCell(canvas, id, "col two", "r0c2")).toBe(true);
	});
});

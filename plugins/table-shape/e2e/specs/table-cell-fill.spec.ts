import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCenter,
	cellFillColor,
	clickTrackGrip,
	tableBodyFillColor,
} from "../support/tableDom";

/**
 * Filling a table from the one Fill control, in a real browser. The control is
 * core's own (the menu's background color, the sidebar's fill row); what is the
 * table's is where its write lands (tableFillEntry): the picked cells, the cells
 * of a picked row or column, or the table's own background with nothing picked
 * inside it. Each test states a color and reads the paint back off the drawn
 * cells, which is what only a browser can say.
 */

/** Two swatches of the shared grid, to agree and disagree with. */
const RED = "#dc2626";
const BLUE = "#3b82f6";

/** What a cell painting nothing of its own reports, as the browser computes a transparent fill. */
const UNPAINTED = "rgba(0, 0, 0, 0)";

/** Every cell of the 2x2 table the rail places. */
const CELL_IDS = ["r0c0", "r0c1", "r1c0", "r1c1"];

/** The menu section of the background color (BackgroundColorMenu). */
const BG_COLOR_SECTION = "bg-color";

/** The sidebar's fill row trigger, named by the wording core ships for it. */
const SIDEBAR_FILL_TRIGGER = `${selectors.propertyPanel} [aria-label="Background Color"]`;

async function clickCell(
	canvas: CanvasDriver,
	objectId: string,
	cellId: string,
): Promise<void> {
	await canvas.clickAt(await cellCenter(canvas, objectId, cellId));
}

async function shiftClickCell(
	canvas: CanvasDriver,
	objectId: string,
	cellId: string,
): Promise<void> {
	await canvas.shiftClickAt(await cellCenter(canvas, objectId, cellId));
}

/**
 * Picks one swatch of the menu's background grid, opening it unless it is
 * already up — a pick leaves it open, where a click on the table closes it.
 */
async function pickMenuFill(
	canvas: CanvasDriver,
	cssColor: string,
): Promise<void> {
	const swatch = canvas.page.locator(selectors.objectMenuSet("fill", cssColor));
	if ((await swatch.count()) === 0) {
		await canvas.openObjectMenu(BG_COLOR_SECTION);
	}
	await swatch.click();
}

/**
 * How many slices the menu button's swatch is drawn in: one color is a circle
 * alone, colors that disagree are sectors of it (ColorPreviewIcon).
 */
async function menuSwatchSliceCount(canvas: CanvasDriver): Promise<number> {
	return canvas.page
		.locator(`${selectors.objectMenuToggle(BG_COLOR_SECTION)} svg path`)
		.count();
}

/** Picks one swatch of the sidebar's fill row, opening its palette unless it is up. */
async function pickSidebarFill(
	canvas: CanvasDriver,
	cssColor: string,
): Promise<void> {
	const swatch = canvas.page.locator(
		selectors.propertyPanelSet("fill", cssColor),
	);
	if ((await swatch.count()) === 0) {
		await canvas.page.click(SIDEBAR_FILL_TRIGGER);
	}
	await swatch.click();
}

/** Every cell's paint, in {@link CELL_IDS} order. */
async function cellFills(
	canvas: CanvasDriver,
	objectId: string,
): Promise<string[]> {
	const fills: string[] = [];
	for (const cellId of CELL_IDS) {
		fills.push(await cellFillColor(canvas, objectId, cellId));
	}
	return fills;
}

test.describe("table cell fill from the menu", () => {
	test("paints the one cell a click picked and leaves the rest unpainted", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");
		await pickMenuFill(canvas, RED);

		const red = await canvas.normalizeColor(RED);
		await expect
			.poll(() => cellFills(canvas, id))
			.toEqual([red, UNPAINTED, UNPAINTED, UNPAINTED]);
	});

	test("paints every cell of a picked range", async ({ canvas }) => {
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");
		await shiftClickCell(canvas, id, "r0c1");
		await pickMenuFill(canvas, RED);

		const red = await canvas.normalizeColor(RED);
		await expect
			.poll(() => cellFills(canvas, id))
			.toEqual([red, red, UNPAINTED, UNPAINTED]);
	});

	test("paints the cells of a row picked by its grip, and no others", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "rowGrip", 1);
		await pickMenuFill(canvas, RED);

		const red = await canvas.normalizeColor(RED);
		await expect
			.poll(() => cellFills(canvas, id))
			.toEqual([UNPAINTED, UNPAINTED, red, red]);
	});

	test("paints the cells of a column picked by its grip, and no others", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "columnGrip", 0);
		await pickMenuFill(canvas, RED);

		const red = await canvas.normalizeColor(RED);
		await expect
			.poll(() => cellFills(canvas, id))
			.toEqual([red, UNPAINTED, red, UNPAINTED]);
	});

	test("paints the table's own background when the table alone is selected", async ({
		canvas,
	}) => {
		// Placed and left selected, with nothing picked inside it.
		const id = await canvas.placeShape("Table");
		await pickMenuFill(canvas, BLUE);

		await expect
			.poll(() => tableBodyFillColor(canvas, id))
			.toBe(await canvas.normalizeColor(BLUE));
		expect(await cellFills(canvas, id)).toEqual(CELL_IDS.map(() => UNPAINTED));
	});

	test("draws the swatch as mixed while the picked cells disagree", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "columnGrip", 0);
		await pickMenuFill(canvas, RED);
		await expect
			.poll(() => cellFillColor(canvas, id, "r0c0"))
			.toBe(await canvas.normalizeColor(RED));

		// The first row now holds a painted cell and an unpainted one.
		await clickTrackGrip(canvas, "rowGrip", 0);
		await expect
			.poll(() => menuSwatchSliceCount(canvas), {
				message: "the swatch is split between what the row's cells say",
			})
			.toBeGreaterThan(1);

		// Brought onto one color, the row states that one again.
		await pickMenuFill(canvas, BLUE);
		await expect.poll(() => menuSwatchSliceCount(canvas)).toBe(0);
	});

	test("clears painted cells with the transparent swatch, the background showing again", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const bodyBefore = await tableBodyFillColor(canvas, id);
		await clickTrackGrip(canvas, "rowGrip", 1);
		await pickMenuFill(canvas, RED);
		await expect
			.poll(() => cellFillColor(canvas, id, "r1c1"))
			.toBe(await canvas.normalizeColor(RED));

		await pickMenuFill(canvas, "transparent");
		await expect
			.poll(() => cellFills(canvas, id))
			.toEqual(CELL_IDS.map(() => UNPAINTED));
		expect(
			await tableBodyFillColor(canvas, id),
			"the table's own background is what shows through, untouched",
		).toBe(bodyBefore);
	});
});

test.describe("table cell fill from the properties sidebar", () => {
	test("keeps the fill row with a cell picked, and paints only that cell", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");
		await expect(canvas.page.locator(SIDEBAR_FILL_TRIGGER)).toBeVisible();

		await pickSidebarFill(canvas, RED);

		const red = await canvas.normalizeColor(RED);
		await expect
			.poll(() => cellFills(canvas, id))
			.toEqual([red, UNPAINTED, UNPAINTED, UNPAINTED]);
	});

	test("paints a picked row's cells and states them mixed while they disagree", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "columnGrip", 1);
		await pickSidebarFill(canvas, RED);

		const red = await canvas.normalizeColor(RED);
		await expect
			.poll(() => cellFills(canvas, id))
			.toEqual([UNPAINTED, red, UNPAINTED, red]);

		await clickTrackGrip(canvas, "rowGrip", 0);
		const trigger = canvas.page.locator(SIDEBAR_FILL_TRIGGER);
		await expect(
			trigger,
			"the row states the disagreement rather than one of the two colors",
		).toContainText("Mixed");

		await pickSidebarFill(canvas, BLUE);
		const blue = await canvas.normalizeColor(BLUE);
		await expect
			.poll(() => cellFills(canvas, id))
			.toEqual([blue, blue, UNPAINTED, red]);
		await expect(trigger).not.toContainText("Mixed");
	});

	test("paints the table's own background when the table alone is selected", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		const id = await canvas.placeShape("Table");
		await pickSidebarFill(canvas, BLUE);

		await expect
			.poll(() => tableBodyFillColor(canvas, id))
			.toBe(await canvas.normalizeColor(BLUE));
		expect(await cellFills(canvas, id)).toEqual(CELL_IDS.map(() => UNPAINTED));
	});
});

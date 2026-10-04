import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import { cellCenter, cellFillColor, clickTrackGrip } from "../support/tableDom";

/**
 * Setting a cell's background from the ObjectMenu, in a real browser. Four
 * things only a browser can say: that the item is on the menu at all while a
 * cell is picked (it is a custom item, which the slot narrowing drops unless it
 * declares itself slot-aware), that the paint lands on the picked cells and
 * nowhere else, that a row or column picked by its grip is the cells of that
 * track and not the whole grid (tableTrackParts declares which cells it covers),
 * and that a pick whose cells disagree draws itself as such rather than as one
 * of their colors.
 */

/** The section the cell-background button opens (TableCellColorMenu). */
const SECTION_ID = "table-cell-color";

/** A swatch of the shared grid, and a second one to disagree with it. */
const RED = "#dc2626";
const BLUE = "#3b82f6";

/** What an unfilled cell paints, as the browser reports a transparent fill. */
const UNPAINTED = "rgba(0, 0, 0, 0)";

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
 * Opens the cell-background section unless its panel is already up — picking a
 * swatch leaves it open, where clicking a cell closes it with the rest of the
 * menu's open state, so a second press cannot assume either.
 */
async function openCellColorSection(canvas: CanvasDriver): Promise<void> {
	const panelSwatch = canvas.page.locator(
		selectors.objectMenuSet("cellFill", RED),
	);
	if ((await panelSwatch.count()) === 0) {
		await canvas.openObjectMenu(SECTION_ID);
	}
	await expect(panelSwatch).toBeVisible();
}

/** Picks one swatch of the shared grid. */
async function pickCellColor(
	canvas: CanvasDriver,
	cssColor: string,
): Promise<void> {
	await openCellColorSection(canvas);
	await canvas.page.click(selectors.objectMenuSet("cellFill", cssColor));
}

/** Presses the button that takes the background away. */
async function clearCellColor(canvas: CanvasDriver): Promise<void> {
	await openCellColorSection(canvas);
	await canvas.page.click(selectors.objectMenuSet("cellFill", ""));
}

/**
 * How many slices the button's swatch is drawn in. One color is a circle and
 * nothing else; colors that disagree are drawn as sectors of it
 * (ColorPreviewIcon), so a count above zero is what "mixed" looks like.
 */
async function swatchSliceCount(canvas: CanvasDriver): Promise<number> {
	return canvas.page
		.locator(`${selectors.objectMenuToggle(SECTION_ID)} svg path`)
		.count();
}

test.describe("table cell fill", () => {
	test("paints the one cell a click picked and leaves the rest unpainted", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");
		await pickCellColor(canvas, RED);

		const red = await canvas.normalizeColor(RED);
		await expect
			.poll(() => cellFillColor(canvas, id, "r0c0"), {
				message: "the picked cell takes the color",
			})
			.toBe(red);
		expect(await cellFillColor(canvas, id, "r0c1")).toBe(UNPAINTED);
		expect(await cellFillColor(canvas, id, "r1c0")).toBe(UNPAINTED);
	});

	test("paints every cell of a picked range", async ({ canvas }) => {
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");
		await shiftClickCell(canvas, id, "r0c1");
		await pickCellColor(canvas, RED);

		const red = await canvas.normalizeColor(RED);
		await expect
			.poll(() => cellFillColor(canvas, id, "r0c1"), {
				message: "the far end of the range takes the color",
			})
			.toBe(red);
		expect(await cellFillColor(canvas, id, "r0c0")).toBe(red);
		// The range ran along the first row only, so the second is untouched.
		expect(await cellFillColor(canvas, id, "r1c0")).toBe(UNPAINTED);
		expect(await cellFillColor(canvas, id, "r1c1")).toBe(UNPAINTED);
	});

	test("paints every cell when the table alone is selected", async ({
		canvas,
	}) => {
		// Placed and left selected, with no cell picked — which is when the write
		// falls back to the whole grid.
		const id = await canvas.placeShape("Table");
		await pickCellColor(canvas, BLUE);

		const blue = await canvas.normalizeColor(BLUE);
		await expect
			.poll(() => cellFillColor(canvas, id, "r1c1"), {
				message: "the last cell takes the color",
			})
			.toBe(blue);
		for (const cellId of ["r0c0", "r0c1", "r1c0"]) {
			expect(await cellFillColor(canvas, id, cellId)).toBe(blue);
		}
	});

	test("draws the swatch as mixed when the picked cells disagree", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");
		await pickCellColor(canvas, RED);
		await expect
			.poll(() => cellFillColor(canvas, id, "r0c0"), {
				message: "the first cell is painted before the range is widened",
			})
			.toBe(await canvas.normalizeColor(RED));

		// One painted cell and one unpainted: a single value would be a lie either way.
		await shiftClickCell(canvas, id, "r0c1");
		await expect
			.poll(() => swatchSliceCount(canvas), {
				message: "the swatch is split between what the cells say",
			})
			.toBeGreaterThan(1);

		// Brought onto one color, it states that one again.
		await pickCellColor(canvas, BLUE);
		await expect
			.poll(() => swatchSliceCount(canvas), {
				message: "cells that agree are one circle again",
			})
			.toBe(0);
	});

	test("paints the cells of a row picked by its grip, and no others", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "rowGrip", 1);
		await pickCellColor(canvas, RED);

		const red = await canvas.normalizeColor(RED);
		await expect
			.poll(() => cellFillColor(canvas, id, "r1c0"), {
				message: "the picked row takes the color",
			})
			.toBe(red);
		expect(await cellFillColor(canvas, id, "r1c1")).toBe(red);
		expect(await cellFillColor(canvas, id, "r0c0")).toBe(UNPAINTED);
		expect(await cellFillColor(canvas, id, "r0c1")).toBe(UNPAINTED);
	});

	test("paints the cells of a column picked by its grip, and no others", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "columnGrip", 0);
		await pickCellColor(canvas, RED);

		const red = await canvas.normalizeColor(RED);
		await expect
			.poll(() => cellFillColor(canvas, id, "r0c0"), {
				message: "the picked column takes the color",
			})
			.toBe(red);
		expect(await cellFillColor(canvas, id, "r1c0")).toBe(red);
		expect(await cellFillColor(canvas, id, "r0c1")).toBe(UNPAINTED);
		expect(await cellFillColor(canvas, id, "r1c1")).toBe(UNPAINTED);
	});

	test("draws the swatch off the picked row rather than off the table", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");
		await pickCellColor(canvas, RED);
		await expect
			.poll(() => cellFillColor(canvas, id, "r0c0"), {
				message: "one cell of the first row is painted before a row is picked",
			})
			.toBe(await canvas.normalizeColor(RED));

		// The first row holds the painted cell and an unpainted one.
		await clickTrackGrip(canvas, "rowGrip", 0);
		await expect
			.poll(() => swatchSliceCount(canvas), {
				message: "the swatch is split between what that row's cells say",
			})
			.toBeGreaterThan(1);

		// The second row agrees with itself, where the table as a whole does not —
		// so a swatch drawn off the table would still be split here.
		await clickTrackGrip(canvas, "rowGrip", 1);
		await expect
			.poll(() => swatchSliceCount(canvas), {
				message: "a row whose cells agree is one circle",
			})
			.toBe(0);
	});

	test("takes the background off the picked cells again", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickCell(canvas, id, "r0c0");
		await shiftClickCell(canvas, id, "r0c1");
		await pickCellColor(canvas, RED);
		await expect
			.poll(() => cellFillColor(canvas, id, "r0c1"), {
				message: "the range is painted before it is cleared",
			})
			.toBe(await canvas.normalizeColor(RED));

		await clearCellColor(canvas);
		await expect
			.poll(() => cellFillColor(canvas, id, "r0c0"), {
				message: "clearing leaves the cell unpainted",
			})
			.toBe(UNPAINTED);
		expect(await cellFillColor(canvas, id, "r0c1")).toBe(UNPAINTED);

		// With nothing left to clear the button opts out of the gesture, which is
		// how it says the cells carry no fill at all rather than one that paints
		// nothing — the stored field is gone (see tableCellFill.test.ts).
		await openCellColorSection(canvas);
		await expect(
			canvas.page.locator(selectors.objectMenuSet("cellFill", "")),
		).toHaveAttribute("data-gesture", "none");
	});
});

import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import { cellCenter, cellFillColor } from "../support/tableDom";

/**
 * Setting a cell's background from the properties sidebar (TableCellColorRow),
 * which is where a user looks for it when the floating menu is not in view.
 *
 * The sidebar is a different component with its own parts, so the same write
 * takes a different route than from the floating menu: the row is drawn only if
 * the type's declared panel carries it and the slot narrowing keeps it, the
 * palette is portalled into the sidebar, and the press travels control ->
 * PropertyPanelHandler -> property update. Only a browser runs that end to end,
 * so each test states a value and reads the paint back off the drawn cells.
 */

/** A swatch of the shared grid, and a second one to disagree with it. */
const RED = "#dc2626";
const BLUE = "#3b82f6";

/** What an unfilled cell paints, as the browser reports a transparent fill. */
const UNPAINTED = "rgba(0, 0, 0, 0)";

/** The row's trigger, named by the wording the table ships for the cell background. */
const CELL_COLOR_TRIGGER = `${selectors.propertyPanel} [aria-label="Cell Color"]`;

/** Opens the sidebar and places a table under it, left selected with no cell picked. */
async function placeTableWithPanel(canvas: CanvasDriver): Promise<string> {
	await canvas.openPropertyPanel();
	return canvas.placeShape("Table");
}

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
 * Opens the row's palette unless it is already up — picking a swatch leaves it
 * open, where clicking a cell closes it as a press outside the field, so a
 * second press cannot assume either.
 */
async function openCellColorField(canvas: CanvasDriver): Promise<void> {
	const swatch = canvas.page.locator(
		selectors.propertyPanelSet("cellFill", RED),
	);
	if ((await swatch.count()) === 0) {
		await canvas.page.click(CELL_COLOR_TRIGGER);
	}
	await expect(swatch).toBeVisible();
}

/** Picks one swatch of the palette the row opens. */
async function pickCellColor(
	canvas: CanvasDriver,
	cssColor: string,
): Promise<void> {
	await openCellColorField(canvas);
	await canvas.page.click(selectors.propertyPanelSet("cellFill", cssColor));
}

/** Presses the button under the palette that takes the background away. */
async function clearCellColor(canvas: CanvasDriver): Promise<void> {
	await openCellColorField(canvas);
	await canvas.page.click(selectors.propertyPanelSet("cellFill", ""));
}

test.describe("table cell fill from the properties sidebar", () => {
	test("paints every cell when the table alone is selected", async ({
		canvas,
	}) => {
		const id = await placeTableWithPanel(canvas);
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

	test("stays in the sidebar once a cell is picked, and paints only that cell", async ({
		canvas,
	}) => {
		const id = await placeTableWithPanel(canvas);
		await clickCell(canvas, id, "r0c0");

		// The slot narrowing takes the Layout section with it and would take this
		// row too, were it not declared slot-aware.
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("layout")),
			"the sections a picked cell cannot receive are gone",
		).toHaveCount(0);
		await expect(canvas.page.locator(CELL_COLOR_TRIGGER)).toBeVisible();

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

	test("states the range as mixed while its cells disagree", async ({
		canvas,
	}) => {
		const id = await placeTableWithPanel(canvas);
		await clickCell(canvas, id, "r0c0");
		await pickCellColor(canvas, RED);
		await expect
			.poll(() => cellFillColor(canvas, id, "r0c0"), {
				message: "the first cell is painted before the range is widened",
			})
			.toBe(await canvas.normalizeColor(RED));

		// One painted cell and one unpainted: a single value would be a lie either way.
		await shiftClickCell(canvas, id, "r0c1");
		await expect(
			canvas.page.locator(CELL_COLOR_TRIGGER),
			"the trigger says the cells disagree rather than naming one of them",
		).toHaveText("Mixed");

		// Brought onto one color, it states that one again.
		await pickCellColor(canvas, BLUE);
		await expect(canvas.page.locator(CELL_COLOR_TRIGGER)).toHaveText(BLUE);
	});

	test("takes the background off the picked cells again", async ({
		canvas,
	}) => {
		const id = await placeTableWithPanel(canvas);
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

		// The trigger words the absence rather than showing the color the checker
		// stands for, and the button opts out of the gesture with nothing left to
		// clear (see the ObjectMenu's own spec).
		await expect(canvas.page.locator(CELL_COLOR_TRIGGER)).toHaveText("No fill");
		await expect(
			canvas.page.locator(selectors.propertyPanelSet("cellFill", "")),
		).toHaveAttribute("data-gesture", "none");
	});
});

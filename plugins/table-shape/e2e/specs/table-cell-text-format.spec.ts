import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCenter,
	drawnTextDecoration,
	fillCell,
	selectedCellIds,
} from "../support/tableDom";

/**
 * Text formatting over picked cells, in a real browser. The toggles are core's
 * own (the sidebar's Style row and the shortcuts); what is the table's is that
 * its cells are the slots they write to, so a press over a range reads and
 * writes each cell on its own.
 */

/** The sidebar's Underline toggle, named by the wording core ships for it. */
const SIDEBAR_UNDERLINE = `${selectors.propertyPanel} [aria-label="Underline"]`;

/**
 * Picks one cell of the table, picking the table up by a different cell first:
 * two clicks on the same spot are a double click, which opens the editor.
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

test.describe("table cell text format from the properties sidebar", () => {
	test("Underline reads lit over cells all underlined, and a press keeps each one's strikethrough", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await fillCell(canvas, id, "r0c0", "under");
		await fillCell(canvas, id, "r0c1", "both");

		await pickCell(canvas, id, "r0c0", "r1c0");
		await canvas.page.keyboard.press("ControlOrMeta+u");
		await expect
			.poll(() => drawnTextDecoration(canvas, "under"))
			.toBe("underline");

		await canvas.clickAt(await cellCenter(canvas, id, "r0c1"));
		await canvas.page.keyboard.press("ControlOrMeta+u");
		await canvas.page.keyboard.press("ControlOrMeta+Shift+x");
		await expect
			.poll(() => drawnTextDecoration(canvas, "both"))
			.toBe("underline line-through");

		await canvas.shiftClickAt(await cellCenter(canvas, id, "r0c0"));
		expect(await selectedCellIds(canvas, id)).toEqual(["r0c0", "r0c1"]);
		await canvas.openPropertyPanel();
		const underline = canvas.page.locator(SIDEBAR_UNDERLINE);
		await expect(underline).toHaveAttribute("aria-pressed", "true");

		await underline.click();
		await expect.poll(() => drawnTextDecoration(canvas, "under")).toBe("none");
		expect(await drawnTextDecoration(canvas, "both")).toBe("line-through");
		await expect(underline).toHaveAttribute("aria-pressed", "false");
	});
});

import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCenter,
	selectedCellIds,
	tableOutlineRect,
} from "../support/tableDom";

/**
 * Stepping the cell pick with the bare arrows, in a real browser. Where the step
 * lands is pinned by selectAdjacentTableCell.test; what a browser answers is
 * that the keystroke reaches the table's command at all — the built-in nudge
 * claims the same bare arrows, and only the precedence a contributed command
 * gets in the key dispatch keeps the table from moving instead.
 */

test.describe("table cell arrow navigation", () => {
	test("moves the picked cell with the arrows, leaving the table where it is", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await canvas.clickAt(await cellCenter(canvas, id, "r0c0"));
		const before = await tableOutlineRect(canvas, id);

		await canvas.page.keyboard.press("ArrowRight");
		await expect
			.poll(async () => selectedCellIds(canvas, id))
			.toEqual(["r0c1"]);
		await canvas.page.keyboard.press("ArrowDown");
		await expect
			.poll(async () => selectedCellIds(canvas, id))
			.toEqual(["r1c1"]);
		await canvas.page.keyboard.press("ArrowLeft");
		await expect
			.poll(async () => selectedCellIds(canvas, id))
			.toEqual(["r1c0"]);
		await canvas.page.keyboard.press("ArrowUp");
		await expect
			.poll(async () => selectedCellIds(canvas, id))
			.toEqual(["r0c0"]);

		expect(await tableOutlineRect(canvas, id)).toEqual(before);
	});

	test("does nothing at the grid's edge rather than nudging the table", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await canvas.clickAt(await cellCenter(canvas, id, "r0c0"));
		const before = await tableOutlineRect(canvas, id);

		await canvas.page.keyboard.press("ArrowUp");
		await canvas.page.keyboard.press("ArrowLeft");

		// Shortcuts run synchronously on keydown; a step to r0c1 afterwards proves
		// both earlier keys were handled before it is read.
		await canvas.page.keyboard.press("ArrowRight");
		await expect
			.poll(async () => selectedCellIds(canvas, id))
			.toEqual(["r0c1"]);
		expect(await tableOutlineRect(canvas, id)).toEqual(before);
	});

	test("still nudges a table selected as a whole", async ({ canvas }) => {
		// Placed and left selected as a whole, with no cell picked.
		const id = await canvas.placeShape("Table");
		const before = await tableOutlineRect(canvas, id);

		await canvas.page.keyboard.press("ArrowRight");

		await expect
			.poll(async () => (await tableOutlineRect(canvas, id)).x)
			.toBeGreaterThan(before.x);
	});
});

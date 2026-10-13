import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellRect,
	drawnTextCenter,
	selectedCellIds,
} from "../support/tableDom";

/**
 * Tab while a cell is being edited. Tab walks a table's cells while one is
 * picked (SelectNextTextSlotCommand), and the open editor is bound to the
 * picked cell (textEditState), so a step taken during the edit would carry the
 * draft to the next cell. The editor keeps Tab to itself instead, and the walk
 * refuses to move under an open session even when the keystroke reaches the
 * canvas from elsewhere.
 */
test.describe("table cell editing: Tab", () => {
	test("keeps the editor on the cell being edited with its focus", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const cell = await cellRect(canvas, id, "r0c0");
		await canvas.page.mouse.dblclick(
			cell.x + cell.width / 2,
			cell.y + cell.height / 2,
		);
		await canvas.waitForTextEditor();
		await canvas.page.keyboard.type("abc");

		// Twice: the first Tab used to move the focus to a menu button, and the
		// second, from there, moved the selection to the next cell.
		await canvas.page.keyboard.press("Tab");
		await canvas.page.keyboard.press("Tab");
		await canvas.page.keyboard.press("Shift+Tab");

		await expect(canvas.textEditorSurface()).toBeFocused();
		expect(await selectedCellIds(canvas, id)).toEqual(["r0c0"]);
		await canvas.page.keyboard.type("d");
		expect(await canvas.textEditorText()).toBe("abcd");

		// Committed into the cell the edit started on: drawn inside its box.
		await canvas.commitText();
		const drawn = await drawnTextCenter(canvas, "abcd");
		expect(drawn.x).toBeGreaterThan(cell.x);
		expect(drawn.x).toBeLessThan(cell.x + cell.width);
		expect(drawn.y).toBeGreaterThan(cell.y);
		expect(drawn.y).toBeLessThan(cell.y + cell.height);
	});
});

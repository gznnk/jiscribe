import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellRect,
	drawnTextCenter,
	selectedCellIds,
} from "../support/tableDom";

/** Whether `text` is drawn, matched exactly, with its middle inside the cell's box. */
async function isDrawnInsideCell(
	canvas: CanvasDriver,
	objectId: string,
	text: string,
	cellId: string,
): Promise<boolean> {
	const cell = await cellRect(canvas, objectId, cellId);
	const drawn = await drawnTextCenter(canvas, text);
	return (
		drawn.x > cell.x &&
		drawn.x < cell.x + cell.width &&
		drawn.y > cell.y &&
		drawn.y < cell.y + cell.height
	);
}

/**
 * Tab while a cell is being edited: the draft is committed into the cell the
 * edit started on, and the editor opens on the next cell (Shift+Tab: the
 * previous one) with the focus in it, so typing carries on there. The draft is
 * bound to the picked cell (textEditState), so the order is what keeps it from
 * being carried along: commit, then step, then open.
 */
test.describe("table cell editing: Tab", () => {
	test("commits the cell and carries on editing the next one, and Shift+Tab comes back", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const firstCell = await cellRect(canvas, id, "r0c0");
		await canvas.page.mouse.dblclick(
			firstCell.x + firstCell.width / 2,
			firstCell.y + firstCell.height / 2,
		);
		await canvas.waitForTextEditor();
		await canvas.page.keyboard.type("abc");

		await canvas.page.keyboard.press("Tab");

		await expect(canvas.textEditorSurface()).toBeFocused();
		expect(await selectedCellIds(canvas, id)).toEqual(["r0c1"]);
		expect(await canvas.textEditorText()).toBe("");
		// Committed and drawn while the next cell's editor is open.
		expect(await isDrawnInsideCell(canvas, id, "abc", "r0c0")).toBe(true);
		await canvas.page.keyboard.type("def");
		expect(await canvas.textEditorText()).toBe("def");

		await canvas.page.keyboard.press("Shift+Tab");

		await expect(canvas.textEditorSurface()).toBeFocused();
		expect(await selectedCellIds(canvas, id)).toEqual(["r0c0"]);
		// Reopened as Enter or a double-click opens it: the cell's text kept, the
		// caret at its end.
		expect(await canvas.textEditorText()).toBe("abc");
		await canvas.page.keyboard.type("!");
		expect(await canvas.textEditorText()).toBe("abc!");

		await canvas.commitText();
		expect(await isDrawnInsideCell(canvas, id, "abc!", "r0c0")).toBe(true);
		expect(await isDrawnInsideCell(canvas, id, "def", "r0c1")).toBe(true);
	});
});

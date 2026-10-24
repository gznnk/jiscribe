import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCenter,
	cellCount,
	cellRect,
	clickTrackGrip,
	drawnTextCenter,
	selectedCellIds,
	tableOutlineRect,
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

/** Whether `text` is drawn anywhere, matched exactly. */
async function isDrawn(canvas: CanvasDriver, text: string): Promise<boolean> {
	return drawnTextCenter(canvas, text).then(
		() => true,
		() => false,
	);
}

/** Places the default 2x2 table and opens the editor on its last cell. */
async function placeTableEditingLastCell(
	canvas: CanvasDriver,
): Promise<string> {
	const id = await canvas.placeShape("Table");
	const lastCell = await cellRect(canvas, id, "r1c1");
	await canvas.page.mouse.dblclick(
		lastCell.x + lastCell.width / 2,
		lastCell.y + lastCell.height / 2,
	);
	await canvas.waitForTextEditor();
	return id;
}

/**
 * Tab while a cell is being edited: the draft is committed into the cell the
 * edit started on, and the editor opens on the next cell (Shift+Tab: the
 * previous one) with the focus in it, so typing carries on there. The draft is
 * bound to the picked cell (`CanvasControllerState.mode`), so the order is what keeps it from
 * being carried along: commit, then step, then open. Tab from the last cell
 * appends a row first and steps onto it (the textSlot kind's `extend`), in the
 * same undo step as the commit.
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

	test("appends a row on Tab from the last cell and carries on editing its first cell", async ({
		canvas,
	}) => {
		const id = await placeTableEditingLastCell(canvas);
		const before = await tableOutlineRect(canvas, id);
		await canvas.page.keyboard.type("last");

		await canvas.page.keyboard.press("Tab");

		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
		await expect(canvas.textEditorSurface()).toBeFocused();
		expect(await selectedCellIds(canvas, id)).toEqual(["r2c0"]);
		expect(await canvas.textEditorText()).toBe("");
		// The table grew downwards to hold the row; its top edge did not move.
		const after = await tableOutlineRect(canvas, id);
		expect(after.height).toBeGreaterThan(before.height);
		expect(after.y).toBeCloseTo(before.y, 0);
		await canvas.page.keyboard.type("next");
		expect(await canvas.textEditorText()).toBe("next");

		await canvas.commitText();
		expect(await isDrawnInsideCell(canvas, id, "last", "r1c1")).toBe(true);
		expect(await isDrawnInsideCell(canvas, id, "next", "r2c0")).toBe(true);
	});

	test("appends a row on Tab from the only cell of a 1x1 table", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await canvas.selectAt(await cellCenter(canvas, id, "r0c1"));
		await clickTrackGrip(canvas, "rowGrip", 1);
		await canvas.deleteSelection();
		await expect.poll(async () => cellCount(canvas, id)).toBe(2);
		await clickTrackGrip(canvas, "columnGrip", 1);
		await canvas.deleteSelection();
		await expect.poll(async () => cellCount(canvas, id)).toBe(1);
		const onlyCell = await cellRect(canvas, id, "r0c0");
		await canvas.page.mouse.dblclick(
			onlyCell.x + onlyCell.width / 2,
			onlyCell.y + onlyCell.height / 2,
		);
		await canvas.waitForTextEditor();
		await canvas.page.keyboard.type("only");

		await canvas.page.keyboard.press("Tab");

		await expect.poll(async () => cellCount(canvas, id)).toBe(2);
		await expect(canvas.textEditorSurface()).toBeFocused();
		expect(await selectedCellIds(canvas, id)).toEqual(["r1c0"]);
		expect(await canvas.textEditorText()).toBe("");
		await canvas.page.keyboard.type("next");

		await canvas.commitText();
		expect(await isDrawnInsideCell(canvas, id, "only", "r0c0")).toBe(true);
		expect(await isDrawnInsideCell(canvas, id, "next", "r1c0")).toBe(true);
	});

	test("takes the appended row and the last cell's text back in one undo", async ({
		canvas,
	}) => {
		const id = await placeTableEditingLastCell(canvas);
		await canvas.page.keyboard.type("last");
		await canvas.page.keyboard.press("Tab");
		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
		// Nothing typed into the new row, so closing its editor records nothing
		// and the one entry left is the Tab's.
		await canvas.cancelText();

		await canvas.undo();

		await expect.poll(async () => cellCount(canvas, id)).toBe(4);
		await expect.poll(async () => isDrawn(canvas, "last")).toBe(false);

		await canvas.redo();

		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
		expect(await isDrawnInsideCell(canvas, id, "last", "r1c1")).toBe(true);
	});
});

/**
 * Ctrl+Enter (Cmd+Enter on a Mac) while a cell is being edited commits it and
 * closes the editor as a press outside would, leaving the cell picked so Enter
 * opens it again.
 */
test.describe("table cell editing: Ctrl/Cmd+Enter", () => {
	test("commits the cell, closes the editor and keeps the cell picked", async ({
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

		await canvas.page.keyboard.press("ControlOrMeta+Enter");

		await expect(canvas.page.locator(selectors.textEditor)).toHaveCount(0);
		expect(await isDrawnInsideCell(canvas, id, "abc", "r0c0")).toBe(true);
		expect(await selectedCellIds(canvas, id)).toEqual(["r0c0"]);

		await canvas.page.keyboard.press("Enter");

		await canvas.waitForTextEditor();
		expect(await canvas.textEditorText()).toBe("abc");
	});
});

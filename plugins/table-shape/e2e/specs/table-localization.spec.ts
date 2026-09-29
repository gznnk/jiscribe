import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import { cellCenter } from "../support/tableDom";

/**
 * The wording the table contributes through `CanvasPlugin.messages`, read off a
 * real page because that is where the two halves meet: the canvas resolves the
 * dictionary for its locale, and the rows and buttons that draw it belong to
 * core, not to this plugin. A unit test can say the dictionary is well formed; it
 * cannot say the right-click menu ends up in Japanese.
 */

/** The section the cell-background button opens (TableCellColorMenu). */
const SECTION_ID = "table-cell-color";

/** The table tool, whose title is its stencil label and so follows the locale. */
const TABLE_TOOL_JA = "テーブル";

/**
 * The wording of one menu row: its first span, the row also carrying the
 * shortcut hint (ContextMenu).
 */
function contextMenuLabel(canvas: CanvasDriver, commandId: string) {
	return canvas.page
		.locator(selectors.contextMenuCommand(commandId))
		.locator("span")
		.first();
}

/** The ObjectMenu button opening the cell-background section. */
function cellColorToggle(canvas: CanvasDriver) {
	return canvas.page.locator(
		`${selectors.objectMenu} ${selectors.objectMenuToggle(SECTION_ID)}`,
	);
}

/** A `?messages=` query carrying what a host overrides, the way the harness reads it. */
function hostMessagesQuery(messages: Record<string, unknown>): string {
	return `messages=${encodeURIComponent(JSON.stringify(messages))}`;
}

test.describe("table localization", () => {
	test("a Japanese host reads the grid rows in Japanese", async ({
		canvas,
	}) => {
		await canvas.goto("?locale=ja");
		const id = await canvas.placeShape(TABLE_TOOL_JA);

		await canvas.openContextMenu(await cellCenter(canvas, id, "r0c0"));

		await expect(contextMenuLabel(canvas, "table.insertRowAbove")).toHaveText(
			"上に行を挿入",
		);
		await expect(
			contextMenuLabel(canvas, "table.insertColumnRight"),
		).toHaveText("右に列を挿入");
		await expect(contextMenuLabel(canvas, "table.deleteColumn")).toHaveText(
			"列を削除",
		);
	});

	test("a locale neither side ships falls back to the commands' English", async ({
		canvas,
	}) => {
		await canvas.goto("?locale=de");
		const id = await canvas.placeShape("Table");

		await canvas.openContextMenu(await cellCenter(canvas, id, "r0c0"));

		await expect(contextMenuLabel(canvas, "table.insertRowAbove")).toHaveText(
			"Insert Row Above",
		);
	});

	test("the table's own menu button follows the locale too", async ({
		canvas,
	}) => {
		await canvas.goto("?locale=ja");
		await canvas.placeShape(TABLE_TOOL_JA);

		await expect(cellColorToggle(canvas)).toHaveAttribute("title", "セルの色");
	});

	test("a host's own wording outranks the plugin's, for a command and for a string alike", async ({
		canvas,
	}) => {
		await canvas.goto(
			`?locale=ja&${hostMessagesQuery({
				commandLabels: { "table.insertRowAbove": "行を上に足す" },
				pluginStrings: { "table-shape.menuCellColor": "セル背景" },
			})}`,
		);
		const id = await canvas.placeShape(TABLE_TOOL_JA);

		await expect(cellColorToggle(canvas)).toHaveAttribute("title", "セル背景");

		await canvas.openContextMenu(await cellCenter(canvas, id, "r0c0"));

		await expect(contextMenuLabel(canvas, "table.insertRowAbove")).toHaveText(
			"行を上に足す",
		);
		// Only the named row moves; the rest keep what the plugin contributed.
		await expect(contextMenuLabel(canvas, "table.insertRowBelow")).toHaveText(
			"下に行を挿入",
		);
	});
});

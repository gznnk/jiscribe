import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * The table's wording read off a real page, because that is where the two halves
 * meet: the plugin declares it (its own dictionary for what it draws itself) and
 * core resolves it against the canvas locale. A unit test can say the
 * declarations are well formed; it cannot say the button ends up in Japanese.
 */

/** The section the cell-background button opens (TableCellColorMenu). */
const SECTION_ID = "table-cell-color";

/** The table tool, whose title is its stencil label and so follows the locale. */
const TABLE_TOOL_JA = "テーブル";

/** The ObjectMenu button opening the cell-background section. */
function cellColorToggle(canvas: CanvasDriver) {
	return canvas.page.locator(
		`${selectors.objectMenu} ${selectors.objectMenuToggle(SECTION_ID)}`,
	);
}

test.describe("table localization", () => {
	test("the table's own menu button follows the locale", async ({ canvas }) => {
		await canvas.goto("?locale=ja");
		await canvas.placeShape(TABLE_TOOL_JA);

		await expect(cellColorToggle(canvas)).toHaveAttribute("title", "セルの色");
	});
});

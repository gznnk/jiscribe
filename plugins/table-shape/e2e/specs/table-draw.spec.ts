import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import { cellRect, tableOutlineRect } from "../support/tableDom";

/**
 * The table drawn in a real browser. What only a browser answers is whether the
 * box the rest of the package computes is the box the shape occupies: a table's
 * size is never stored, so the first render is also the first time the measured
 * text has a say in it.
 */

/** Opens one cell for editing where it is drawn, replaces its text and commits. */
async function replaceCellText(
	canvas: CanvasDriver,
	objectId: string,
	cellId: string,
	text: string,
): Promise<void> {
	const cell = await cellRect(canvas, objectId, cellId);
	await canvas.page.mouse.dblclick(
		cell.x + cell.width / 2,
		cell.y + cell.height / 2,
	);
	await canvas.waitForTextEditor();
	await canvas.page
		.locator("textarea, [contenteditable=true]")
		.first()
		.fill(text);
	await canvas.commitText();
}

test.describe("table drawing", () => {
	test("places a table with a click and draws one cell per grid position", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const created = (await canvas.captureObjects()).find(
			(object) => object.id === id,
		);
		expect(created?.tag).toBe("g");

		// The default table is 2x2, and every cell carries its own id as data-part —
		// which is what a double click resolves a cell from.
		const cellParts = await canvas.page.evaluate(
			(objectId) =>
				[
					...document.querySelectorAll(
						`[data-kind="object"][data-id="${objectId}"] [data-part]`,
					),
				].map((cell) => cell.getAttribute("data-part")),
			id,
		);
		expect(cellParts).toEqual(["r0c0", "r0c1", "r1c0", "r1c1"]);
	});

	test("takes its height from the text, growing downwards", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await canvas.deselect();
		const before = await tableOutlineRect(canvas, id);

		// One cell given more text than its column is wide: the row it sits in has to
		// grow, and the table with it. Nothing in the document says so — the box is
		// re-derived from the content (resizeTableStateToContent).
		await replaceCellText(
			canvas,
			id,
			"r0c0",
			"レビュー指摘の反映と再確認を行う",
		);

		const after = await tableOutlineRect(canvas, id);
		expect(after.height).toBeGreaterThan(before.height);
		expect(after.width).toBeCloseTo(before.width, 0);
		// The corner the document names stays where it was drawn.
		expect(after.y).toBeCloseTo(before.y, 0);
	});
});

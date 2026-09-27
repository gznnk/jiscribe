import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * The table drawn in a real browser. What only a browser answers is whether the
 * box the rest of the package computes is the box the shape occupies: a table's
 * size is never stored, so the first render is also the first time the measured
 * text has a say in it.
 */

/** Client rect of one cell, read from the `data-part` the drawing gives it. */
async function cellRect(
	canvas: CanvasDriver,
	objectId: string,
	cellId: string,
): Promise<{ x: number; y: number; width: number; height: number }> {
	return canvas.page.evaluate(
		([id, part]) => {
			const cell = document.querySelector(
				`[data-kind="object"][data-id="${id}"] [data-part="${part}"]`,
			);
			if (cell === null) {
				throw new Error(`no cell ${part} on ${id}`);
			}
			const box = cell.getBoundingClientRect();
			return { x: box.x, y: box.y, width: box.width, height: box.height };
		},
		[objectId, cellId] as const,
	);
}

/**
 * The drawn grid: the outline rect's size and where its top edge lands, in client
 * pixels. Read off the DOM rather than the state, so a size the layout got right
 * but the drawing ignored still fails.
 */
async function drawnBox(
	canvas: CanvasDriver,
	objectId: string,
): Promise<{ width: number; height: number; top: number }> {
	return canvas.page.evaluate((id) => {
		const group = document.querySelector(
			`[data-kind="object"][data-id="${id}"]`,
		);
		if (group === null) {
			throw new Error(`no object ${id}`);
		}
		const outline = [...group.querySelectorAll("rect")].at(-1);
		if (outline === undefined) {
			throw new Error(`object ${id} draws no rect`);
		}
		const box = outline.getBoundingClientRect();
		return { width: box.width, height: box.height, top: box.y };
	}, objectId);
}

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
		const before = await drawnBox(canvas, id);

		// One cell given more text than its column is wide: the row it sits in has to
		// grow, and the table with it. Nothing in the document says so — the box is
		// re-derived from the content (resizeTableStateToContent).
		await replaceCellText(
			canvas,
			id,
			"r0c0",
			"レビュー指摘の反映と再確認を行う",
		);

		const after = await drawnBox(canvas, id);
		expect(after.height).toBeGreaterThan(before.height);
		expect(after.width).toBeCloseTo(before.width, 0);
		// The corner the document names stays where it was drawn.
		expect(after.top).toBeCloseTo(before.top, 0);
	});
});

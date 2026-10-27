import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCenter,
	cellRect,
	selectedCellIds,
	tableOutlineRect,
} from "../support/tableDom";

/** Screen box of the canvas area itself. */
async function canvasArea(canvas: CanvasDriver) {
	const box = await canvas.page.locator(selectors.canvasArea).boundingBox();
	if (!box) {
		throw new Error("the canvas area has no box on screen");
	}
	return box;
}

/**
 * Whether the cell is drawn wholly inside the canvas area; false while it is not
 * drawn at all, which is how an object scrolled out of view is left.
 */
async function isCellInsideCanvasArea(
	canvas: CanvasDriver,
	id: string,
	cellId: string,
): Promise<boolean> {
	const drawnCells = await canvas.page
		.locator(
			`[data-kind="object"][data-id="${id}"] [data-part="textSlot:${cellId}"]`,
		)
		.count();
	if (drawnCells === 0) {
		return false;
	}
	const cell = await cellRect(canvas, id, cellId);
	const area = await canvasArea(canvas);
	return (
		cell.x >= area.x &&
		cell.y >= area.y &&
		cell.x + cell.width <= area.x + area.width &&
		cell.y + cell.height <= area.y + area.height
	);
}

/**
 * Stepping the cell pick with the arrows, and widening it with Shift+arrows, in
 * a real browser. Where the step lands is pinned by selectAdjacentTableCell.test;
 * what a browser answers is that the keystroke reaches the table's command at
 * all — the built-in nudge claims the same arrows, Shift for its larger step,
 * and only the precedence a contributed command gets in the key dispatch keeps
 * the table from moving instead.
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

	test("pans to a cell stepped to off screen, keeping the zoom", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const start = await cellCenter(canvas, id, "r0c0");
		await canvas.clickAt(start);
		const area = await canvasArea(canvas);
		await canvas.wheel(start, { deltaX: area.width * 2 });
		await expect
			.poll(() => isCellInsideCanvasArea(canvas, id, "r0c1"), {
				message: "the scroll takes the table off screen",
			})
			.toBe(false);
		const viewBoxBefore = (await canvas.getViewBox())?.split(" ");

		await canvas.page.keyboard.press("ArrowRight");

		await expect
			.poll(async () => selectedCellIds(canvas, id))
			.toEqual(["r0c1"]);
		await expect
			.poll(() => isCellInsideCanvasArea(canvas, id, "r0c1"), {
				message: "the step pans the camera to the cell it lands on",
			})
			.toBe(true);
		// The viewBox's size changes with the zoom alone.
		expect((await canvas.getViewBox())?.split(" ").slice(2)).toEqual(
			viewBoxBefore?.slice(2),
		);
	});

	test("widens and narrows the picked block with Shift+arrows, leaving the table where it is", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await canvas.clickAt(await cellCenter(canvas, id, "r0c0"));
		const before = await tableOutlineRect(canvas, id);

		await canvas.page.keyboard.press("Shift+ArrowRight");
		await expect
			.poll(async () => selectedCellIds(canvas, id))
			.toEqual(["r0c0", "r0c1"]);
		await canvas.page.keyboard.press("Shift+ArrowDown");
		await expect
			.poll(async () => selectedCellIds(canvas, id))
			.toEqual(["r0c0", "r0c1", "r1c0", "r1c1"]);
		// Back towards the anchor, the block narrows rather than moves.
		await canvas.page.keyboard.press("Shift+ArrowLeft");
		await expect
			.poll(async () => selectedCellIds(canvas, id))
			.toEqual(["r0c0", "r1c0"]);
		await canvas.page.keyboard.press("Shift+ArrowUp");
		await expect
			.poll(async () => selectedCellIds(canvas, id))
			.toEqual(["r0c0"]);

		// At the grid's edge the keys stay with the table rather than falling
		// through to the larger nudge; the step afterwards proves they were handled.
		await canvas.page.keyboard.press("Shift+ArrowUp");
		await canvas.page.keyboard.press("Shift+ArrowLeft");
		await canvas.page.keyboard.press("Shift+ArrowRight");
		await expect
			.poll(async () => selectedCellIds(canvas, id))
			.toEqual(["r0c0", "r0c1"]);

		expect(await tableOutlineRect(canvas, id)).toEqual(before);
	});

	test("pans to the cell a Shift+arrow moves the range's end to off screen", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const start = await cellCenter(canvas, id, "r0c0");
		await canvas.clickAt(start);
		const area = await canvasArea(canvas);
		await canvas.wheel(start, { deltaX: area.width * 2 });
		await expect
			.poll(() => isCellInsideCanvasArea(canvas, id, "r0c1"), {
				message: "the scroll takes the table off screen",
			})
			.toBe(false);

		await canvas.page.keyboard.press("Shift+ArrowRight");

		await expect
			.poll(async () => selectedCellIds(canvas, id))
			.toEqual(["r0c0", "r0c1"]);
		await expect
			.poll(() => isCellInsideCanvasArea(canvas, id, "r0c1"), {
				message: "the extension pans the camera to the range's moving end",
			})
			.toBe(true);
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

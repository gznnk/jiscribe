import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCenter,
	cellCount,
	cellRect,
	tableOutlineRect,
	trackGrip,
} from "../support/tableDom";

/**
 * Inserting a row or a column, in a real browser. The renumbering itself is
 * pinned by insertTableTrack.test; what a browser answers is that the commands a
 * plugin contributes are reachable at all — they register after the built-in set
 * and are picked by `canExecute` — and that after an insertion the text is still
 * drawn in the cell it was typed into, the ids under it having all moved.
 */

/**
 * Alt+Shift plus an arrow: insert a track in that direction. Keyboard shortcuts
 * run synchronously on keydown, so what follows only has to wait for React to
 * commit — which the poll every caller makes does.
 */
async function insertTrack(
	canvas: CanvasDriver,
	arrow: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
): Promise<void> {
	await canvas.page.keyboard.press(`Alt+Shift+${arrow}`);
}

/**
 * Where one piece of drawn text sits, in client px: the middle of the innermost
 * element holding exactly that text. Found by the text rather than by a
 * `data-part`, the slot overlays carrying none.
 */
async function textCenter(
	canvas: CanvasDriver,
	text: string,
): Promise<{ x: number; y: number }> {
	const center = await canvas.page.evaluate((wanted) => {
		const holder = [...document.querySelectorAll("*")]
			.reverse()
			.find((element) => element.textContent?.trim() === wanted);
		if (holder === undefined) {
			return null;
		}
		const box = holder.getBoundingClientRect();
		return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
	}, text);
	if (center === null) {
		throw new Error(`"${text}" is not drawn`);
	}
	return center;
}

/** Places a table and picks one of its cells, which is the reference an insertion runs from. */
async function placeTableWithCellPicked(
	canvas: CanvasDriver,
	cellId: string,
): Promise<string> {
	const id = await canvas.placeShape("Table");
	await canvas.clickAt(await cellCenter(canvas, id, cellId));
	return id;
}

test.describe("table insert track", () => {
	test("inserts a row on either side of the picked cell", async ({
		canvas,
	}) => {
		const id = await placeTableWithCellPicked(canvas, "r0c0");
		const before = await tableOutlineRect(canvas, id);

		await insertTrack(canvas, "ArrowDown");

		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
		// The table grew downwards; its top edge did not move.
		const after = await tableOutlineRect(canvas, id);
		expect(after.height).toBeGreaterThan(before.height);
		expect(after.y).toBeCloseTo(before.y, 0);

		await insertTrack(canvas, "ArrowUp");
		await expect.poll(async () => cellCount(canvas, id)).toBe(8);
	});

	test("inserts a column of the width of the one it was put next to", async ({
		canvas,
	}) => {
		const id = await placeTableWithCellPicked(canvas, "r0c0");
		const before = {
			cell: await cellRect(canvas, id, "r0c0"),
			box: await tableOutlineRect(canvas, id),
		};

		await insertTrack(canvas, "ArrowRight");

		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
		const after = await tableOutlineRect(canvas, id);
		expect(after.width).toBeCloseTo(before.box.width + before.cell.width, 0);
		expect(after.x).toBeCloseTo(before.box.x, 0);
	});

	test("keeps the text in its own cell across the renumbering", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await canvas.typeTextAt(await cellCenter(canvas, id, "r1c0"), "below");
		// The commit clicks empty space, so the table has to be picked up again
		// before a second click can address a cell of it. Picked up by another cell,
		// two clicks in a row on the same spot being a double click — which opens the
		// editor rather than choosing a cell.
		await canvas.commitText();
		await canvas.selectAt(await cellCenter(canvas, id, "r0c1"));
		await canvas.clickAt(await cellCenter(canvas, id, "r1c0"));

		await insertTrack(canvas, "ArrowUp");

		// The text was in the second row and is now in the third, every id under it
		// having moved one along.
		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
		const drawnAt = await textCenter(canvas, "below");
		const cell = await cellRect(canvas, id, "r2c0");
		expect(drawnAt.x).toBeGreaterThan(cell.x);
		expect(drawnAt.x).toBeLessThan(cell.x + cell.width);
		expect(drawnAt.y).toBeGreaterThan(cell.y);
		expect(drawnAt.y).toBeLessThan(cell.y + cell.height);
	});

	test("runs off a row grip as readily as off a cell", async ({ canvas }) => {
		const id = await canvas.placeShape("Table");
		const grip = await trackGrip(canvas, "rowGrip", 1).boundingBox();
		if (grip === null) {
			throw new Error("no row grip");
		}
		await canvas.clickAt(
			canvas.toContent({
				x: grip.x + grip.width / 2,
				y: grip.y + grip.height / 2,
			}),
		);

		await insertTrack(canvas, "ArrowDown");

		await expect.poll(async () => cellCount(canvas, id)).toBe(6);

		// A column tells an inserted row nothing about where it goes, so a row
		// selection leaves the column insertions unavailable...
		await insertTrack(canvas, "ArrowRight");
		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
		// ...and the very same keystroke lands once a cell names a column.
		await canvas.clickAt(await cellCenter(canvas, id, "r0c0"));
		await insertTrack(canvas, "ArrowRight");
		await expect.poll(async () => cellCount(canvas, id)).toBe(9);
	});

	test("does nothing with the table selected but no cell or track picked", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");

		// The table itself names no place to insert at.
		await insertTrack(canvas, "ArrowDown");
		await expect.poll(async () => cellCount(canvas, id)).toBe(4);

		// The same keystroke, once a cell is picked, does insert — so the press
		// above was refused rather than lost.
		await canvas.clickAt(await cellCenter(canvas, id, "r0c0"));
		await insertTrack(canvas, "ArrowDown");
		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
	});

	test("is undone in one step", async ({ canvas }) => {
		const id = await placeTableWithCellPicked(canvas, "r0c0");

		await insertTrack(canvas, "ArrowDown");
		await expect.poll(async () => cellCount(canvas, id)).toBe(6);

		await canvas.undo();
		await expect.poll(async () => cellCount(canvas, id)).toBe(4);
	});
});

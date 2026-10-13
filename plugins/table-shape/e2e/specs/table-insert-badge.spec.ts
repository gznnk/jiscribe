import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCenter,
	cellCount,
	cellRect,
	clickInsertBadge,
	drawnTextCenter,
	insertBadge,
	tableOutlineRect,
} from "../support/tableDom";

/**
 * How far a transform handle reaches outside the edge it sits on, in client px
 * (the theme's `anchorRadius`). The row badges line the right edge, where the
 * width handle sits, and have to start beyond it.
 */
const HANDLE_REACH = 4;

/**
 * The `+` offered at every boundary, in a real browser. Two things only a browser
 * answers: that a badge stands where the boundary is and can be hit at all, and
 * that the click it takes reaches the document — a selection control changing an
 * object on a click is committed by the adapter on the spot, and nothing short of
 * the real reducer shows whether the edit was recorded rather than merely applied.
 *
 * The renumbering behind the insertion is pinned by insertTableTrack.test; what
 * is asserted here is that the text comes out in the cell it was typed into once
 * every id under it has moved, and that one undo takes the whole insertion back.
 */

test.describe("table insert badges", () => {
	test("offers one badge per boundary, the outer edges included", async ({
		canvas,
	}) => {
		// Placed and left selected, which is when the controls are drawn.
		await canvas.placeShape("Table");

		// A fresh table is 2x2, so each axis has three insertion positions: before
		// the first track, between the two, and after the last.
		await expect(insertBadge(canvas, "columnInsert", 0)).toBeVisible();
		await expect(insertBadge(canvas, "columnInsert", 1)).toBeVisible();
		await expect(insertBadge(canvas, "columnInsert", 2)).toBeVisible();
		await expect(insertBadge(canvas, "columnInsert", 3)).toHaveCount(0);
		await expect(insertBadge(canvas, "rowInsert", 0)).toBeVisible();
		await expect(insertBadge(canvas, "rowInsert", 2)).toBeVisible();
		await expect(insertBadge(canvas, "rowInsert", 3)).toHaveCount(0);
	});

	test("stands outside the edge opposite the grips, on the boundary", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const box = await tableOutlineRect(canvas, id);
		const columnBadge = await insertBadge(
			canvas,
			"columnInsert",
			1,
		).boundingBox();
		const rowBadge = await insertBadge(canvas, "rowInsert", 1).boundingBox();
		if (columnBadge === null || rowBadge === null) {
			throw new Error("no badge");
		}

		// Columns' badges below the table, rows' to its right: wholly outside the
		// edge, and past the width handle's reach on the right, so a press on one
		// never lands on the handle.
		expect(columnBadge.y).toBeGreaterThan(box.y + box.height);
		expect(rowBadge.x).toBeGreaterThan(box.x + box.width + HANDLE_REACH);
		// On the inner rule, which a 2x2 table draws down its middle and across it.
		expect(
			Math.abs(columnBadge.x + columnBadge.width / 2 - (box.x + box.width / 2)),
		).toBeLessThanOrEqual(1);
		expect(
			Math.abs(rowBadge.y + rowBadge.height / 2 - (box.y + box.height / 2)),
		).toBeLessThanOrEqual(1);
	});

	test("inserts a column at the boundary the badge stands on", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const before = {
			cell: await cellRect(canvas, id, "r0c0"),
			box: await tableOutlineRect(canvas, id),
		};

		await clickInsertBadge(canvas, "columnInsert", 1);

		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
		// The new column took the width of the one it was put next to, and the
		// table grew rightwards from the corner it is drawn from.
		const after = await tableOutlineRect(canvas, id);
		expect(after.width).toBeCloseTo(before.box.width + before.cell.width, 0);
		expect(after.x).toBeCloseTo(before.box.x, 0);
	});

	test("inserts once per press of a rapid run, the second press arriving as a double click", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const badge = await insertBadge(canvas, "columnInsert", 1).boundingBox();
		if (badge === null) {
			throw new Error("no badge");
		}

		// The badge stays put across the insertion (the new column goes to its
		// right), so both presses of the pair land on it.
		await canvas.page.mouse.dblclick(
			badge.x + badge.width / 2,
			badge.y + badge.height / 2,
		);

		await expect.poll(async () => cellCount(canvas, id)).toBe(8);
	});

	test("adds a first row from the badge on the outer edge", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const before = await tableOutlineRect(canvas, id);

		await clickInsertBadge(canvas, "rowInsert", 0);

		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
		const after = await tableOutlineRect(canvas, id);
		expect(after.height).toBeGreaterThan(before.height);
		expect(after.y).toBeCloseTo(before.y, 0);
	});

	test("keeps the cells' contents across the renumbering", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await canvas.typeTextAt(await cellCenter(canvas, id, "r0c0"), "kept");
		// The commit clicks empty space, so the table has to be picked up again
		// before its controls are drawn.
		await canvas.commitText();
		await canvas.selectAt(await cellCenter(canvas, id, "r1c1"));

		await clickInsertBadge(canvas, "columnInsert", 0);

		// The text was in the first column and is now in the second, every id to
		// its right having moved one along.
		await expect.poll(async () => cellCount(canvas, id)).toBe(6);
		const drawnAt = await drawnTextCenter(canvas, "kept");
		const cell = await cellRect(canvas, id, "r0c1");
		expect(drawnAt.x).toBeGreaterThan(cell.x);
		expect(drawnAt.x).toBeLessThan(cell.x + cell.width);
		expect(drawnAt.y).toBeGreaterThan(cell.y);
		expect(drawnAt.y).toBeLessThan(cell.y + cell.height);
	});

	test("is undone in one step", async ({ canvas }) => {
		const id = await canvas.placeShape("Table");

		await clickInsertBadge(canvas, "rowInsert", 1);
		await expect.poll(async () => cellCount(canvas, id)).toBe(6);

		await canvas.undo();
		await expect.poll(async () => cellCount(canvas, id)).toBe(4);
	});
});

import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCenter,
	cellCount,
	cellRect,
	clickTrackGrip,
	pressInsertTrack,
	tableOutlineRect,
	trackGrip,
} from "../support/tableDom";
import type { ClientRect } from "../support/tableDom";

/**
 * A table inside a group, reshaped every way the UI offers, with the group's own
 * frame having to follow each time.
 *
 * A group's frame is cached on the group rather than derived on read, so whoever
 * reshapes a child has to settle it. The table is the first shape that reshapes
 * itself from several directions at once — a command, a control, a drag — and the
 * settling used to depend on which of them was used: an edit handing over a box it
 * had already derived left the frame behind, while one leaving the box to the
 * type's resizer did not. Same act, two answers.
 *
 * What a browser is asked here is the visible half of that: the outline drawn
 * around the selected group has to end where the table ends, whichever way the
 * table was reshaped.
 */

/** How far apart two client-pixel edges may sit and still count as the same edge. */
const EDGE_TOLERANCE_PX = 1.5;

/**
 * The selected group's own outline. The overlay draws one per selected id and per
 * descendant, and a group's is the union of the rest, so the tallest is it.
 */
async function groupOutlineRect(canvas: CanvasDriver): Promise<ClientRect> {
	return canvas.page.evaluate((outlineSelector) => {
		const outlines = [...document.querySelectorAll(outlineSelector)];
		if (outlines.length === 0) {
			throw new Error("nothing is selected, so no outline is drawn");
		}
		const boxes = outlines.map((outline) => outline.getBoundingClientRect());
		const tallest = boxes.reduce((widest, box) =>
			box.height > widest.height ? box : widest,
		);
		return {
			x: tallest.x,
			y: tallest.y,
			width: tallest.width,
			height: tallest.height,
		};
	}, selectors.selectionOutline);
}

/**
 * Places a table, draws a rectangle clear above it, and groups the two. The
 * rectangle is what makes the group's frame a union rather than a copy of the
 * table's, so a frame left unsettled cannot pass by accident.
 *
 * @returns The table's object id, the group left selected
 */
async function groupTableWithRectAbove(canvas: CanvasDriver): Promise<string> {
	const tableId = await canvas.placeShape("Table");
	const table = await tableOutlineRect(canvas, tableId);
	await canvas.deselect();

	// Well above the table and narrower than it, so the group's bottom edge is
	// the table's alone.
	const from = canvas.toContent({ x: table.x + 10, y: table.y - 180 });
	const to = canvas.toContent({ x: table.x + 90, y: table.y - 100 });
	await canvas.drawShape("Rectangle", from, to);
	await canvas.deselect();

	const rectCenter = canvas.toContent({
		x: table.x + 50,
		y: table.y - 140,
	});
	await canvas.selectAt(await cellCenter(canvas, tableId, "r0c0"));
	await canvas.ctrlClickAt(rectCenter);
	await canvas.group();

	return tableId;
}

/**
 * Places a table, draws a rectangle clear above it, and selects the two together
 * without grouping them, so the transform frame drawn is the multi-select one.
 *
 * @returns The table's object id, both shapes left selected
 */
async function selectTableWithRectAbove(canvas: CanvasDriver): Promise<string> {
	const tableId = await canvas.placeShape("Table");
	const table = await tableOutlineRect(canvas, tableId);
	await canvas.deselect();

	const from = canvas.toContent({ x: table.x + 10, y: table.y - 180 });
	const to = canvas.toContent({ x: table.x + 90, y: table.y - 100 });
	await canvas.drawShape("Rectangle", from, to);
	await canvas.deselect();

	await canvas.selectAt(await cellCenter(canvas, tableId, "r0c0"));
	await canvas.ctrlClickAt(
		canvas.toContent({ x: table.x + 50, y: table.y - 140 }),
	);

	return tableId;
}

/** The client-pixel center of a transform handle of the frame drawn now. */
async function transformHandleCenter(
	canvas: CanvasDriver,
	handle: "bottomCenter",
): Promise<{ x: number; y: number }> {
	const box = await canvas.page
		.locator(selectors.transformControl(handle))
		.boundingBox();
	if (!box) {
		throw new Error(`cannot read the position of transform handle ${handle}`);
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Drills from the group down to the table itself, which is what draws the grips. Two clicks: the first picks the topmost ancestor, the second
 * the member inside it (determineSelection's "immediate parent is selected").
 *
 * They land on different cells on purpose. Two clicks within 5px of each other
 * pair into a doubleClick (DOUBLE_CLICK_DISTANCE_THRESHOLD), which over a table
 * opens the cell for editing instead of stepping into the group.
 */
async function enterTable(
	canvas: CanvasDriver,
	tableId: string,
): Promise<void> {
	await canvas.deselect();
	await canvas.clickAt(await cellCenter(canvas, tableId, "r1c1"));
	await canvas.clickAt(await cellCenter(canvas, tableId, "r0c0"));
	await expect(trackGrip(canvas, "rowGrip", 0)).toBeVisible();
}

/**
 * Re-picks the whole group and asserts its outline ends where the table does. The
 * bottom edge is the telling one: the table grows and shrinks downward, so a frame
 * nobody settled hangs below the table after a removal and cuts through it after
 * an insertion.
 */
async function expectGroupOutlineToEndAtTable(
	canvas: CanvasDriver,
	tableId: string,
): Promise<void> {
	await canvas.deselect();
	await canvas.selectAt(await cellCenter(canvas, tableId, "r0c0"));

	await expect
		.poll(
			async () => {
				const outline = await groupOutlineRect(canvas);
				const table = await tableOutlineRect(canvas, tableId);
				return Math.abs(outline.y + outline.height - (table.y + table.height));
			},
			{ message: "the group's outline ends where the table ends" },
		)
		.toBeLessThanOrEqual(EDGE_TOLERANCE_PX);
}

test.describe("a grouped table's parent bounds", () => {
	test("start out fitting the table", async ({ canvas }) => {
		const tableId = await groupTableWithRectAbove(canvas);

		await expectGroupOutlineToEndAtTable(canvas, tableId);
	});

	test("follow a row removed with the Delete key", async ({ canvas }) => {
		const tableId = await groupTableWithRectAbove(canvas);
		await enterTable(canvas, tableId);

		await clickTrackGrip(canvas, "rowGrip", 1);
		await canvas.deleteSelection();
		await expect.poll(async () => cellCount(canvas, tableId)).toBe(2);

		await expectGroupOutlineToEndAtTable(canvas, tableId);
	});

	test("follow a row inserted with the keys", async ({ canvas }) => {
		const tableId = await groupTableWithRectAbove(canvas);
		await enterTable(canvas, tableId);

		// Below the last row, so the table grows downward.
		await clickTrackGrip(canvas, "rowGrip", 1);
		await pressInsertTrack(canvas, "ArrowDown");
		await expect.poll(async () => cellCount(canvas, tableId)).toBe(6);

		await expectGroupOutlineToEndAtTable(canvas, tableId);
	});

	test("follow a row boundary dragged taller", async ({ canvas }) => {
		const tableId = await groupTableWithRectAbove(canvas);
		await enterTable(canvas, tableId);

		const before = await tableOutlineRect(canvas, tableId);
		const boundary = await cellRect(canvas, tableId, "r0c0");
		await canvas.drag(
			canvas.toContent({
				x: boundary.x + boundary.width / 2,
				y: boundary.y + boundary.height,
			}),
			canvas.toContent({
				x: boundary.x + boundary.width / 2,
				y: boundary.y + boundary.height + 60,
			}),
		);
		await expect
			.poll(async () => (await tableOutlineRect(canvas, tableId)).height)
			.toBeGreaterThan(before.height);

		await expectGroupOutlineToEndAtTable(canvas, tableId);
	});
});

test.describe("a grouped table scaled by its group's frame", () => {
	test("spreads a group's bottom-edge drag over the table's rows", async ({
		canvas,
	}) => {
		const tableId = await groupTableWithRectAbove(canvas);
		const group = await groupOutlineRect(canvas);
		const before = {
			leading: await cellRect(canvas, tableId, "r0c0"),
			trailing: await cellRect(canvas, tableId, "r1c0"),
			box: await tableOutlineRect(canvas, tableId),
		};

		await canvas.dragTransformHandle(
			"bottomCenter",
			canvas.toContent({
				x: group.x + group.width / 2,
				y: group.y + group.height + 120,
			}),
			{ ctrl: true },
		);

		await expect
			.poll(async () => (await tableOutlineRect(canvas, tableId)).height)
			.toBeGreaterThan(before.box.height + 20);
		const after = {
			leading: await cellRect(canvas, tableId, "r0c0"),
			trailing: await cellRect(canvas, tableId, "r1c0"),
			box: await tableOutlineRect(canvas, tableId),
		};
		// The table's bottom is the group's, which the drag carried down.
		expect(after.box.y + after.box.height).toBeCloseTo(
			group.y + group.height + 120,
			0,
		);
		expect(after.leading.height / after.trailing.height).toBeCloseTo(
			before.leading.height / before.trailing.height,
			1,
		);
	});

	test("holds the table's bottom when a group's top-edge drag shrinks it past the rows' text", async ({
		canvas,
	}) => {
		const tableId = await groupTableWithRectAbove(canvas);
		const group = await groupOutlineRect(canvas);
		const before = await tableOutlineRect(canvas, tableId);

		// A fresh table's rows are drawn at their floor already, so any shrink the
		// group hands it stops there, and it has to stop against the edge the group
		// keeps rather than hang below it.
		await canvas.dragTransformHandle(
			"topCenter",
			canvas.toContent({ x: group.x + group.width / 2, y: group.y + 60 }),
			{ ctrl: true },
		);

		const after = await tableOutlineRect(canvas, tableId);
		expect(after.height).toBeCloseTo(before.height, 0);
		expect(after.y + after.height).toBeCloseTo(before.y + before.height, 0);
	});
});

test.describe("a table scaled by a multi-select frame", () => {
	test("spreads a multi-select's bottom-edge drag over the table's rows", async ({
		canvas,
	}) => {
		const tableId = await selectTableWithRectAbove(canvas);
		const before = {
			leading: await cellRect(canvas, tableId, "r0c0"),
			trailing: await cellRect(canvas, tableId, "r1c0"),
			box: await tableOutlineRect(canvas, tableId),
		};
		// The frame spans both shapes, and its bottom edge is the table's alone.
		const handle = await transformHandleCenter(canvas, "bottomCenter");
		expect(handle.y).toBeCloseTo(before.box.y + before.box.height, 0);

		await canvas.dragTransformHandle(
			"bottomCenter",
			canvas.toContent({ x: handle.x, y: handle.y + 120 }),
			{ ctrl: true },
		);

		await expect
			.poll(async () => (await tableOutlineRect(canvas, tableId)).height)
			.toBeGreaterThan(before.box.height + 20);
		const after = {
			leading: await cellRect(canvas, tableId, "r0c0"),
			trailing: await cellRect(canvas, tableId, "r1c0"),
			box: await tableOutlineRect(canvas, tableId),
		};
		// The table's bottom is the frame's, which the drag carried down.
		expect(after.box.y + after.box.height).toBeCloseTo(
			before.box.y + before.box.height + 120,
			0,
		);
		expect(after.leading.height / after.trailing.height).toBeCloseTo(
			before.leading.height / before.trailing.height,
			1,
		);
	});
});

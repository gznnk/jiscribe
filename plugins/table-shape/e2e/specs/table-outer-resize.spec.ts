import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCenter,
	cellRect,
	fillCell,
	isResizeHandleOnTop,
	tableOutlineRect,
} from "../support/tableDom";

/**
 * Resizing a table by its own frame, in a real browser. A table stores no size,
 * so the handle writes a width or a height that only the content resizer ever
 * sees; what a browser answers here is whether the two halves — the handle's
 * write and the grid re-derived from it — land on the same frame, so the dragged
 * edge follows the cursor instead of snapping back.
 *
 * The arithmetic of the distribution is pinned by
 * distributeTableTrackSizes.test and its two callers' tests.
 */

/** Narrowest a column may be drawn, in local px (TABLE_MIN_COLUMN_WIDTH). */
const MIN_COLUMN_WIDTH = 24;

/** Every handle the transform frame draws around a resizable shape. */
const RESIZE_HANDLES = [
	"topLeft",
	"topCenter",
	"topRight",
	"leftCenter",
	"rightCenter",
	"bottomLeft",
	"bottomCenter",
	"bottomRight",
] as const;

/** Wraps over several lines in a fresh table's column, so its row is held by it. */
const WRAPPING_TEXT = "a cell holding enough words to wrap";

/** The strip for one row boundary, by the `data-action` its control gives it. */
const rowBoundaryStrip = (canvas: CanvasDriver, boundaryIndex: number) =>
	canvas.page.locator(
		`[data-kind="control"][data-action="selection:table:rowBoundary:${boundaryIndex}"]`,
	);

/** The strip along the table's trailing edge on one axis. */
const trailingEdgeStrip = (canvas: CanvasDriver, axis: "column" | "row") =>
	canvas.page.locator(
		`[data-kind="control"][data-action="selection:table:trailingEdge:${axis}"]`,
	);

/** The strip for one column boundary, by the `data-action` its control gives it. */
const columnBoundaryStrip = (canvas: CanvasDriver, boundaryIndex: number) =>
	canvas.page.locator(
		`[data-kind="control"][data-action="selection:table:columnBoundary:${boundaryIndex}"]`,
	);

/**
 * Drag one of the table's height handles to a client y, keeping the pointer at the
 * edge's own middle. Ctrl is held for the reason dragWidthHandleTo gives.
 */
async function dragHeightHandleTo(
	canvas: CanvasDriver,
	handle: "topCenter" | "bottomCenter",
	box: { x: number; y: number; width: number; height: number },
	clientY: number,
): Promise<void> {
	await canvas.dragTransformHandle(
		handle,
		canvas.toContent({ x: box.x + box.width / 2, y: clientY }),
		{ ctrl: true },
	);
}

/** Drag from one client point by a client offset, both converted into content coordinates. */
async function dragClient(
	canvas: CanvasDriver,
	from: { x: number; y: number },
	by: { x: number; y: number },
): Promise<void> {
	await canvas.drag(
		canvas.toContent(from),
		canvas.toContent({ x: from.x + by.x, y: from.y + by.y }),
	);
}

/**
 * Drag one of the table's width handles to a client x, keeping the pointer at the
 * edge's own height. Ctrl is held so the width that lands is the one that was asked
 * for rather than one a snap target moved.
 */
async function dragWidthHandleTo(
	canvas: CanvasDriver,
	handle: "leftCenter" | "rightCenter",
	box: { x: number; y: number; width: number; height: number },
	clientX: number,
): Promise<void> {
	await canvas.dragTransformHandle(
		handle,
		canvas.toContent({ x: clientX, y: box.y + box.height / 2 }),
		{ ctrl: true },
	);
}

test.describe("table outer resize", () => {
	test("offers all eight resize handles", async ({ canvas }) => {
		await canvas.placeShape("Table");

		for (const handle of RESIZE_HANDLES) {
			await expect(
				canvas.page.locator(selectors.transformControl(handle)),
			).toBeVisible();
		}
	});

	test("draws the edge handles over the strips and grips lining their edges", async ({
		canvas,
	}) => {
		await canvas.placeShape("Table");

		// The right and bottom edges carry the trailing-edge strips, the left and
		// top ones the grips.
		for (const handle of [
			"rightCenter",
			"leftCenter",
			"bottomCenter",
			"topCenter",
		] as const) {
			expect(await isResizeHandleOnTop(canvas, handle)).toBe(true);
		}
	});

	test("widens the table by its left edge, the right edge staying where it was", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const before = await tableOutlineRect(canvas, id);

		await dragWidthHandleTo(canvas, "leftCenter", before, before.x - 80);

		await expect
			.poll(async () => Math.round((await tableOutlineRect(canvas, id)).width))
			.toBe(Math.round(before.width + 80));
		const after = await tableOutlineRect(canvas, id);
		expect(after.x).toBeCloseTo(before.x - 80, 0);
		expect(after.x + after.width).toBeCloseTo(before.x + before.width, 0);
	});

	test("spreads a right-edge drag over the columns in the proportions they hold", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");

		// A fresh table's columns are equal, which would hide a distribution that
		// ignored the proportions; the boundary drag is what makes them 2:1.
		await expect(columnBoundaryStrip(canvas, 0)).toBeVisible();
		const even = await cellRect(canvas, id, "r0c0");
		await canvas.drag(
			canvas.toContent({
				x: even.x + even.width,
				y: even.y + even.height / 2,
			}),
			canvas.toContent({
				x: even.x + even.width + 40,
				y: even.y + even.height / 2,
			}),
		);
		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r0c0")).width))
			.toBe(Math.round(even.width + 40));

		const before = {
			leading: await cellRect(canvas, id, "r0c0"),
			trailing: await cellRect(canvas, id, "r0c1"),
			box: await tableOutlineRect(canvas, id),
		};

		await dragWidthHandleTo(
			canvas,
			"rightCenter",
			before.box,
			before.box.x + before.box.width + 120,
		);

		await expect
			.poll(async () => Math.round((await tableOutlineRect(canvas, id)).width))
			.toBe(Math.round(before.box.width + 120));

		const after = {
			leading: await cellRect(canvas, id, "r0c0"),
			trailing: await cellRect(canvas, id, "r0c1"),
			box: await tableOutlineRect(canvas, id),
		};
		// The edge that was not dragged stays where it was drawn.
		expect(after.box.x).toBeCloseTo(before.box.x, 0);
		expect(after.leading.x).toBeCloseTo(before.leading.x, 0);
		// Each column grew by its own share: 2:1 before, 2:1 after.
		expect(after.leading.width / after.trailing.width).toBeCloseTo(
			before.leading.width / before.trailing.width,
			1,
		);
		expect(after.leading.width + after.trailing.width).toBeCloseTo(
			before.leading.width + before.trailing.width + 120,
			0,
		);
	});

	test("stops at the narrowest grid it can build rather than collapsing", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const before = {
			leading: await cellRect(canvas, id, "r0c0"),
			box: await tableOutlineRect(canvas, id),
		};

		// Well past the point where both columns are down at their minimum: the
		// cursor goes on, and the right edge has to stop following it.
		await dragWidthHandleTo(
			canvas,
			"rightCenter",
			before.box,
			before.box.x + 20,
		);

		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r0c0")).width))
			.toBeLessThan(Math.round(before.leading.width));

		const stopped = {
			leading: await cellRect(canvas, id, "r0c0"),
			trailing: await cellRect(canvas, id, "r0c1"),
			box: await tableOutlineRect(canvas, id),
		};
		// Both columns sit at the minimum, and the table is exactly that wide — the
		// outline's own rule being the only thing between the two figures.
		expect(stopped.leading.width).toBeCloseTo(MIN_COLUMN_WIDTH, 0);
		expect(stopped.trailing.width).toBeCloseTo(MIN_COLUMN_WIDTH, 0);
		expect(stopped.box.width).toBeGreaterThan(MIN_COLUMN_WIDTH * 2 - 1);
		expect(stopped.box.width).toBeLessThan(MIN_COLUMN_WIDTH * 2 + 3);
		expect(stopped.box.x).toBeCloseTo(before.box.x, 0);
		// The grid is still drawn: the cells kept the height their one line asks for.
		expect(stopped.leading.height).toBeCloseTo(before.leading.height, 0);
	});

	test("stops a left-edge drag at the narrowest grid with the right edge held", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const before = await tableOutlineRect(canvas, id);
		const rightEdge = before.x + before.width;

		// Past the minimum but short of the right edge: the floor is met by the
		// transform frame, which knows the right edge is the one to hold. Left to the
		// grid, the box would keep its drawn left corner and slide with the cursor.
		await dragWidthHandleTo(canvas, "leftCenter", before, rightEdge - 20);

		await expect
			.poll(async () => Math.round((await tableOutlineRect(canvas, id)).width))
			.toBeLessThan(MIN_COLUMN_WIDTH * 2 + 3);
		const stopped = await tableOutlineRect(canvas, id);
		expect(stopped.x + stopped.width).toBeCloseTo(rightEdge, 0);
	});

	test("flips a left-edge drag carried past the right edge onto its far side", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const before = await tableOutlineRect(canvas, id);
		const rightEdge = before.x + before.width;

		await dragWidthHandleTo(canvas, "leftCenter", before, rightEdge + 10);

		// Narrower than the floor past the right edge: the table is the narrowest
		// grid, starting from the edge it was flipped over.
		await expect
			.poll(async () => Math.round((await tableOutlineRect(canvas, id)).x))
			.toBe(Math.round(rightEdge));
		const flipped = await tableOutlineRect(canvas, id);
		expect(flipped.width).toBeLessThan(MIN_COLUMN_WIDTH * 2 + 3);
	});

	test("spreads a bottom-edge drag over the rows in the proportions they are drawn at", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");

		// A fresh table's rows are equal; the boundary drag is what makes them uneven.
		// Grabbed at the middle of the first column, clear of the left handle.
		await expect(rowBoundaryStrip(canvas, 0)).toBeVisible();
		const even = await cellRect(canvas, id, "r0c0");
		await dragClient(
			canvas,
			{ x: even.x + even.width / 2, y: even.y + even.height },
			{ x: 0, y: 40 },
		);
		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r0c0")).height))
			.toBe(Math.round(even.height + 40));

		const before = {
			leading: await cellRect(canvas, id, "r0c0"),
			trailing: await cellRect(canvas, id, "r1c0"),
			box: await tableOutlineRect(canvas, id),
		};

		await dragHeightHandleTo(
			canvas,
			"bottomCenter",
			before.box,
			before.box.y + before.box.height + 120,
		);

		await expect
			.poll(async () => Math.round((await tableOutlineRect(canvas, id)).height))
			.toBe(Math.round(before.box.height + 120));

		const after = {
			leading: await cellRect(canvas, id, "r0c0"),
			trailing: await cellRect(canvas, id, "r1c0"),
			box: await tableOutlineRect(canvas, id),
		};
		// The edge that was not dragged stays where it was drawn, and the width with it.
		expect(after.box.y).toBeCloseTo(before.box.y, 0);
		expect(after.box.width).toBeCloseTo(before.box.width, 0);
		// Each row grew by its own share.
		expect(after.leading.height / after.trailing.height).toBeCloseTo(
			before.leading.height / before.trailing.height,
			1,
		);
		expect(after.leading.height + after.trailing.height).toBeCloseTo(
			before.leading.height + before.trailing.height + 120,
			0,
		);
	});

	test("heightens the table by its top edge, the bottom edge staying where it was", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const before = await tableOutlineRect(canvas, id);

		await dragHeightHandleTo(canvas, "topCenter", before, before.y - 80);

		await expect
			.poll(async () => Math.round((await tableOutlineRect(canvas, id)).height))
			.toBe(Math.round(before.height + 80));
		const after = await tableOutlineRect(canvas, id);
		expect(after.y).toBeCloseTo(before.y - 80, 0);
		expect(after.y + after.height).toBeCloseTo(before.y + before.height, 0);
	});

	test("stops a top-edge drag at the rows' text with the bottom edge held", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const before = await tableOutlineRect(canvas, id);
		const bottomEdge = before.y + before.height;

		// A fresh table's rows are drawn at their one empty line, which is already
		// their floor: dragged down toward the bottom edge, the top must not move.
		await dragHeightHandleTo(canvas, "topCenter", before, bottomEdge - 10);

		const stopped = await tableOutlineRect(canvas, id);
		expect(stopped.height).toBeCloseTo(before.height, 0);
		expect(stopped.y + stopped.height).toBeCloseTo(bottomEdge, 0);
	});

	test("holds the opposite corner while a corner drag narrows the columns and raises the rows' text", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await fillCell(canvas, id, "r0c0", WRAPPING_TEXT);
		const oneLine = await cellRect(canvas, id, "r1c0");
		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r0c0")).height))
			.toBeGreaterThan(Math.round(oneLine.height));
		await canvas.selectAt(await cellCenter(canvas, id, "r1c0"));
		const before = await tableOutlineRect(canvas, id);
		const textHeld = await cellRect(canvas, id, "r0c0");

		// Inward on both axes: the columns narrow, so the wrapped cell takes more
		// lines and the floor rises above the one the drag started under.
		await canvas.dragTransformHandle(
			"topLeft",
			canvas.toContent({ x: before.x + 140, y: before.y + 80 }),
			{ ctrl: true },
		);

		const after = await tableOutlineRect(canvas, id);
		expect(after.width).toBeLessThan(before.width - 100);
		expect((await cellRect(canvas, id, "r0c0")).height).toBeGreaterThan(
			textHeld.height,
		);
		expect(after.x + after.width).toBeCloseTo(before.x + before.width, 0);
		expect(after.y + after.height).toBeCloseTo(before.y + before.height, 0);
	});

	test("stops a bottom-edge drag at the rows' text, and shrinks once that text is gone", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await fillCell(canvas, id, "r0c0", WRAPPING_TEXT);
		const oneLine = await cellRect(canvas, id, "r1c0");
		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r0c0")).height))
			.toBeGreaterThan(Math.round(oneLine.height));
		const textHeld = await cellRect(canvas, id, "r0c0");

		// The last row given room of its own, so the shrink below has something to
		// take before it reaches the text. Selected by a cell so the strip is drawn.
		await canvas.selectAt(await cellCenter(canvas, id, "r0c1"));
		await expect(trailingEdgeStrip(canvas, "row")).toBeVisible();
		await dragClient(
			canvas,
			{ x: oneLine.x + oneLine.width / 2, y: oneLine.y + oneLine.height },
			{ x: 0, y: 60 },
		);
		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r1c0")).height))
			.toBe(Math.round(oneLine.height + 60));

		const before = await tableOutlineRect(canvas, id);
		await dragHeightHandleTo(canvas, "bottomCenter", before, before.y + 10);

		// Each row is down at what its text needs, and the table is no lower.
		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r1c0")).height))
			.toBe(Math.round(oneLine.height));
		const stopped = {
			leading: await cellRect(canvas, id, "r0c0"),
			box: await tableOutlineRect(canvas, id),
		};
		expect(stopped.leading.height).toBeCloseTo(textHeld.height, 0);
		expect(stopped.box.y).toBeCloseTo(before.y, 0);

		// A row landing at its floor stores no bound, so emptying the cell lets the
		// row fall to its one empty line.
		await canvas.selectAt(await cellCenter(canvas, id, "r1c1"));
		await canvas.clickAt(await cellCenter(canvas, id, "r0c0"));
		await canvas.deleteSelection();

		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r0c0")).height))
			.toBe(Math.round(oneLine.height));
		const cleared = await tableOutlineRect(canvas, id);
		expect(cleared.height).toBeLessThan(stopped.box.height);
		expect(cleared.y).toBeCloseTo(before.y, 0);
	});

	test("follows its text again once a bottom-edge drag has been taken back to the minimum", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await fillCell(canvas, id, "r0c0", WRAPPING_TEXT);
		const oneLine = await cellRect(canvas, id, "r1c0");
		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r0c0")).height))
			.toBeGreaterThan(Math.round(oneLine.height));
		await canvas.selectAt(await cellCenter(canvas, id, "r0c1"));

		// Down first, which gives every row a bound above its text, then back up
		// past where it started.
		const start = await tableOutlineRect(canvas, id);
		await dragHeightHandleTo(
			canvas,
			"bottomCenter",
			start,
			start.y + start.height + 100,
		);
		await expect
			.poll(async () => Math.round((await tableOutlineRect(canvas, id)).height))
			.toBe(Math.round(start.height + 100));
		const grown = await tableOutlineRect(canvas, id);
		await dragHeightHandleTo(canvas, "bottomCenter", grown, grown.y + 10);
		await expect
			.poll(async () => Math.round((await tableOutlineRect(canvas, id)).height))
			.toBe(Math.round(start.height));

		// Back at the minimum, no row stores a bound, so the cleared cell's row
		// falls to one line.
		await canvas.selectAt(await cellCenter(canvas, id, "r1c1"));
		await canvas.clickAt(await cellCenter(canvas, id, "r0c0"));
		await canvas.deleteSelection();

		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r0c0")).height))
			.toBe(Math.round(oneLine.height));
		const cleared = await tableOutlineRect(canvas, id);
		expect(cleared.height).toBeCloseTo(oneLine.height * 2, 0);
		expect(cleared.y).toBeCloseTo(start.y, 0);
	});
});

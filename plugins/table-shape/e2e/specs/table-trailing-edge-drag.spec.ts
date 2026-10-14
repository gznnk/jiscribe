import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import { cellRect, tableOutlineRect } from "../support/tableDom";

/**
 * Dragging the table's trailing edges — right and bottom on a table drawn without
 * flips — in a real browser. What only a browser answers is whether the strip lies
 * on the outline and takes the press, and whether the box comes out of the same
 * reducer tick as the resized track, the table growing from its own top-left
 * corner. The arithmetic is pinned by handleTableTrailingEdge.test.
 */

/** The strip on one trailing edge, by the `data-action` its control gives it. */
const trailingEdgeStrip = (canvas: CanvasDriver, axis: "column" | "row") =>
	canvas.page.locator(
		`[data-kind="control"][data-action="selection:table:trailingEdge:${axis}"]`,
	);

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

test.describe("table trailing edge drag", () => {
	test("widens the last column alone and the table with it from the right edge", async ({
		canvas,
	}) => {
		// Placed and left selected, which is when the controls are drawn. A fresh table is 2x2.
		const id = await canvas.placeShape("Table");
		await expect(trailingEdgeStrip(canvas, "column")).toBeVisible();

		const before = {
			leading: await cellRect(canvas, id, "r0c0"),
			last: await cellRect(canvas, id, "r0c1"),
			box: await tableOutlineRect(canvas, id),
		};

		// Halfway down the first row, clear of the width handle at mid-height.
		await dragClient(
			canvas,
			{
				x: before.last.x + before.last.width,
				y: before.last.y + before.last.height / 2,
			},
			{ x: 40, y: 0 },
		);

		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r0c1")).width))
			.toBe(Math.round(before.last.width + 40));
		// The content resizer kept the width the handler wrote instead of spreading
		// it back over the columns, and the table grew from its left edge.
		const after = {
			leading: await cellRect(canvas, id, "r0c0"),
			box: await tableOutlineRect(canvas, id),
		};
		expect(after.leading.width).toBeCloseTo(before.leading.width, 0);
		expect(after.box.width).toBeCloseTo(before.box.width + 40, 0);
		expect(after.box.x).toBeCloseTo(before.box.x, 0);
		expect(after.box.y).toBeCloseTo(before.box.y, 0);
	});

	test("heightens the last row alone from the bottom edge, and stops at its text going back up", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await expect(trailingEdgeStrip(canvas, "row")).toBeVisible();

		const before = {
			leading: await cellRect(canvas, id, "r0c0"),
			last: await cellRect(canvas, id, "r1c0"),
			box: await tableOutlineRect(canvas, id),
		};
		const edge = {
			x: before.last.x + before.last.width / 2,
			y: before.last.y + before.last.height,
		};
		await dragClient(canvas, edge, { x: 0, y: 30 });

		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r1c0")).height))
			.toBe(Math.round(before.last.height + 30));
		const grown = {
			leading: await cellRect(canvas, id, "r0c0"),
			box: await tableOutlineRect(canvas, id),
		};
		expect(grown.leading.height).toBeCloseTo(before.leading.height, 0);
		expect(grown.box.height).toBeCloseTo(before.box.height + 30, 0);
		expect(grown.box.y).toBeCloseTo(before.box.y, 0);
		expect(grown.box.x).toBeCloseTo(before.box.x, 0);

		// Back up past where it started: a fresh row stores no bound and is drawn at
		// its one empty line, so the edge stops there.
		await dragClient(canvas, { x: edge.x, y: edge.y + 30 }, { x: 0, y: -60 });

		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r1c0")).height))
			.toBe(Math.round(before.last.height));
		const shrunk = await tableOutlineRect(canvas, id);
		expect(shrunk.height).toBeCloseTo(before.box.height, 0);
		expect(shrunk.y).toBeCloseTo(before.box.y, 0);
	});
});

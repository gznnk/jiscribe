import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import { cellRect, tableOutlineRect } from "../support/tableDom";

/**
 * Dragging a boundary between two tracks, in a real browser. What only a browser
 * answers is whether the strip is where the rule is drawn and whether the hit
 * lands on it — the arithmetic behind the drag is pinned by the resolvers' unit
 * tests. The one thing asserted here that they cannot see is that the outer box
 * comes out of the same reducer tick as the rewritten tracks, which is what makes
 * a column drag leave the table's own edges alone.
 */

/** The strip for one boundary, by the `data-part` its control gives it. */
const boundaryStrip = (
	canvas: CanvasDriver,
	axis: "columnBoundary" | "rowBoundary",
	boundaryIndex: number,
) =>
	canvas.page.locator(
		`[data-kind="control"][data-part="selection:table:${axis}:${boundaryIndex}"]`,
	);

/** Drag from one client point to another, both converted into the driver's content coordinates. */
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

test.describe("table boundary drag", () => {
	test("makes two columns trade width without moving the table's own edges", async ({
		canvas,
	}) => {
		// Placed and left selected, which is when the controls are drawn.
		const id = await canvas.placeShape("Table");
		await expect(boundaryStrip(canvas, "columnBoundary", 0)).toBeVisible();
		// A 2x2 table has one inner boundary per axis, and no strip on its own edges.
		await expect(boundaryStrip(canvas, "columnBoundary", 1)).toHaveCount(0);

		const before = {
			leading: await cellRect(canvas, id, "r0c0"),
			trailing: await cellRect(canvas, id, "r0c1"),
			box: await tableOutlineRect(canvas, id),
		};

		// Grab the rule between the two columns, halfway down it.
		await dragClient(
			canvas,
			{
				x: before.leading.x + before.leading.width,
				y: before.leading.y + before.leading.height / 2,
			},
			{ x: 40, y: 0 },
		);

		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r0c0")).width))
			.toBe(Math.round(before.leading.width + 40));
		// The neighbour gave up exactly what the first column took, so the box the
		// content resizer re-derives is the box it already had.
		const after = {
			trailing: await cellRect(canvas, id, "r0c1"),
			box: await tableOutlineRect(canvas, id),
		};
		expect(after.trailing.width).toBeCloseTo(before.trailing.width - 40, 0);
		expect(after.box.width).toBeCloseTo(before.box.width, 0);
		expect(after.box.x).toBeCloseTo(before.box.x, 0);
	});

	test("grows the table rather than clipping a row already down at its text, then trades once the row has room", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await expect(boundaryStrip(canvas, "rowBoundary", 0)).toBeVisible();

		// Both rows of a fresh table store no bound, so each is drawn at exactly the
		// height its one empty line asks for and has nothing left to give.
		const before = {
			leading: await cellRect(canvas, id, "r0c0"),
			trailing: await cellRect(canvas, id, "r1c0"),
			box: await tableOutlineRect(canvas, id),
		};

		const boundary = {
			x: before.leading.x + before.leading.width / 2,
			y: before.leading.y + before.leading.height,
		};
		await dragClient(canvas, boundary, { x: 0, y: 20 });

		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r0c0")).height))
			.toBe(Math.round(before.leading.height + 20));
		const clamped = {
			trailing: await cellRect(canvas, id, "r1c0"),
			box: await tableOutlineRect(canvas, id),
		};
		// The row below the boundary stayed at its text, and the table took the drag.
		expect(clamped.trailing.height).toBeCloseTo(before.trailing.height, 0);
		expect(clamped.box.height).toBeCloseTo(before.box.height + 20, 0);
		expect(clamped.box.y).toBeCloseTo(before.box.y, 0);

		// That first drag left the lower row a bound 20px above its text, so dragging
		// back up is a plain trade: the rows swap the 20px and the table stands still.
		await dragClient(
			canvas,
			{ x: boundary.x, y: boundary.y + 20 },
			{
				x: 0,
				y: -20,
			},
		);

		await expect
			.poll(async () => Math.round((await cellRect(canvas, id, "r0c0")).height))
			.toBe(Math.round(before.leading.height));
		const traded = {
			trailing: await cellRect(canvas, id, "r1c0"),
			box: await tableOutlineRect(canvas, id),
		};
		expect(traded.trailing.height).toBeCloseTo(clamped.trailing.height + 20, 0);
		expect(traded.box.height).toBeCloseTo(clamped.box.height, 0);
	});
});

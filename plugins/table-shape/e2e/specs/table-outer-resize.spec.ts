import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import { cellRect, tableOutlineRect } from "../support/tableDom";

/**
 * Resizing a table by its own frame, in a real browser. A table stores no size,
 * so the handle writes a width that only the content resizer ever sees; what a
 * browser answers here is whether the two halves — the handle's write and the
 * grid re-derived from it — land on the same frame, so the dragged edge follows
 * the cursor instead of snapping back.
 *
 * The arithmetic of the distribution is pinned by
 * distributeTableWidthToColumns.test.
 */

/** Narrowest a column may be drawn, in local px (TABLE_MIN_COLUMN_WIDTH). */
const MIN_COLUMN_WIDTH = 24;

/** Handles a table must not offer: its height is its content's answer. */
const HEIGHT_HANDLES = [
	"topLeft",
	"topCenter",
	"topRight",
	"bottomLeft",
	"bottomCenter",
	"bottomRight",
] as const;

/** The strip for one column boundary, by the `data-part` its control gives it. */
const columnBoundaryStrip = (canvas: CanvasDriver, boundaryIndex: number) =>
	canvas.page.locator(
		`[data-kind="control"][data-part="selection:table:columnBoundary:${boundaryIndex}"]`,
	);

/**
 * Drag the table's right edge to a client x, keeping the pointer at the edge's own
 * height. Ctrl is held so the width that lands is the one that was asked for rather
 * than one a snap target moved.
 */
async function dragRightEdgeTo(
	canvas: CanvasDriver,
	box: { x: number; y: number; width: number; height: number },
	clientX: number,
): Promise<void> {
	await canvas.dragTransformHandle(
		"rightCenter",
		canvas.toContent({ x: clientX, y: box.y + box.height / 2 }),
		{ ctrl: true },
	);
}

test.describe("table outer resize", () => {
	test("offers the two handles that change the width and no others", async ({
		canvas,
	}) => {
		await canvas.placeShape("Table");

		for (const handle of ["leftCenter", "rightCenter"] as const) {
			await expect(
				canvas.page.locator(selectors.transformControl(handle)),
			).toBeVisible();
		}
		for (const handle of HEIGHT_HANDLES) {
			await expect(
				canvas.page.locator(selectors.transformControl(handle)),
			).toHaveCount(0);
		}
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

		await dragRightEdgeTo(
			canvas,
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
		await dragRightEdgeTo(canvas, before.box, before.box.x + 20);

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
});

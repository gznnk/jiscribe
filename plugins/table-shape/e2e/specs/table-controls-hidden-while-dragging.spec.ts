import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import { cellCenter, cornerGrip, trackGrip } from "../support/tableDom";

/**
 * A type's own selection controls are hidden while the object is moved or
 * resized, as the connection anchors are (SelectionControlsLayer), and kept
 * through a drag of one of the controls themselves. The core suite's harness
 * registers no type with selection controls, so the table's are what pin it.
 */

/** The strip for one column boundary, by the `data-action` its control gives it. */
const columnBoundaryStrip = (canvas: CanvasDriver, boundaryIndex: number) =>
	canvas.page.locator(
		`[data-kind="control"][data-action="selection:table:columnBoundary:${boundaryIndex}"]`,
	);

test.describe("table controls hidden while dragging", () => {
	test("hides the grips while the table is moved, and brings them back", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const rowGrip = trackGrip(canvas, "rowGrip", 0);
		const columnGrip = trackGrip(canvas, "columnGrip", 0);
		const corner = cornerGrip(canvas);
		await expect(rowGrip).toHaveCount(1);
		await expect(columnGrip).toHaveCount(1);
		await expect(corner).toHaveCount(1);

		const from = await cellCenter(canvas, id, "r0c0");
		await canvas.dragInspecting(
			from,
			{ x: from.x + 150, y: from.y + 100 },
			async () => {
				await expect(rowGrip).toHaveCount(0);
				await expect(columnGrip).toHaveCount(0);
				await expect(corner).toHaveCount(0);
			},
		);

		await expect(rowGrip).toHaveCount(1);
		await expect(columnGrip).toHaveCount(1);
		await expect(corner).toHaveCount(1);
	});

	test("hides them while the width handle is dragged", async ({ canvas }) => {
		await canvas.placeShape("Table");
		const grip = trackGrip(canvas, "columnGrip", 0);
		const handle = await canvas.page
			.locator(selectors.transformControl("rightCenter"))
			.boundingBox();
		if (handle === null) {
			throw new Error("no width handle");
		}
		const handleCenter = canvas.toContent({
			x: handle.x + handle.width / 2,
			y: handle.y + handle.height / 2,
		});

		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: handleCenter.x + 80, y: handleCenter.y },
			{
				inspect: async () => {
					await expect(grip).toHaveCount(0);
				},
			},
		);

		await expect(grip).toHaveCount(1);
	});

	test("keeps them while one of them, a column boundary, is dragged", async ({
		canvas,
	}) => {
		await canvas.placeShape("Table");
		const grip = trackGrip(canvas, "columnGrip", 0);
		const strip = await columnBoundaryStrip(canvas, 0).boundingBox();
		if (strip === null) {
			throw new Error("no boundary strip");
		}
		const from = canvas.toContent({
			x: strip.x + strip.width / 2,
			y: strip.y + strip.height / 2,
		});

		await canvas.dragInspecting(
			from,
			{ x: from.x + 40, y: from.y },
			async () => {
				await expect(grip).toHaveCount(1);
			},
		);

		await expect(grip).toHaveCount(1);
	});
});

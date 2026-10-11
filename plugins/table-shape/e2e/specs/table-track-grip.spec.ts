import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCenter,
	clickTrackGrip,
	drawnTextWeight,
	selectionOutlines,
	tableOutlineRect,
	trackGrip,
} from "../support/tableDom";

/**
 * How far a transform handle reaches outside the edge it sits on, in client px
 * (the theme's `anchorRadius`). A grip has to start beyond it, the selection
 * controls being drawn over the transform ones.
 */
const HANDLE_REACH = 4;

/**
 * How far each end of a grip stops short of its track's boundary, in client px:
 * the insert badge's radius (5) plus 3 px of clearance.
 */
const GRIP_END_INSET = 8;

/**
 * The grips that select a whole row or a whole column, in a real browser. Two
 * things only a browser answers: that the bars stand outside the table without
 * covering the width handles that sit on its edges, and that a click on one
 * reaches the control at all — the grips take clicks where every other control of
 * this shape takes drags.
 *
 * What the selection then *means* is the point of it: a track is selected as its
 * own kind, not as the cells it covers, which is what lets Delete remove a row
 * where the same cells picked as cells would only be emptied.
 */

/** The grip's resolved fill, which is inverted while its track is the selected part. */
async function gripFill(
	canvas: CanvasDriver,
	axis: "rowGrip" | "columnGrip",
	trackIndex: number,
): Promise<string> {
	return trackGrip(canvas, axis, trackIndex).evaluate(
		(grip) => getComputedStyle(grip).fill,
	);
}

test.describe("table track grips", () => {
	test("offers one grip per row and per column, and none past the grid", async ({
		canvas,
	}) => {
		// Placed and left selected, which is when the controls are drawn.
		await canvas.placeShape("Table");

		// A fresh table is 2x2.
		await expect(trackGrip(canvas, "rowGrip", 0)).toBeVisible();
		await expect(trackGrip(canvas, "rowGrip", 1)).toBeVisible();
		await expect(trackGrip(canvas, "rowGrip", 2)).toHaveCount(0);
		await expect(trackGrip(canvas, "columnGrip", 0)).toBeVisible();
		await expect(trackGrip(canvas, "columnGrip", 1)).toBeVisible();
		await expect(trackGrip(canvas, "columnGrip", 2)).toHaveCount(0);
	});

	test("stands outside the table, clear of the handles on its edges", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const box = await tableOutlineRect(canvas, id);

		const rowGrip = await trackGrip(canvas, "rowGrip", 0).boundingBox();
		const columnGrip = await trackGrip(canvas, "columnGrip", 0).boundingBox();
		if (rowGrip === null || columnGrip === null) {
			throw new Error("no grips drawn");
		}

		// Wholly outside the table's own edges, and past the width handle's reach,
		// so a press on one never lands on the other.
		expect(rowGrip.x + rowGrip.width).toBeLessThan(box.x - HANDLE_REACH);
		expect(columnGrip.y + columnGrip.height).toBeLessThan(box.y - HANDLE_REACH);
	});

	test("stops short of both its boundaries, leaving room for the insert badges", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const box = await tableOutlineRect(canvas, id);

		const columnGrip = await trackGrip(canvas, "columnGrip", 0).boundingBox();
		if (columnGrip === null) {
			throw new Error("no grip drawn");
		}

		// A fresh table's columns are each half its width. Its rows are too short
		// to spend the full inset, which is capped at a quarter of the track, so
		// only a column pins it.
		expect(
			Math.abs(columnGrip.width - (box.width / 2 - 2 * GRIP_END_INSET)),
		).toBeLessThanOrEqual(1);
	});

	test("selects the whole row a grip stands for, and draws the grip selected", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const unselectedFill = await gripFill(canvas, "rowGrip", 1);

		await clickTrackGrip(canvas, "rowGrip", 1);

		const outlines = await selectionOutlines(canvas);
		// The table's own box, then the band the row covers: the full width, half
		// the height, sitting on the lower half.
		expect(outlines).toHaveLength(2);
		expect(outlines[1].width).toBeCloseTo(outlines[0].width, 6);
		expect(outlines[1].height).toBeCloseTo(outlines[0].height / 2, 6);
		expect(outlines[1].y).toBeCloseTo(
			outlines[0].y + outlines[0].height / 2,
			6,
		);

		expect(await gripFill(canvas, "rowGrip", 1)).not.toBe(unselectedFill);
		// The other grip of the strip is left as it was.
		expect(await gripFill(canvas, "rowGrip", 0)).toBe(unselectedFill);
		// The table itself stays the object selection, so its outline is still there.
		expect((await canvas.captureObjects()).some((o) => o.id === id)).toBe(true);
	});

	test("selects a whole column, replacing a row selection rather than adding to it", async ({
		canvas,
	}) => {
		await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "rowGrip", 0);
		await clickTrackGrip(canvas, "columnGrip", 1);

		const outlines = await selectionOutlines(canvas);
		expect(outlines).toHaveLength(2);
		expect(outlines[1].width).toBeCloseTo(outlines[0].width / 2, 6);
		expect(outlines[1].height).toBeCloseTo(outlines[0].height, 6);
		expect(outlines[1].x).toBeCloseTo(outlines[0].x + outlines[0].width / 2, 6);
	});

	test("puts the width handles away while a track is the operated target", async ({
		canvas,
	}) => {
		await canvas.placeShape("Table");
		await expect(
			canvas.page.locator(selectors.transformControl("leftCenter")),
		).toBeVisible();

		await clickTrackGrip(canvas, "columnGrip", 0);

		await expect(
			canvas.page.locator(selectors.transformControl("leftCenter")),
		).toHaveCount(0);
	});

	test("changes nothing about the document, a grip being a way to select", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const before = await tableOutlineRect(canvas, id);

		await clickTrackGrip(canvas, "rowGrip", 0);

		const after = await tableOutlineRect(canvas, id);
		expect(after).toEqual(before);
	});

	test("styles the cells of the picked row alone", async ({ canvas }) => {
		const id = await canvas.placeShape("Table");
		for (const [cellId, text] of [
			["r0c0", "top left"],
			["r0c1", "top right"],
			["r1c0", "bottom left"],
		] as const) {
			await canvas.typeTextAt(await cellCenter(canvas, id, cellId), text);
			await canvas.commitText();
		}
		await canvas.selectAt(await cellCenter(canvas, id, "r1c1"));

		await clickTrackGrip(canvas, "rowGrip", 0);
		await canvas.setTextFormat("fontWeight", "bold");

		await expect.poll(() => drawnTextWeight(canvas, "top left")).toBe("700");
		await expect.poll(() => drawnTextWeight(canvas, "top right")).toBe("700");
		expect(await drawnTextWeight(canvas, "bottom left")).toBe("400");
	});
});

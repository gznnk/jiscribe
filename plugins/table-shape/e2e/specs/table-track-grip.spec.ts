import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCenter,
	clickTrackGrip,
	drawnTextWeight,
	partOutlineRects,
	tableOutlineRect,
	trackGrip,
	trackGripFace,
	trackGripLabel,
} from "../support/tableDom";

/**
 * How far a transform handle reaches outside the edge it sits on, in client px
 * (the theme's `anchorRadius`). A grip's pressable region has to stop beyond
 * it, the selection controls being drawn over the transform ones.
 */
const HANDLE_REACH = 4;

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
	return trackGripFace(canvas, axis, trackIndex).evaluate(
		(face) => getComputedStyle(face).fill,
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

	test("heads each track as a spreadsheet does, rows numbered and columns lettered", async ({
		canvas,
	}) => {
		await canvas.placeShape("Table");

		for (const [axis, trackIndex, label] of [
			["rowGrip", 0, "1"],
			["rowGrip", 1, "2"],
			["columnGrip", 0, "A"],
			["columnGrip", 1, "B"],
		] as const) {
			await expect(trackGripLabel(canvas, axis, trackIndex)).toHaveText(label);
		}
	});

	test("abuts the table, with only the pressable region kept off the width handle", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const box = await tableOutlineRect(canvas, id);

		const rowFace = await trackGripFace(canvas, "rowGrip", 0).boundingBox();
		const rowGrip = await trackGrip(canvas, "rowGrip", 0).boundingBox();
		const columnFace = await trackGripFace(
			canvas,
			"columnGrip",
			0,
		).boundingBox();
		const columnGrip = await trackGrip(canvas, "columnGrip", 0).boundingBox();
		if (
			rowFace === null ||
			rowGrip === null ||
			columnFace === null ||
			columnGrip === null
		) {
			throw new Error("no grips drawn");
		}

		// The drawn cells run up to the table's edges, as a sheet's headings do.
		expect(Math.abs(rowFace.x + rowFace.width - box.x)).toBeLessThanOrEqual(1);
		expect(
			Math.abs(columnFace.y + columnFace.height - box.y),
		).toBeLessThanOrEqual(1);
		// The left edge carries a width handle, so the row grip's pressable region
		// stops short of its reach; the top edge carries none and the column's
		// reaches the edge.
		expect(rowGrip.x + rowGrip.width).toBeLessThanOrEqual(box.x - HANDLE_REACH);
		expect(
			Math.abs(columnGrip.y + columnGrip.height - box.y),
		).toBeLessThanOrEqual(1);
	});

	test("runs the length of its track, meeting the next grip at the boundary", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const box = await tableOutlineRect(canvas, id);

		const columnGrip = await trackGrip(canvas, "columnGrip", 0).boundingBox();
		const nextGrip = await trackGrip(canvas, "columnGrip", 1).boundingBox();
		if (columnGrip === null || nextGrip === null) {
			throw new Error("no grip drawn");
		}

		// A fresh table's columns are each half its width.
		expect(Math.abs(columnGrip.width - box.width / 2)).toBeLessThanOrEqual(1);
		expect(
			Math.abs(nextGrip.x - (columnGrip.x + columnGrip.width)),
		).toBeLessThanOrEqual(1);
	});

	test("selects the whole row a grip stands for, and draws the grip selected", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const unselectedFill = await gripFill(canvas, "rowGrip", 1);

		await clickTrackGrip(canvas, "rowGrip", 1);

		const table = await tableOutlineRect(canvas, id);
		const outlines = await partOutlineRects(canvas);
		// The band the row covers: the full width, half the height, sitting on the
		// lower half.
		expect(outlines).toHaveLength(1);
		expect(outlines[0].width).toBeCloseTo(table.width, 0);
		expect(outlines[0].height).toBeCloseTo(table.height / 2, 0);
		expect(outlines[0].y).toBeCloseTo(table.y + table.height / 2, 0);

		expect(await gripFill(canvas, "rowGrip", 1)).not.toBe(unselectedFill);
		// The other grip of the strip is left as it was.
		expect(await gripFill(canvas, "rowGrip", 0)).toBe(unselectedFill);
		// The table itself stays the object selection.
		expect((await canvas.captureObjects()).some((o) => o.id === id)).toBe(true);
	});

	test("selects a whole column, replacing a row selection rather than adding to it", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		await clickTrackGrip(canvas, "rowGrip", 0);
		await clickTrackGrip(canvas, "columnGrip", 1);

		const table = await tableOutlineRect(canvas, id);
		const outlines = await partOutlineRects(canvas);
		expect(outlines).toHaveLength(1);
		expect(outlines[0].width).toBeCloseTo(table.width / 2, 0);
		expect(outlines[0].height).toBeCloseTo(table.height, 0);
		expect(outlines[0].x).toBeCloseTo(table.x + table.width / 2, 0);
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

import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

import {
	cellCenter,
	cellCount,
	clickTrackGrip,
	cornerGrip,
	drawnTextWeight,
	fillCell,
	isResizeHandleOnTop,
	partOutlineRects,
	pressInsertTrack,
	selectedCellIds,
	tableOutlineRect,
	trackGrip,
	trackGripFace,
	trackGripLabel,
} from "../support/tableDom";

/**
 * The grips that select a whole row or a whole column, in a real browser. Two
 * things only a browser answers: that the bars stand outside the table without
 * hiding the resize handles at the middle of its left and top edges, and that a
 * click on one reaches the control at all — the grips take clicks where every
 * other control of this shape takes drags.
 *
 * What the selection then *means* is the point of it: a track is selected as its
 * own kind, not as the cells it covers, which is what lets Delete remove a row
 * where the same cells picked as cells would only be emptied.
 */

/** The grip's resolved fill, which is tinted while its track is the selected part. */
async function gripFill(
	canvas: CanvasDriver,
	axis: "rowGrip" | "columnGrip",
	trackIndex: number,
): Promise<string> {
	return trackGripFace(canvas, axis, trackIndex).evaluate(
		(face) => getComputedStyle(face).fill,
	);
}

/** Clicks the corner grip at its middle, with `modifier` held when given. */
async function clickCornerGrip(
	canvas: CanvasDriver,
	modifier?: "shift" | "ctrl",
): Promise<void> {
	const box = await cornerGrip(canvas).boundingBox();
	if (box === null) {
		throw new Error("no corner grip");
	}
	const point = canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
	if (modifier === "shift") {
		await canvas.shiftClickAt(point);
	} else if (modifier === "ctrl") {
		await canvas.ctrlClickAt(point);
	} else {
		await canvas.clickAt(point);
	}
}

/** The corner grip's resolved fill, read off the drawn rect behind the pressable one. */
async function cornerGripFill(canvas: CanvasDriver): Promise<string> {
	return cornerGrip(canvas)
		.locator("xpath=preceding-sibling::*[local-name()='rect'][1]")
		.evaluate((face) => getComputedStyle(face).fill);
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

	test("abuts the table, pressable up to the edge, and leaves the resize handles on top", async ({
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

		// The drawn cells and the pressable regions both run up to the table's
		// edges, as a sheet's headings do.
		expect(Math.abs(rowFace.x + rowFace.width - box.x)).toBeLessThanOrEqual(1);
		expect(
			Math.abs(columnFace.y + columnFace.height - box.y),
		).toBeLessThanOrEqual(1);
		expect(Math.abs(rowGrip.x + rowGrip.width - box.x)).toBeLessThanOrEqual(1);
		expect(
			Math.abs(columnGrip.y + columnGrip.height - box.y),
		).toBeLessThanOrEqual(1);

		// The resize handles on the left and top edges overlap the grips, and are
		// drawn over them.
		expect(await isResizeHandleOnTop(canvas, "leftCenter")).toBe(true);
		expect(await isResizeHandleOnTop(canvas, "topCenter")).toBe(true);
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

	test("puts the resize handles away while a track is the operated target", async ({
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
		await canvas.pressBold();

		await expect.poll(() => drawnTextWeight(canvas, "top left")).toBe("700");
		await expect.poll(() => drawnTextWeight(canvas, "top right")).toBe("700");
		expect(await drawnTextWeight(canvas, "bottom left")).toBe("400");
	});

	test("runs a pick of rows from the one picked to the one Shift-clicked", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		// Read before the insertions, which run from a picked row.
		const unselectedFill = await gripFill(canvas, "rowGrip", 0);
		// Four rows, each insertion adding one below the picked last row.
		await clickTrackGrip(canvas, "rowGrip", 1);
		await pressInsertTrack(canvas, "ArrowDown");
		await pressInsertTrack(canvas, "ArrowDown");
		await expect.poll(async () => cellCount(canvas, id)).toBe(8);

		await clickTrackGrip(canvas, "rowGrip", 0);
		await clickTrackGrip(canvas, "rowGrip", 2, "shift");

		await expect
			.poll(async () => (await partOutlineRects(canvas)).length)
			.toBe(3);
		for (const trackIndex of [0, 1, 2]) {
			expect(await gripFill(canvas, "rowGrip", trackIndex)).not.toBe(
				unselectedFill,
			);
		}
		expect(await gripFill(canvas, "rowGrip", 3)).toBe(unselectedFill);

		// The anchor stays where the pick began, so a second Shift-click narrows it.
		await clickTrackGrip(canvas, "rowGrip", 1, "shift");

		await expect
			.poll(async () => (await partOutlineRects(canvas)).length)
			.toBe(2);
		expect(await gripFill(canvas, "rowGrip", 2)).toBe(unselectedFill);
	});

	test("adds a column to the pick with Ctrl, and takes it back out", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const unselectedFill = await gripFill(canvas, "columnGrip", 0);
		await clickTrackGrip(canvas, "columnGrip", 1);
		await pressInsertTrack(canvas, "ArrowRight");
		await expect.poll(async () => cellCount(canvas, id)).toBe(6);

		await clickTrackGrip(canvas, "columnGrip", 0);
		await clickTrackGrip(canvas, "columnGrip", 2, "ctrl");

		await expect
			.poll(async () => (await partOutlineRects(canvas)).length)
			.toBe(2);
		expect(await gripFill(canvas, "columnGrip", 0)).not.toBe(unselectedFill);
		expect(await gripFill(canvas, "columnGrip", 1)).toBe(unselectedFill);
		expect(await gripFill(canvas, "columnGrip", 2)).not.toBe(unselectedFill);

		await clickTrackGrip(canvas, "columnGrip", 0, "ctrl");

		await expect
			.poll(async () => (await partOutlineRects(canvas)).length)
			.toBe(1);
		expect(await gripFill(canvas, "columnGrip", 0)).toBe(unselectedFill);
		expect(await gripFill(canvas, "columnGrip", 2)).not.toBe(unselectedFill);
	});

	test.describe("corner grip", () => {
		test("sits where the row and column headings meet, as thick as they are", async ({
			canvas,
		}) => {
			await canvas.placeShape("Table");

			const corner = await cornerGrip(canvas).boundingBox();
			const rowGrip = await trackGrip(canvas, "rowGrip", 0).boundingBox();
			const columnGrip = await trackGrip(canvas, "columnGrip", 0).boundingBox();
			if (corner === null || rowGrip === null || columnGrip === null) {
				throw new Error("no grips drawn");
			}

			expect(Math.abs(corner.x - rowGrip.x)).toBeLessThanOrEqual(1);
			expect(Math.abs(corner.width - rowGrip.width)).toBeLessThanOrEqual(1);
			expect(
				Math.abs(corner.x + corner.width - columnGrip.x),
			).toBeLessThanOrEqual(1);
			expect(Math.abs(corner.y - columnGrip.y)).toBeLessThanOrEqual(1);
			expect(Math.abs(corner.height - columnGrip.height)).toBeLessThanOrEqual(
				1,
			);
			expect(
				Math.abs(corner.y + corner.height - rowGrip.y),
			).toBeLessThanOrEqual(1);
		});

		test("picks every cell as cells, and is never drawn selected", async ({
			canvas,
		}) => {
			const id = await canvas.placeShape("Table");
			const unselectedCornerFill = await cornerGripFill(canvas);
			const unselectedGripFill = await gripFill(canvas, "rowGrip", 0);

			await clickCornerGrip(canvas);

			await expect
				.poll(async () => (await selectedCellIds(canvas, id)).sort())
				.toEqual(["r0c0", "r0c1", "r1c0", "r1c1"]);
			expect(await cornerGripFill(canvas)).toBe(unselectedCornerFill);
			// A pick of cells, not of tracks: no heading lights up.
			expect(await gripFill(canvas, "rowGrip", 0)).toBe(unselectedGripFill);
			expect(await gripFill(canvas, "columnGrip", 0)).toBe(unselectedGripFill);

			// A second click, modified or not, leaves the pick as it is.
			await clickCornerGrip(canvas);
			await clickCornerGrip(canvas, "shift");
			expect((await selectedCellIds(canvas, id)).sort()).toEqual([
				"r0c0",
				"r0c1",
				"r1c0",
				"r1c1",
			]);
		});

		test("treats a Ctrl-click as a plain one, replacing a row pick", async ({
			canvas,
		}) => {
			const id = await canvas.placeShape("Table");
			await clickTrackGrip(canvas, "rowGrip", 0);

			await clickCornerGrip(canvas, "ctrl");

			await expect
				.poll(async () => (await selectedCellIds(canvas, id)).sort())
				.toEqual(["r0c0", "r0c1", "r1c0", "r1c1"]);
		});

		test("lets Delete clear every cell's text and keep the grid", async ({
			canvas,
		}) => {
			const id = await canvas.placeShape("Table");
			await fillCell(canvas, id, "r0c0", "first cell");
			await fillCell(canvas, id, "r1c1", "last cell");
			await canvas.selectAt(await cellCenter(canvas, id, "r0c1"));

			await clickCornerGrip(canvas);
			await canvas.deleteSelection();

			await expect(canvas.page.getByText("first cell")).toHaveCount(0);
			await expect(canvas.page.getByText("last cell")).toHaveCount(0);
			expect(await cellCount(canvas, id)).toBe(4);
			expect(
				(await canvas.captureObjects()).some((object) => object.id === id),
			).toBe(true);
		});
	});
});

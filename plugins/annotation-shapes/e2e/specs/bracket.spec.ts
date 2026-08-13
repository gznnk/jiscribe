import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

const BRACKET_TIP_HANDLE =
	'[data-kind="control"][data-part="selection:bracket:tip"]';
const STEM_TIP_HANDLE =
	'[data-kind="control"][data-part="selection:bracketWithStem:tip"]';

/** Reads the d attribute of the given marker's path. */
async function markerPathD(
	canvas: CanvasDriver,
	id: string,
): Promise<string | null> {
	return canvas.page.evaluate((objectId) => {
		const el = document.querySelector(`[data-id="${objectId}"] path`);
		return el?.getAttribute("d") ?? null;
	}, id);
}

/**
 * The two square brackets, which differ from the brace in what their tip handle
 * is allowed to write back:
 * - `bracket` has no tipPosition at all, so its handle only ever re-attaches the
 *   marker to another edge
 * - `bracketWithStem` moves its stem along the edge like the brace's cusp, and
 *   the stem is a second sub-path rather than a detour along the spine
 *
 * Both are drawn out of the annotation category flyout, which is where the
 * plugin's three shapes live once there is more than one of them.
 */
test.describe("bracket", () => {
	test("creates a g element from a drag out of the annotation flyout", async ({
		canvas,
	}) => {
		const id = await canvas.drawShapeFromFlyout(
			"annotation",
			"bracket",
			{ x: 400, y: 200 },
			{ x: 430, y: 400 },
		);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		// The bracket root is <g data-kind="object"> (path plus its grab areas).
		expect(created?.tag).toBe("g");
		// 30x200 box drawn tall, so the spine runs down the left edge (x = -15)
		// with a foot at each end reaching the other one.
		expect(await markerPathD(canvas, id)).toBe(
			"M 15 -100 L -15 -100 L -15 100 L 15 100",
		);
	});

	test("draws the label beyond the spine, outside the box", async ({
		canvas,
	}) => {
		await canvas.drawShapeFromFlyout(
			"annotation",
			"bracket",
			{ x: 400, y: 200 },
			{ x: 430, y: 400 },
		);
		await canvas.deselect();

		// The label anchor of a left bracket is mid-way down the left edge;
		// double-clicking the box opens the editor for the body slot.
		await canvas.typeTextAt({ x: 415, y: 300 }, "doc layer");
		await canvas.commitText();

		await expect
			.poll(() => canvas.page.evaluate(() => document.body.textContent ?? ""))
			.toContain("doc layer");
	});

	test("keeps the bracket still when its handle is dragged along the edge", async ({
		canvas,
	}) => {
		const id = await canvas.drawShapeFromFlyout(
			"annotation",
			"bracket",
			{ x: 400, y: 200 },
			{ x: 430, y: 400 },
		);
		await expect(canvas.page.locator(BRACKET_TIP_HANDLE)).toBeVisible();
		const before = await markerPathD(canvas, id);

		// The same drag that moves a brace's tip a quarter down its edge: x stays
		// the dominant axis, so the edge is kept and there is nothing else to write.
		await canvas.drag({ x: 400, y: 300 }, { x: 250, y: 250 });

		expect(await markerPathD(canvas, id)).toBe(before);
	});

	test("re-attaches the bracket to another edge when dragged across the axis", async ({
		canvas,
	}) => {
		const id = await canvas.drawShapeFromFlyout(
			"annotation",
			"bracket",
			{ x: 400, y: 200 },
			{ x: 430, y: 400 },
		);
		await expect(canvas.page.locator(BRACKET_TIP_HANDLE)).toBeVisible();

		// Straight up from the center: y becomes dominant, so the spine moves to
		// the top edge. The box is deliberately left as it was, so the marker comes
		// out squat until it is resized.
		await canvas.drag({ x: 400, y: 300 }, { x: 415, y: 120 });

		await expect
			.poll(async () => markerPathD(canvas, id), {
				message: "the spine lands on the top edge",
			})
			.toBe("M -15 100 L -15 -100 L 15 -100 L 15 100");
	});
});

test.describe("bracketWithStem", () => {
	test("draws the stem as a second sub-path out to the outer edge", async ({
		canvas,
	}) => {
		const id = await canvas.drawShapeFromFlyout(
			"annotation",
			"bracketWithStem",
			{ x: 400, y: 200 },
			{ x: 430, y: 400 },
		);
		// The spine is inset to x = 0 so the stem has room to run out to x = -15.
		expect(await markerPathD(canvas, id)).toBe(
			"M 15 -100 L 0 -100 L 0 100 L 15 100 M 0 0 L -15 0",
		);
	});

	test("moves the stem along the spine when the handle is dragged", async ({
		canvas,
	}) => {
		const id = await canvas.drawShapeFromFlyout(
			"annotation",
			"bracketWithStem",
			{ x: 400, y: 200 },
			{ x: 430, y: 400 },
		);
		await expect(canvas.page.locator(STEM_TIP_HANDLE)).toBeVisible();

		// Well left of the box so x stays the dominant axis: the edge is kept and
		// only the stem moves, to a quarter down (local y = -50).
		await canvas.drag({ x: 400, y: 300 }, { x: 250, y: 250 });

		await expect
			.poll(async () => markerPathD(canvas, id), {
				message: "the stem follows the moved tip",
			})
			.toBe("M 15 -100 L 0 -100 L 0 100 L 15 100 M 0 -50 L -15 -50");
	});
});

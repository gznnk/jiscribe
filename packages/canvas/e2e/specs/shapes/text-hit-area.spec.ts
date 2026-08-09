import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Guards what a `text` object claims of the pointer. Its box is the extent of
 * the longest line, so a short line leaves blank space to its right that the
 * object must not take: the hit area is one band per line (calcTextLineHitRects),
 * all of them children of the single `[data-kind]` group.
 *
 * The two cases here are the two halves of that bargain — the blank side falls
 * through to whatever is underneath, and the glyphs themselves still pick up.
 */

/** A long first line and a one-character second, so the blank right side is wide. */
const LONG_LINE = "a fairly long first line";
const SHORT_LINE = "b";

/** Rectangle laid under the text, well clear of the viewport edges and of EMPTY_SPOT. */
const UNDERLYING_RECT = {
	from: { x: 150, y: 500 },
	to: { x: 600, y: 700 },
};

/** Where the text's top-left corner is dragged to, so its whole box sits over the rectangle. */
const TEXT_CORNER = { x: 200, y: 540 };

/** How far the text is dragged once picked up by its glyphs. */
const DRAG_DELTA = { x: 60, y: -40 };

/** Slack allowed on a dragged position: snapping to a nearby edge moves a shape by a few pixels. */
const SNAP_TOLERANCE = 8;

/** Font size a freshly placed text object carries (TEXT_DOC_DEFAULTS). */
const DEFAULT_FONT_SIZE = 16;

/** Line height the text is both drawn and measured with (TEXT_LINE_HEIGHT). */
const TEXT_LINE_HEIGHT = 1.5;

/** The text's box in content coordinates: the union of its hit bands. */
type TextBox = { left: number; top: number; width: number; height: number };

/**
 * Reads the box off the hit group. The group carries no width/height of its own
 * (it is a `g`), so the box is the rendered union of the bands underneath it.
 */
async function textBoxOf(canvas: CanvasDriver, id: string): Promise<TextBox> {
	const screenBox = await canvas.page.evaluate((objectId) => {
		const group = document.querySelector(
			`[data-kind="object"][data-id="${objectId}"]`,
		);
		if (!group) {
			throw new Error(`no text object with data-id ${objectId}`);
		}
		const { left, top, width, height } = group.getBoundingClientRect();
		return { left, top, width, height };
	}, id);

	const corner = canvas.toContent({ x: screenBox.left, y: screenBox.top });
	return {
		left: corner.x,
		top: corner.y,
		width: screenBox.width,
		height: screenBox.height,
	};
}

/** Number of hit bands the text draws; one per line that has something to pick. */
function hitBandsOf(canvas: CanvasDriver, id: string) {
	return canvas.page.locator(`[data-kind="object"][data-id="${id}"] > rect`);
}

/** A point on the glyphs of the first line, `offsetX` in from the box's left edge. */
const firstLinePoint = (
	box: TextBox,
	offsetX: number,
): { x: number; y: number } => ({
	x: box.left + offsetX,
	y: box.top + (DEFAULT_FONT_SIZE * TEXT_LINE_HEIGHT) / 2,
});

/** A point on the second line's row, at the far right of the box — past its single character. */
const secondLineBlankPoint = (box: TextBox): { x: number; y: number } => ({
	x: box.left + box.width - 20,
	y: box.top + DEFAULT_FONT_SIZE * TEXT_LINE_HEIGHT * 1.5,
});

/** The `e` / `f` of a shape's transform matrix: the center it is drawn around. */
async function centerOf(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }> {
	const transform = await canvas.objectById(id).getAttribute("transform");
	const matrix = /matrix\(([^)]*)\)/.exec(transform ?? "");
	if (!matrix) {
		throw new Error(`object ${id} carries no transform matrix`);
	}
	const [, , , , cx, cy] = matrix[1].split(",").map(Number);
	return { x: cx, y: cy };
}

/**
 * Draws a rectangle, drops a two-line text on top of it, and drags the text
 * fully inside the rectangle. Returns both ids and the text's box after the move.
 */
async function layTextOverRect(canvas: CanvasDriver): Promise<{
	rectId: string;
	textId: string;
	textBox: TextBox;
}> {
	const rectId = await canvas.drawShape(
		"Rectangle",
		UNDERLYING_RECT.from,
		UNDERLYING_RECT.to,
	);
	await canvas.deselect();

	// Placed after the rectangle, so the text is the one in front.
	const textId = await canvas.placeShape("Text");
	await canvas.deselect();

	const placed = await textBoxOf(canvas, textId);
	await canvas.replaceTextAt(
		{ x: placed.left + placed.width / 2, y: placed.top + placed.height / 2 },
		`${LONG_LINE}\n${SHORT_LINE}`,
	);
	await canvas.commitText();
	await expect
		.poll(async () => hitBandsOf(canvas, textId).count(), {
			message: "the committed text has one hit band per line",
		})
		.toBe(2);

	const committed = await textBoxOf(canvas, textId);
	const grip = firstLinePoint(committed, 20);
	await canvas.drag(grip, {
		x: grip.x + (TEXT_CORNER.x - committed.left),
		y: grip.y + (TEXT_CORNER.y - committed.top),
	});
	// Containment rather than the exact corner: a drag over another shape may be
	// pulled a few pixels by snapping, and only "wholly over it" is load-bearing.
	await expect
		.poll(
			async () => {
				const moved = await textBoxOf(canvas, textId);
				return (
					moved.left >= UNDERLYING_RECT.from.x &&
					moved.top >= UNDERLYING_RECT.from.y &&
					moved.left + moved.width <= UNDERLYING_RECT.to.x &&
					moved.top + moved.height <= UNDERLYING_RECT.to.y
				);
			},
			{ message: "the text lands wholly over the rectangle" },
		)
		.toBe(true);
	await canvas.deselect();

	return { rectId, textId, textBox: await textBoxOf(canvas, textId) };
}

test.describe("text hit area", () => {
	test("lets the blank right of a short line through to the shape underneath", async ({
		canvas,
	}) => {
		const { rectId, textId, textBox } = await layTextOverRect(canvas);

		// Inside the text's box, on the second line's row, past its one character.
		await canvas.clickAt(secondLineBlankPoint(textBox));

		// The rectangle is resizable and the text is not, so the handles say which
		// of the two the click landed on.
		await expect
			.poll(async () => await canvas.visibleControlIds(), {
				message: "the click selects the shape under the blank side",
			})
			.toContain("transform/resize:bottomRight");

		// Decisive: what the click selected is what deleting removes.
		await canvas.deleteSelection();
		await expect
			.poll(async () => (await canvas.captureObjects()).map((obj) => obj.id))
			.toEqual([textId]);
		expect(await canvas.captureObjects()).not.toContainEqual(
			expect.objectContaining({ id: rectId }),
		);
	});

	test("picks up the text on its glyphs and moves it with the drag", async ({
		canvas,
	}) => {
		const { rectId, textId, textBox } = await layTextOverRect(canvas);
		const rectCenter = await centerOf(canvas, rectId);

		await canvas.clickAt(firstLinePoint(textBox, 10));

		// A text object has a rotation handle but no resize handles, which the
		// rectangle underneath would have brought. Polled: the handles are a React
		// update behind the click.
		await expect
			.poll(async () => await canvas.visibleControlIds(), {
				message: "the click on the glyphs selects the text",
			})
			.toContain("transform/rotation");
		expect(
			(await canvas.visibleControlIds()).filter((descriptor) =>
				descriptor.startsWith("transform/resize:"),
			),
		).toEqual([]);

		const before = await centerOf(canvas, textId);
		// Started 30px further along the line than the click, so the two are never
		// coalesced into a double click (300ms / 5px).
		const grip = firstLinePoint(textBox, 40);
		await canvas.drag(grip, {
			x: grip.x + DRAG_DELTA.x,
			y: grip.y + DRAG_DELTA.y,
		});

		await expect
			.poll(async () => (await centerOf(canvas, textId)).x, {
				message: "the text follows the drag",
			})
			.toBeGreaterThan(before.x);

		// The delta is checked to within the snap tolerance: the text is dragged
		// over another shape, whose edges may pull it a few pixels.
		const moved = await centerOf(canvas, textId);
		expect(Math.abs(moved.x - (before.x + DRAG_DELTA.x))).toBeLessThanOrEqual(
			SNAP_TOLERANCE,
		);
		expect(Math.abs(moved.y - (before.y + DRAG_DELTA.y))).toBeLessThanOrEqual(
			SNAP_TOLERANCE,
		);
		// The shape underneath stayed put, so the drag moved the text alone.
		expect(await centerOf(canvas, rectId)).toEqual(rectCenter);
	});
});

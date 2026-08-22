import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Guards the editor half of a height that follows the text: a document leaving
 * `height` out is drawn at the height its text needs, the ObjectMenu switch turns
 * that off and on, and a resize handle that can move the bottom edge settles the
 * height while the side handles leave it to the text.
 *
 * The doc is injected through the harness hook rather than drawn: a toolbar
 * gesture always produces a height, so the omission is a state no drag can reach.
 */

/** Width the injected shape stores, and therefore the width its text wraps at. */
const SHAPE_WIDTH = 240;

/** Left edge and top edge of the injected shape, in content coordinates. */
const SHAPE_X = 200;
const SHAPE_Y = 160;

/** Font size the injected text carries. */
const FONT_SIZE = 14;

/** Line height the text is drawn and measured with (TEXT_LINE_HEIGHT). */
const TEXT_LINE_HEIGHT = 1.5;

/** Vertical padding the box adds, top and bottom together (TEXT_BOX_PADDING_Y). */
const TEXT_BOX_PADDING_Y = 4;

const docText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "auto",
			type: "rect",
			x: SHAPE_X,
			y: SHAPE_Y,
			width: SHAPE_WIDTH,
			fontSize: FONT_SIZE,
			text: "This label is one authored line with no breaks of its own, so every line it is drawn on comes from the width the shape is at.",
		},
	],
});

async function loadDoc(canvas: CanvasDriver) {
	await canvas.page.evaluate((text) => {
		const hook = (
			window as unknown as { __setHarnessDoc?: (docText: string) => void }
		).__setHarnessDoc;
		if (!hook) {
			throw new Error(
				"__setHarnessDoc is undefined (harness hook not installed)",
			);
		}
		hook(text);
	}, docText);
	await expect(canvas.objectById("auto")).toHaveCount(1);
}

/** The box the shape is drawn at, straight off the rect's own attributes. */
async function boxOf(
	canvas: CanvasDriver,
): Promise<{ width: number; height: number }> {
	return canvas.page.evaluate(() => {
		const element = document.querySelector('[data-id="auto"]');
		if (!element) {
			throw new Error("the injected shape is not on the canvas");
		}
		return {
			width: Number(element.getAttribute("width")),
			height: Number(element.getAttribute("height")),
		};
	});
}

/** Select the shape by clicking a point inside it, whatever height it is at. */
async function selectShape(canvas: CanvasDriver) {
	await canvas.selectAt({ x: SHAPE_X + SHAPE_WIDTH / 2, y: SHAPE_Y + 10 });
}

/** The height a box holding `lineCount` lines is drawn at. */
const boxHeightFor = (lineCount: number): number =>
	lineCount * FONT_SIZE * TEXT_LINE_HEIGHT + TEXT_BOX_PADDING_Y;

/** The auto-height switch, found by the label it carries in each of its two states. */
const autoHeightSwitch = (canvas: CanvasDriver) =>
	canvas.page.locator(selectors.objectMenuCommand("toggleAutoHeight"));

test.describe("a height that follows the text", () => {
	test("draws a shape stating no height at the height its text needs", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		const box = await boxOf(canvas);

		expect(box.width).toBe(SHAPE_WIDTH);
		// Several lines at this width, so the box is taller than one line by the
		// very breaks the width forces.
		expect(box.height).toBeGreaterThan(boxHeightFor(1));
		// Whole line boxes: the height is the wrapped lines and the padding, nothing else.
		const lineCount =
			(box.height - TEXT_BOX_PADDING_Y) / (FONT_SIZE * TEXT_LINE_HEIGHT);
		expect(lineCount).toBe(Math.round(lineCount));
	});

	test("re-wraps on a side handle and settles on a bottom one", async ({
		canvas,
	}) => {
		await loadDoc(canvas);
		await selectShape(canvas);
		const before = await boxOf(canvas);

		// Widening leaves the height to the text, which now takes fewer lines.
		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: SHAPE_X + 520, y: SHAPE_Y + before.height / 2 },
			{ ctrl: true },
		);
		const widened = await boxOf(canvas);
		expect(widened.width).toBeGreaterThan(before.width);
		expect(widened.height).toBeLessThan(before.height);

		// Dragging the bottom edge is the user stating a height, so the shape keeps
		// the dragged one and stops re-wrapping.
		await canvas.dragTransformHandle(
			"bottomCenter",
			{ x: SHAPE_X + 260, y: SHAPE_Y + 300 },
			{ ctrl: true },
		);
		const dragged = await boxOf(canvas);
		expect(dragged.height).toBeGreaterThan(widened.height);

		await canvas.dragTransformHandle(
			"leftCenter",
			{ x: SHAPE_X - 200, y: SHAPE_Y + dragged.height / 2 },
			{ ctrl: true },
		);
		const settled = await boxOf(canvas);
		expect(settled.width).toBeGreaterThan(dragged.width);
		expect(settled.height).toBe(dragged.height);
	});

	test("switches the height off and on from the object menu", async ({
		canvas,
	}) => {
		await loadDoc(canvas);
		await selectShape(canvas);
		const auto = await boxOf(canvas);

		const toggle = autoHeightSwitch(canvas);
		await expect(toggle).toBeVisible();
		await expect(toggle).toHaveAttribute(
			"title",
			"Stop Fitting Height to Text",
		);

		// Switched off, the shape keeps the height it was drawn at and no longer
		// follows the text when the width changes.
		await toggle.click();
		await expect(toggle).toHaveAttribute("title", "Fit Height to Text");
		expect((await boxOf(canvas)).height).toBe(auto.height);
		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: SHAPE_X + 520, y: SHAPE_Y + auto.height / 2 },
			{ ctrl: true },
		);
		const fixed = await boxOf(canvas);
		expect(fixed.width).toBeGreaterThan(auto.width);
		expect(fixed.height).toBe(auto.height);

		// Switched back on, the box shrinks to what the text now needs at that width.
		await toggle.click();
		await expect(toggle).toHaveAttribute(
			"title",
			"Stop Fitting Height to Text",
		);
		expect((await boxOf(canvas)).height).toBeLessThan(fixed.height);
	});
});

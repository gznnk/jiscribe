import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Guards the block layout of the `text` shape: the doc stores a `width`, the text
 * wraps inside it, and the height alone is measured back from the wrapped lines.
 * The label layout is the other half of that bargain and is covered by
 * shapes/text.spec.
 *
 * The doc is injected through the harness hook rather than drawn, the layout
 * being a field no toolbar gesture can produce.
 */

/** Width the block text stores, and therefore the width its box must keep. */
const BLOCK_WIDTH = 240;

/** Line height the text is drawn and measured with (TEXT_LINE_HEIGHT). */
const TEXT_LINE_HEIGHT = 1.5;

/** Vertical padding the box adds, top and bottom together (TEXT_BOX_PADDING_Y). */
const TEXT_BOX_PADDING_Y = 4;

/** Font size the injected text carries. */
const FONT_SIZE = 14;

const docText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "block-text",
			type: "text",
			x: 120,
			y: 120,
			textLayout: "block",
			width: BLOCK_WIDTH,
			fontSize: FONT_SIZE,
			text: "This paragraph is authored as one line with no newlines in it at all, so every break it is drawn with comes from the width the document stores.",
		},
	],
});

/** Left edge and top edge of the label text the switch is exercised on. */
const LABEL_X = 120;
const LABEL_Y = 200;

/**
 * The other half of the switch's input: a text carrying no layout at all, whose
 * box is therefore measured from the text in both directions. Short enough that
 * the box it is measured into leaves room to drag its right edge inward.
 */
const labelDocText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "label-text",
			type: "text",
			x: LABEL_X,
			y: LABEL_Y,
			fontSize: FONT_SIZE,
			text: "A caption of a handful of words, authored as one line.",
		},
	],
});

async function loadDoc(
	canvas: CanvasDriver,
	text = docText,
	id = "block-text",
) {
	await canvas.page.evaluate((docJson) => {
		const hook = (
			window as unknown as { __setHarnessDoc?: (docText: string) => void }
		).__setHarnessDoc;
		if (!hook) {
			throw new Error(
				"__setHarnessDoc is undefined (harness hook not installed)",
			);
		}
		hook(docJson);
	}, text);
	await expect(canvas.objectById(id)).toHaveCount(1);
}

/**
 * The box the object's state holds and the box the text is actually drawn in.
 * The state's box comes off the foreignObject's attributes (local px, which
 * `TextOverlay` takes straight from the state); the drawn one is the content
 * element's own rect (screen px), which is what the browser laid the wrapped
 * text out into. The hit bands cannot stand in for either: each caps its width
 * at the line it covers, and the box is wider than every wrapped line.
 */
async function overlayBoxOf(
	canvas: CanvasDriver,
	id = "block-text",
): Promise<{
	width: number;
	height: number;
	screenLeft: number;
	screenTop: number;
	screenWidth: number;
	screenHeight: number;
	drawnHeight: number;
}> {
	return canvas.page.evaluate((objectId) => {
		const group = document.querySelector(`[data-id="${objectId}"]`);
		let sibling = group?.nextElementSibling ?? null;
		while (sibling && sibling.tagName !== "foreignObject") {
			sibling = sibling.nextElementSibling;
		}
		if (!sibling) {
			throw new Error("no text overlay beside the block text");
		}
		const content = sibling.querySelector("div > div");
		if (!content) {
			throw new Error("the text overlay holds no content element");
		}
		const box = sibling.getBoundingClientRect();
		return {
			width: Number(sibling.getAttribute("width")),
			height: Number(sibling.getAttribute("height")),
			screenLeft: box.left,
			screenTop: box.top,
			screenWidth: box.width,
			screenHeight: box.height,
			drawnHeight: content.getBoundingClientRect().height,
		};
	}, id);
}

/** Width the open editor lays its text out in, in screen px. */
async function editorSurfaceWidthOf(canvas: CanvasDriver): Promise<number> {
	return canvas.page.evaluate((editorSelector) => {
		const surface = document.querySelector<HTMLElement>(
			`${editorSelector} [contenteditable="true"]`,
		);
		if (!surface) {
			throw new Error("no editable surface while editing");
		}
		// The surface reserves a scrollbar gutter outside the shape, so the width
		// the text wraps in is its client box. The rect carries the canvas zoom and
		// the layout widths do not, so the gutter is taken off as a ratio.
		return (
			(surface.getBoundingClientRect().width * surface.clientWidth) /
			surface.offsetWidth
		);
	}, selectors.textEditor);
}

/** Height of a box holding `lineCount` lines at the injected font size. */
const expectedBoxHeight = (lineCount: number): number =>
	lineCount * FONT_SIZE * TEXT_LINE_HEIGHT + TEXT_BOX_PADDING_Y;

test.describe("text block layout", () => {
	test("wraps in the stored width and takes its height from the wrapped lines", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		const box = await overlayBoxOf(canvas);

		expect(box.width).toBe(BLOCK_WIDTH);
		// A line long enough to need several breaks at this width, so the box is
		// taller than one line by the very breaks the width forces.
		expect(box.height).toBeGreaterThan(expectedBoxHeight(1));
		// Whole line boxes: the height is the sum of the wrapped lines, nothing else.
		const lineCount =
			(box.height - TEXT_BOX_PADDING_Y) / (FONT_SIZE * TEXT_LINE_HEIGHT);
		expect(lineCount).toBe(Math.round(lineCount));
		// The measured box is the box the browser laid the text out into, which is
		// the whole point of measuring the wrapping rather than guessing at it.
		expect(box.drawnHeight).toBeCloseTo(box.screenHeight, 0);
	});

	test("grows downward while typing, the width and the top-left staying put", async ({
		canvas,
	}) => {
		await loadDoc(canvas);
		const placed = await overlayBoxOf(canvas);

		// A point inside the first line's hit band; the doc coordinate is the drawn
		// top-left of the text.
		await canvas.typeTextAt({ x: 140, y: 130 }, " ");
		// The editor replaces the overlay while it is open, so the width it wraps in
		// is what says the edited text breaks where the committed one will.
		expect(await editorSurfaceWidthOf(canvas)).toBeCloseTo(
			placed.screenWidth,
			0,
		);
		await canvas.page.keyboard.type(
			"One more sentence, long enough to need a line of its own.",
		);
		await canvas.commitText();

		const committed = await overlayBoxOf(canvas);

		expect(committed.width).toBe(BLOCK_WIDTH);
		expect(committed.height).toBeGreaterThan(placed.height);
		expect(committed.screenLeft).toBeCloseTo(placed.screenLeft, 0);
		expect(committed.screenTop).toBeCloseTo(placed.screenTop, 0);
		expect(committed.drawnHeight).toBeCloseTo(committed.screenHeight, 0);
	});
});

/** The layout switch, found by the label it carries in each of its two states. */
const layoutSwitch = (canvas: CanvasDriver) =>
	canvas.page.locator(selectors.objectMenuCommand("toggleTextLayout"));

/** A point inside the label text's first line, which is where it is clicked. */
const LABEL_POINT = { x: LABEL_X + 20, y: LABEL_Y + 10 };

test.describe("the switch between the two layouts", () => {
	test("wraps a measured text in the width it is already drawn at", async ({
		canvas,
	}) => {
		await loadDoc(canvas, labelDocText, "label-text");
		await canvas.selectAt(LABEL_POINT);
		const measured = await overlayBoxOf(canvas, "label-text");

		const toggle = layoutSwitch(canvas);
		await expect(toggle).toHaveAttribute("title", "Wrap Text in Fixed Width");

		// The box does not move: the width it was measured into is the width it is
		// now told to wrap in.
		await toggle.click();
		await expect(toggle).toHaveAttribute("title", "Fit Width to Text");
		const wrapped = await overlayBoxOf(canvas, "label-text");
		expect(wrapped.width).toBeCloseTo(measured.width, 1);
		expect(wrapped.height).toBeCloseTo(measured.height, 1);

		// Only the two handles that change that width are offered.
		await expect(
			canvas.page.locator(selectors.transformControl("rightCenter")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.transformControl("leftCenter")),
		).toBeVisible();
		for (const handle of ["bottomRight", "bottomCenter", "topLeft"] as const) {
			await expect(
				canvas.page.locator(selectors.transformControl(handle)),
			).toHaveCount(0);
		}

		// Dragging the right edge inward re-wraps, and the height follows the lines.
		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: LABEL_X + wrapped.width / 2, y: LABEL_Y + wrapped.height / 2 },
			{ ctrl: true },
		);
		const narrowed = await overlayBoxOf(canvas, "label-text");
		expect(narrowed.width).toBeLessThan(wrapped.width);
		expect(narrowed.height).toBeGreaterThan(wrapped.height);
		expect(narrowed.drawnHeight).toBeCloseTo(narrowed.screenHeight, 0);

		// Switched back, the box shrinks to the longest line again — the width it
		// was dragged to was the wrap's, not the text's.
		await toggle.click();
		await expect(toggle).toHaveAttribute("title", "Wrap Text in Fixed Width");
		const remeasured = await overlayBoxOf(canvas, "label-text");
		expect(remeasured.width).toBeCloseTo(measured.width, 1);
		expect(remeasured.height).toBeCloseTo(measured.height, 1);
	});

	test("edits at the width it was just given", async ({ canvas }) => {
		await loadDoc(canvas, labelDocText, "label-text");
		await canvas.selectAt(LABEL_POINT);
		await layoutSwitch(canvas).click();
		const wrapped = await overlayBoxOf(canvas, "label-text");

		await canvas.typeTextAt(LABEL_POINT, " ");

		// The editor replaces the overlay while it is open, so the width it wraps in
		// is what says the edited text breaks where the committed one will.
		expect(await editorSurfaceWidthOf(canvas)).toBeCloseTo(
			wrapped.screenWidth,
			0,
		);
		await canvas.page.keyboard.type(
			"One more sentence, long enough to need a line of its own.",
		);
		await canvas.commitText();

		const committed = await overlayBoxOf(canvas, "label-text");

		expect(committed.width).toBeCloseTo(wrapped.width, 1);
		expect(committed.height).toBeGreaterThan(wrapped.height);
		expect(committed.screenLeft).toBeCloseTo(wrapped.screenLeft, 0);
		expect(committed.screenTop).toBeCloseTo(wrapped.screenTop, 0);
	});
});

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
	await expect(canvas.objectById("block-text")).toHaveCount(1);
}

/**
 * The box the object's state holds and the box the text is actually drawn in.
 * The state's box comes off the foreignObject's attributes (local px, which
 * `TextOverlay` takes straight from the state); the drawn one is the content
 * element's own rect (screen px), which is what the browser laid the wrapped
 * text out into. The hit bands cannot stand in for either: each caps its width
 * at the line it covers, and the box is wider than every wrapped line.
 */
async function overlayBoxOf(canvas: CanvasDriver): Promise<{
	width: number;
	height: number;
	screenLeft: number;
	screenTop: number;
	screenWidth: number;
	screenHeight: number;
	drawnHeight: number;
}> {
	return canvas.page.evaluate(() => {
		const group = document.querySelector('[data-id="block-text"]');
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
	});
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

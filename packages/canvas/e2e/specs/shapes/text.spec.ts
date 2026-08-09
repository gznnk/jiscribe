import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Guards the core bargain of the `text` shape: the doc stores a top-left corner
 * and nothing else, and the box is measured back from the text every time it
 * changes. So the checks here are all about the box — that it reaches the drawn
 * width of a long line, that it gains a line height per newline, that it tracks
 * the uncommitted text and font size, and that it grows right and down only.
 *
 * The single element carrying `data-kind="object"` is the group of invisible hit
 * bands, one per drawn line. Their union spans the measured box — the first and
 * last band carry the vertical padding, and the longest line's band is the box's
 * full width — so every box reading comes off that group.
 */

/** Vertical padding the measured box adds, top and bottom together (calcTextBlockSize). */
const TEXT_BOX_PADDING_Y = 4;

/** Line height the text is both drawn and measured with (TEXT_LINE_HEIGHT). */
const TEXT_LINE_HEIGHT = 1.5;

/** Font size a freshly placed text object carries (TEXT_DOC_DEFAULTS). */
const DEFAULT_FONT_SIZE = 16;

/** Height of a box holding `lineCount` lines at `fontSize`. */
const expectedBoxHeight = (lineCount: number, fontSize: number): number =>
	lineCount * fontSize * TEXT_LINE_HEIGHT + TEXT_BOX_PADDING_Y;

/** The measured box in content coordinates: `left`/`top` are the corner the doc stores. */
type TextBox = { left: number; top: number; width: number; height: number };

/**
 * Reads the box off the hit-band group. `getBBox` gives the union of the bands
 * in the group's own frame, which is centred on the object, and the matrix
 * carries that centre. Bands are laid out from the box's top-left, so the union
 * is the box itself — except for text so short the minimum width wins, which no
 * test here uses.
 */
async function textBoxOf(canvas: CanvasDriver, id: string): Promise<TextBox> {
	return canvas.page.evaluate((objectId) => {
		const group = document.querySelector<SVGGraphicsElement>(
			`[data-kind="object"][data-id="${objectId}"]`,
		);
		if (!group) {
			throw new Error(`no text object with data-id ${objectId}`);
		}
		const bbox = group.getBBox();
		const matrix = /matrix\(([^)]*)\)/.exec(
			group.getAttribute("transform") ?? "",
		);
		if (!matrix) {
			throw new Error(`text object ${objectId} carries no transform matrix`);
		}
		const [, , , , cx, cy] = matrix[1].split(",").map(Number);
		return {
			left: cx + bbox.x,
			top: cy + bbox.y,
			width: bbox.width,
			height: bbox.height,
		};
	}, id);
}

/**
 * The element the text is drawn in: `foreignObject > wrapper > content`, the
 * foreignObject being a sibling of the hit-band group (the type renders a fragment).
 */
const TEXT_CONTENT_FROM_HIT_GROUP = (objectId: string): string =>
	`[data-kind="object"][data-id="${objectId}"] ~ foreignObject > div > div`;

/** The text as drawn; null while the editor has replaced the overlay. */
async function drawnTextOf(
	canvas: CanvasDriver,
	id: string,
): Promise<string | null> {
	return canvas.page.evaluate(
		(selector) => document.querySelector(selector)?.textContent ?? null,
		TEXT_CONTENT_FROM_HIT_GROUP(id),
	);
}

/**
 * Line boxes the drawn text occupies. The overlay is `white-space: pre-wrap`, so
 * a box narrower than the text wraps rather than overflows — counting the line
 * boxes of a range over the content is what catches that.
 */
async function drawnLineCount(
	canvas: CanvasDriver,
	id: string,
): Promise<number> {
	return canvas.page.evaluate((selector) => {
		const content = document.querySelector(selector);
		if (!content) {
			throw new Error(`no drawn text for selector ${selector}`);
		}
		const range = document.createRange();
		range.selectNodeContents(content);
		return range.getClientRects().length;
	}, TEXT_CONTENT_FROM_HIT_GROUP(id));
}

/** Center of a box, for aiming a double click at the object. */
const centerOf = (box: TextBox): { x: number; y: number } => ({
	x: box.left + box.width / 2,
	y: box.top + box.height / 2,
});

/** Replaces the whole body and commits, returning the box the commit landed on. */
async function rewriteText(
	canvas: CanvasDriver,
	id: string,
	text: string,
): Promise<TextBox> {
	await canvas.replaceTextAt(centerOf(await textBoxOf(canvas, id)), text);
	await canvas.commitText();
	await expect
		.poll(() => drawnTextOf(canvas, id), {
			message: "the committed text is the one that was typed",
		})
		.toBe(text);
	return textBoxOf(canvas, id);
}

test.describe("text", () => {
	test("places a text object from the toolbar, carrying the default word", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Text");

		// The type draws no shape of its own, so its one data-kind element is the
		// group holding the per-line hit bands.
		const created = (await canvas.captureObjects()).find(
			(object) => object.id === id,
		);
		expect(created?.tag).toBe("g");

		expect(await drawnTextOf(canvas, id)).toBe("Text");

		const box = await textBoxOf(canvas, id);
		expect(box.height).toBeCloseTo(expectedBoxHeight(1, DEFAULT_FONT_SIZE));
	});

	test("widens the box to a long line instead of wrapping or clipping it", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Text");
		const placed = await textBoxOf(canvas, id);
		await canvas.deselect();

		const longLine =
			"a single line long enough that any fixed width would have to break it";
		const grown = await rewriteText(canvas, id, longLine);

		// Roughly one line's worth of characters against four, so the box has to be
		// several times wider; the exact width belongs to the font, not to the test.
		expect(grown.width).toBeGreaterThan(placed.width * 4);
		expect(await drawnLineCount(canvas, id)).toBe(1);
		expect(grown.height).toBeCloseTo(expectedBoxHeight(1, DEFAULT_FONT_SIZE));
	});

	test("gains one line height per newline and keeps the width of the longest line", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Text");
		await canvas.deselect();

		// Identical lines, so any width change would come from the line count
		// rather than from one line being wider than another.
		const oneLine = await rewriteText(canvas, id, "line");
		const twoLines = await rewriteText(canvas, id, "line\nline");
		const threeLines = await rewriteText(canvas, id, "line\nline\nline");

		const lineHeight = DEFAULT_FONT_SIZE * TEXT_LINE_HEIGHT;
		expect(twoLines.height - oneLine.height).toBeCloseTo(lineHeight);
		expect(threeLines.height - twoLines.height).toBeCloseTo(lineHeight);
		expect(twoLines.width).toBeCloseTo(oneLine.width);
		expect(threeLines.width).toBeCloseTo(oneLine.width);
	});

	test("tracks the box to every keystroke, so committing moves nothing", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Text");
		const placed = await textBoxOf(canvas, id);
		await canvas.deselect();

		// The editor opens with the caret at the end, so this extends "Text".
		await canvas.typeTextAt(centerOf(placed), " keeps growing");
		await expect
			.poll(async () => (await textBoxOf(canvas, id)).width, {
				message: "the box widens while the edit is still open",
			})
			.toBeGreaterThan(placed.width);
		const halfTyped = await textBoxOf(canvas, id);

		await canvas.page.keyboard.type(" and growing");
		await expect
			.poll(async () => (await textBoxOf(canvas, id)).width)
			.toBeGreaterThan(halfTyped.width);
		const beforeCommit = await textBoxOf(canvas, id);

		await canvas.commitText();

		// The uncommitted box was already the measured one, so the commit is a no-op
		// for geometry: nothing jumps at the moment the editor closes.
		const committed = await textBoxOf(canvas, id);
		expect(committed.width).toBeCloseTo(beforeCommit.width);
		expect(committed.height).toBeCloseTo(beforeCommit.height);
	});

	test("grows right and down only, holding the top-left corner", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Text");
		const placed = await textBoxOf(canvas, id);
		await canvas.deselect();

		const grown = await rewriteText(
			canvas,
			id,
			"a wider first line\nand a second one below it",
		);

		expect(grown.width).toBeGreaterThan(placed.width);
		expect(grown.height).toBeGreaterThan(placed.height);
		expect(grown.left).toBeCloseTo(placed.left);
		expect(grown.top).toBeCloseTo(placed.top);
	});

	test("shows the selection outline and the rotation handle but no resize handles", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Text");
		// Placing selects the object, so the controls are already up.

		const controlIds = await canvas.visibleControlIds();
		expect(controlIds).toContain("transform/rotation");
		expect(
			controlIds.filter((descriptor) =>
				descriptor.startsWith("transform/resize:"),
			),
		).toEqual([]);

		// The outline is decoration with pointerEvents: none and no data-kind, so it
		// is counted rather than asserted visible, and matched against the box.
		const outlines = canvas.page.locator(
			'[data-layer="selection-overlay"] rect',
		);
		await expect(outlines).toHaveCount(1);
		const box = await textBoxOf(canvas, id);
		expect(Number(await outlines.getAttribute("width"))).toBeCloseTo(box.width);
		expect(Number(await outlines.getAttribute("height"))).toBeCloseTo(
			box.height,
		);
	});

	test("re-measures the box when the font size is committed", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Text");
		const placed = await textBoxOf(canvas, id);

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 40);

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontSize)
			.toBe("40px");
		const resized = await textBoxOf(canvas, id);
		expect(resized.height).toBeCloseTo(expectedBoxHeight(1, 40));
		expect(resized.width).toBeGreaterThan(placed.width);
		expect(await drawnLineCount(canvas, id)).toBe(1);
	});

	test("tracks the box to the font size while the slider is still held", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Text");
		await canvas.openObjectMenu("font-size");

		const slider = canvas.page.locator(selectors.objectMenuSlider("fontSize"));
		await expect(slider).toBeVisible();
		const sliderBox = await slider.boundingBox();
		if (!sliderBox) {
			throw new Error("cannot read the position of the fontSize slider");
		}
		// boundingBox is screen coordinates, which is what page.mouse takes.
		const sliderY = sliderBox.y + sliderBox.height / 2;
		const sliderX = sliderBox.x + sliderBox.width / 2;

		await canvas.page.mouse.move(sliderX, sliderY);
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(sliderX + 40, sliderY, { steps: 10 });

			// Uncommitted: what the slider previewed has to be measured too, or the
			// box would clip its own text until the drag ends.
			await expect
				.poll(async () => (await canvas.textStyleOf(id))?.fontSize, {
					message: "the drag previews a font size other than the default",
				})
				.not.toBe(`${DEFAULT_FONT_SIZE}px`);
			const previewFontSize = Number.parseFloat(
				(await canvas.textStyleOf(id))?.fontSize ?? "",
			);
			expect(previewFontSize).toBeGreaterThan(DEFAULT_FONT_SIZE);
			expect((await textBoxOf(canvas, id)).height).toBeCloseTo(
				expectedBoxHeight(1, previewFontSize),
			);
		} finally {
			await canvas.page.mouse.up();
		}
	});
});

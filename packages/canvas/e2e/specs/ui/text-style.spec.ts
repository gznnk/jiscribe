import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * When the text styles of the ObjectMenu (font size, text color, bold, alignment)
 * change, the rendering of the TextOverlay drawn on top of the shape follows.
 *
 * These all run through the common path "menu operation -> property update -> reducer
 * -> re-render". The existing suite watches colors, dash types and corner radius but
 * never touched fonts, which is what this fills in.
 */
test.describe("text styling through the ObjectMenu", () => {
	/** Draws a rect with text in it, restores the selection and returns its data-id */
	async function drawLabeledRect(canvas: CanvasDriver): Promise<string> {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 180 },
			{ x: 640, y: 360 },
		);
		await canvas.typeTextAt({ x: 520, y: 270 }, "Label");
		await canvas.commitText();
		// commitText clicks empty space and deselects, so select again
		await canvas.selectAt({ x: 520, y: 270 });
		return id;
	}

	test("puts the text area offset on transform instead of x/y (against the 1px flicker while resizing)", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		// Chromium rasterizes the HTML of a foreignObject at "the box position rounded to
		// integers". The area offset (-height/2 ...) and the shape's translate (center)
		// both contain height/2 and their sum is constant, but rounding only one of them
		// breaks the cancellation and makes the text flicker by 1px while resizing.
		// Folding the offset into transform settles the sum before rounding, so x/y have
		// to stay 0.
		const box = await canvas.page.evaluate((objectId) => {
			const fo = document
				.querySelector(`[data-id="${objectId}"]`)
				?.parentElement?.querySelector("foreignObject");
			return fo ? { x: fo.getAttribute("x"), y: fo.getAttribute("y") } : null;
		}, id);
		expect(box).toEqual({ x: "0", y: "0" });
	});

	test("follows the font size change in the rendered text", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		const before = await canvas.textStyleOf(id);
		expect(before).not.toBeNull();
		expect(before?.fontSize).not.toBe("40px");

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 40);

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontSize)
			.toBe("40px");
	});

	test("follows the font family change in the rendered text", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		const before = await canvas.textStyleOf(id);
		// The theme's family, which is the sans entry, until the menu says otherwise.
		expect(before?.fontFamily).toContain("Source Sans 3");

		await canvas.openObjectMenu("font-family");
		await canvas.page.click(selectors.objectMenuFont("mono"));

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontFamily)
			.toContain("Source Code Pro");
	});

	test("follows the text color change in the rendered text", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		await canvas.setColor("font-color", "#e11d48");

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.color)
			.toBe(await canvas.normalizeColor("#e11d48"));
	});

	test("sets font-weight to bold with the Bold toggle and back to normal on a second press", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		await canvas.setTextFormat("fontWeight", "bold");
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontWeight)
			.toBe("700");

		// On a second press the button's data-part flips to the normal side, which clears it.
		await canvas.setTextFormat("fontWeight", "normal");
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontWeight)
			.toBe("400");
	});

	test("sets font-style to italic with the Italic toggle and back to normal on a second press", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		await canvas.setTextFormat("fontStyle", "italic");
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontStyle)
			.toBe("italic");

		await canvas.setTextFormat("fontStyle", "normal");
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontStyle)
			.toBe("normal");
	});

	test("sets text-decoration to underline with the Underline toggle and back to none on a second press", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		await canvas.setTextFormat("textDecoration", "underline");
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.textDecoration)
			.toBe("underline");

		await canvas.setTextFormat("textDecoration", "none");
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.textDecoration)
			.toBe("none");
	});

	test("keeps the underline while the strikethrough is toggled on and off", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		await canvas.setTextFormat("textDecoration", "underline");
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.textDecoration)
			.toBe("underline");

		// With the underline on, the strikethrough button writes both lines at once.
		await canvas.setTextFormat("textDecoration", "underline line-through");
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.textDecoration)
			.toBe("underline line-through");

		// Turning the strikethrough back off leaves the underline standing.
		await canvas.setTextFormat("textDecoration", "underline");
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.textDecoration)
			.toBe("underline");
	});

	test("follows text-align when the horizontal alignment is set to right", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		const before = await canvas.textStyleOf(id);
		expect(before?.textAlign).not.toBe("right");

		await canvas.openObjectMenu("alignment");
		await canvas.page.click(selectors.objectMenuSet("textAlign", "right"));

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.textAlign)
			.toBe("right");
	});

	test("follows text-align when the horizontal alignment switches between left and center", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		// The default rendering is center. Set left first to check center->left.
		expect((await canvas.textStyleOf(id))?.textAlign).toBe("center");

		await canvas.openObjectMenu("alignment");
		await canvas.page.click(selectors.objectMenuSet("textAlign", "left"));
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.textAlign)
			.toBe("left");

		// The section stays open, so center can follow right away (checks left->center too).
		await canvas.page.click(selectors.objectMenuSet("textAlign", "center"));
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.textAlign)
			.toBe("center");
	});

	test("follows the wrapper's align-items when the vertical alignment is set to top", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		// The default is middle (align-items: center).
		expect((await canvas.textStyleOf(id))?.verticalAlign).not.toBe(
			"flex-start",
		);

		await canvas.setVerticalAlign("top");

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.verticalAlign)
			.toBe("flex-start");
	});

	test("follows the wrapper's align-items when the vertical alignment is set to bottom", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		expect((await canvas.textStyleOf(id))?.verticalAlign).not.toBe("flex-end");

		await canvas.setVerticalAlign("bottom");

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.verticalAlign)
			.toBe("flex-end");
	});

	test("reverts a font size change on undo and reapplies it on redo", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		const original = (await canvas.textStyleOf(id))?.fontSize;
		expect(original).toBeTruthy();
		expect(original).not.toBe("40px");

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 40);
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontSize)
			.toBe("40px");

		await canvas.undo();
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontSize)
			.toBe(original);

		await canvas.redo();
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontSize)
			.toBe("40px");
	});
});

import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * Gesture regressions around text editing, as e2e.
 * Verifies regressions around text editing driven by data-gesture
 * (none / native-wheel). For the spec, see
 * packages/canvas/docs/04-gesture-system.md.
 * Commit (1-9) and Escape cancel (1-10) are already covered by
 * editing/text-edit.spec.ts.
 */
test.describe("gesture behavior during text editing", () => {
	const RECT_FROM = { x: 400, y: 200 };
	const RECT_TO = { x: 600, y: 320 };
	const CENTER = { x: 500, y: 260 };

	test("1-1 focuses the editing surface and puts the caret at the end when editing starts", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.deselect();
		await canvas.typeTextAt(CENTER, "Hi");
		await canvas.commitText();

		// Reopening gives focus with the caret at the end (length 2).
		await canvas.page.mouse.dblclick(CENTER.x, CENTER.y);
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();

		expect(await canvas.isTextEditorFocused()).toBe(true);
		expect(await canvas.textEditorSelection()).toEqual({ start: 2, end: 2 });
		await canvas.cancelText();
	});

	test("1-2 keeps the configured vertical alignment while editing", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.setVerticalAlign("top");
		await canvas.deselect();

		await canvas.typeTextAt(CENTER, "aligned");

		expect(await canvas.textEditorVerticalAlign()).toBe("top");
		await canvas.cancelText();
	});

	test("1-3 selects text without moving the shape when dragging inside the editing surface", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.deselect();
		await canvas.typeTextAt(CENTER, "HelloWorld");

		const transformBefore = await canvas
			.objectById(id)
			.getAttribute("transform");

		const box = await canvas.textEditorSurface().boundingBox();
		if (!box) {
			throw new Error("cannot read the position of the editing surface");
		}
		// box is in screen coordinates; drag takes content coordinates, so convert
		// with toContent.
		const y = box.y + box.height / 2;
		await canvas.drag(
			canvas.toContent({ x: box.x + 6, y }),
			canvas.toContent({ x: box.x + box.width - 6, y }),
			10,
		);

		// The shape has not moved.
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			transformBefore,
		);
		// The text is selected (the range is not empty).
		const selection = await canvas.textEditorSelection();
		expect(selection).not.toBeNull();
		expect(selection?.start).not.toBe(selection?.end);
		await canvas.cancelText();
	});

	test("1-4 keeps focus when the padding of the edit box is clicked", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.setVerticalAlign("top");
		await canvas.deselect();
		await canvas.typeTextAt(CENTER, "x");

		// Top-aligned, so click below the text (the padding inside the box).
		await canvas.page.mouse.click(CENTER.x, 305);

		expect(await canvas.page.locator(selectors.textEditor).isVisible()).toBe(
			true,
		);
		expect(await canvas.isTextEditorFocused()).toBe(true);
		await canvas.cancelText();
	});

	test("1-5 scrolls the editing surface and not the canvas when wheeling over an overflowing one", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.deselect();
		const longText = Array.from({ length: 30 }, (_, i) => `line ${i}`).join(
			"\n",
		);
		await canvas.typeTextAt(CENTER, longText);

		// Right after typing the caret is at the end and the scroll is at the bottom.
		const scrollBefore = await canvas.textEditorScrollTop();
		const viewBoxBefore = await canvas.getViewBox();

		await canvas.wheel(CENTER, { deltaY: -400 });

		await expect
			.poll(() => canvas.textEditorScrollTop(), {
				message: "the wheel should scroll the editing surface",
			})
			.toBeLessThan(scrollBefore);
		expect(await canvas.getViewBox()).toBe(viewBoxBefore);
		expect(await canvas.page.locator(selectors.textEditor).isVisible()).toBe(
			true,
		);
		await canvas.cancelText();
	});

	test("1-6 scrolls the canvas and keeps editing when wheeling during a non-overflowing edit", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.deselect();
		await canvas.typeTextAt(CENTER, "short");

		const viewBoxBefore = await canvas.getViewBox();
		await canvas.wheel(CENTER, { deltaY: 300 });

		await expect
			.poll(() => canvas.getViewBox(), {
				message: "the canvas should scroll when there is no overflow",
			})
			.not.toBe(viewBoxBefore);
		expect(await canvas.page.locator(selectors.textEditor).isVisible()).toBe(
			true,
		);
		await canvas.cancelText();
	});

	test("1-7 zooms the canvas and keeps editing when Ctrl+wheeling during an edit", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.deselect();
		await canvas.typeTextAt(CENTER, "zoom");

		const viewBoxBefore = await canvas.getViewBox();
		await canvas.wheel(CENTER, { deltaY: -200, ctrl: true });

		await expect.poll(() => canvas.getViewBox()).not.toBe(viewBoxBefore);
		expect(await canvas.page.locator(selectors.textEditor).isVisible()).toBe(
			true,
		);
		await canvas.cancelText();
	});

	// The right click over the editing surface is delegated to the native menu.
	test("1-8 does not open the built-in context menu on right click during an edit", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.deselect();
		await canvas.typeTextAt(CENTER, "menu");

		await canvas.page.mouse.click(CENTER.x, CENTER.y, { button: "right" });

		expect(await canvas.contextMenuVisible()).toBe(false);
		expect(await canvas.page.locator(selectors.textEditor).isVisible()).toBe(
			true,
		);
		await canvas.cancelText();
	});
});

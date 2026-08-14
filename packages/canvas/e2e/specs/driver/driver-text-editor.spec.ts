import { test, expect } from "../../fixtures";

/**
 * Driver self-test for CanvasDriver's text editor introspection methods.
 */
test.describe("driver: text editor introspection", () => {
	test("focuses the editing surface right after editing starts", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, "focus check");

		expect(await canvas.isTextEditorFocused()).toBe(true);
		await canvas.commitText();
		expect(await canvas.isTextEditorFocused()).toBe(false);
	});

	test("defaults the vertical alignment to middle", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, "align");

		expect(await canvas.textEditorVerticalAlign()).toBe("middle");
		await canvas.commitText();
	});

	test("reads the selection range and the scroll position", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 650, y: 360 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 525, y: 280 }, "abcdef");

		// Right after typing the caret sits at the end, so the selection is empty.
		const selection = await canvas.textEditorSelection();
		expect(selection).toEqual({ start: 6, end: 6 });

		expect(await canvas.textEditorScrollTop()).toBe(0);
		await canvas.commitText();
	});
});

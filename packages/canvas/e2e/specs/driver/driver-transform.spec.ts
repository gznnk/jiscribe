import { test, expect } from "../../fixtures";

/**
 * Driver self-test for CanvasDriver's transform handle drags, undo/redo and
 * swatch picking.
 */
test.describe("driver: transform handles and undo", () => {
	test("changes the size when the bottomRight handle is dragged", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const before = await rect.getAttribute("width");

		await canvas.dragTransformHandle("bottomRight", { x: 680, y: 400 });

		await expect
			.poll(() => rect.getAttribute("width"), {
				message: "width changes when the handle is dragged",
			})
			.not.toBe(before);
	});

	test("reverts a resize on undo and reapplies it on redo", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const original = await rect.getAttribute("width");

		await canvas.dragTransformHandle("bottomRight", { x: 680, y: 400 });
		const resized = await rect.getAttribute("width");
		expect(resized).not.toBe(original);

		await canvas.undo();
		await expect.poll(() => rect.getAttribute("width")).toBe(original);

		await canvas.redo();
		await expect.poll(() => rect.getAttribute("width")).toBe(resized);
	});

	test("sets the background color from a preset swatch", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await canvas.pickColorSwatch("bg-color", "fill", "#ffffff");

		// The color lands through emotion CSS rather than an SVG attribute, so it
		// has to be read from the computed style.
		const expectedFill = await canvas.normalizeColor("#ffffff");
		await expect
			.poll(() => canvas.computedColor(id, "fill"))
			.toBe(expectedFill);
	});
});

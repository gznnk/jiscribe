import { test, expect } from "../../fixtures";

/**
 * Text style settings on a shape whose render is rooted in a `<g>`.
 *
 * Unlike rect/ellipse, a Card has its own DOM structure, a TextOverlay as a
 * child of `<g data-id>`, and no default text. Guarded along the place -> type
 * text -> set font path: fontSize / fontColor / fontWeight must reach the render.
 */
test.describe("<g>-rooted shape text style", () => {
	test("applies the font size, text color and bold to the render", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Card");
		// Deselect so the menu shown right after placing does not get in the way of text editing.
		await canvas.deselect();

		// Take the placed position (its center) from the bounding box and type there.
		const box = await canvas.objectById(id).boundingBox();
		if (!box) {
			throw new Error("cannot locate the Card");
		}
		const center = canvas.toContent({
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
		});
		await canvas.typeTextAt(center, "Note");
		await canvas.commitText();
		await canvas.selectAt(center);

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 36);
		await canvas.setColor("font-color", "#0ea5e9");
		await canvas.setTextFormat("fontWeight", "bold");

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontSize)
			.toBe("36px");
		const style = await canvas.textStyleOf(id);
		expect(style?.color).toBe(await canvas.normalizeColor("#0ea5e9"));
		expect(style?.fontWeight).toBe("700");
	});
});

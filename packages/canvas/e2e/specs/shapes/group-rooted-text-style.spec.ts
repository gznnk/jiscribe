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

		// The three settings reach the render on separate frames, and fontWeight is set
		// last, so wait on all three together rather than on fontSize alone.
		const expectedColor = await canvas.normalizeColor("#0ea5e9");
		await expect
			.poll(async () => {
				const style = await canvas.textStyleOf(id);
				return {
					fontSize: style?.fontSize,
					color: style?.color,
					fontWeight: style?.fontWeight,
				};
			})
			.toEqual({
				fontSize: "36px",
				color: expectedColor,
				fontWeight: "700",
			});
	});
});

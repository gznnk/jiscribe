import { test, expect } from "../../fixtures";

/**
 * Driver self-test for CanvasDriver's ObjectMenu slider operations.
 * Targets the strokeWidth / rx sliders of the border-style section, whose
 * results are observable on the rect's stroke-width / rx attributes.
 */
test.describe("driver: ObjectMenu slider", () => {
	test("changes strokeWidth and keeps the selection when the slider is dragged", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const before = await rect.getAttribute("stroke-width");

		await canvas.openObjectMenu("border-style");
		await canvas.dragSliderBy("strokeWidth", 40);

		await expect
			.poll(() => rect.getAttribute("stroke-width"), {
				message: "stroke-width changes when the slider is dragged",
			})
			.not.toBe(before);
		expect(await canvas.hasAnyControl()).toBe(true);
	});

	test("commits strokeWidth and keeps the selection when typed as a number", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);

		await canvas.openObjectMenu("border-style");
		await canvas.setNumberInput("strokeWidth", 8);

		await expect.poll(() => rect.getAttribute("stroke-width")).toBe("8");
		expect(await canvas.hasAnyControl()).toBe(true);
	});
});

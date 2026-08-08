import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Style applied in bulk to a multi-selection or a group selection.
 *
 * handlePropertyUpdate applies a property to every selected id (and to a group's
 * descendants). The existing suite covers styling a single selection, but bulk
 * application over a multi-selection or a group selection had no coverage. Setting the
 * background color once must land on every selected shape, which is checked through the
 * computed fill.
 */

/** Draws two rectangles side by side and returns their ids (deselecting after each) */
async function drawTwoRects(
	canvas: CanvasDriver,
): Promise<{ left: string; right: string }> {
	const left = await canvas.drawShape(
		"Rectangle",
		{ x: 340, y: 180 },
		{ x: 470, y: 300 },
	);
	await canvas.deselect();
	const right = await canvas.drawShape(
		"Rectangle",
		{ x: 560, y: 180 },
		{ x: 690, y: 300 },
	);
	await canvas.deselect();
	return { left, right };
}

test.describe("bulk style application to a multi-selection or group", () => {
	test("applies the background color to every shape in a marquee multi-selection", async ({
		canvas,
	}) => {
		const { left, right } = await drawTwoRects(canvas);

		// A marquee that fully encloses both shapes.
		await canvas.drag({ x: 310, y: 150 }, { x: 720, y: 330 });
		await expect
			.poll(async () => (await canvas.visibleControlIds()).length)
			.toBeGreaterThan(0);

		const expectedFill = await canvas.normalizeColor("#22c55e");
		await canvas.setColor("bg-color", "#22c55e");

		await expect
			.poll(() => canvas.computedColor(left, "fill"))
			.toBe(expectedFill);
		expect(await canvas.computedColor(right, "fill")).toBe(expectedFill);
	});

	test("applies the background color to every member of a selected group", async ({
		canvas,
	}) => {
		const { left, right } = await drawTwoRects(canvas);

		await canvas.drag({ x: 310, y: 150 }, { x: 720, y: 330 });
		await expect
			.poll(async () => (await canvas.visibleControlIds()).length)
			.toBeGreaterThan(0);
		await canvas.group();

		// Set the background color with the group selected (the path that recurses into
		// the descendants).
		const expectedFill = await canvas.normalizeColor("#f97316");
		await canvas.setColor("bg-color", "#f97316");

		await expect
			.poll(() => canvas.computedColor(left, "fill"))
			.toBe(expectedFill);
		expect(await canvas.computedColor(right, "fill")).toBe(expectedFill);
	});
});

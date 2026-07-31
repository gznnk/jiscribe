import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Text style applied in bulk to a multi-selection.
 *
 * handlePropertyUpdate applies a property to every selected id. Bulk fill is tested
 * separately, but whether text properties (fontSize / fontWeight) propagate to the
 * whole selection through the same loop had no coverage. Landing on only the first
 * shape would be a product bug, so both shapes' rendering is checked.
 */

/** Draws two labeled rectangles side by side and returns their ids (deselected after each) */
async function drawTwoLabeledRects(
	canvas: CanvasDriver,
): Promise<{ left: string; right: string }> {
	const left = await canvas.drawShape(
		"Rectangle",
		{ x: 340, y: 180 },
		{ x: 470, y: 300 },
	);
	await canvas.typeTextAt({ x: 405, y: 240 }, "A");
	await canvas.commitText();

	const right = await canvas.drawShape(
		"Rectangle",
		{ x: 560, y: 180 },
		{ x: 690, y: 300 },
	);
	await canvas.typeTextAt({ x: 625, y: 240 }, "B");
	await canvas.commitText();

	return { left, right };
}

/** Multi-selects both rectangles with a marquee around them */
async function marqueeSelectBoth(canvas: CanvasDriver) {
	await canvas.drag({ x: 310, y: 150 }, { x: 720, y: 330 });
	await expect
		.poll(async () => (await canvas.visibleControlIds()).length)
		.toBeGreaterThan(0);
}

test.describe("bulk text style application to a multi-selection", () => {
	test("applies a font size change to every text in a multi-selection", async ({
		canvas,
	}) => {
		const { left, right } = await drawTwoLabeledRects(canvas);
		await marqueeSelectBoth(canvas);

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 44);

		await expect
			.poll(async () => (await canvas.textStyleOf(left))?.fontSize)
			.toBe("44px");
		expect((await canvas.textStyleOf(right))?.fontSize).toBe("44px");
	});

	test("makes every text bold in a multi-selection", async ({ canvas }) => {
		const { left, right } = await drawTwoLabeledRects(canvas);
		await marqueeSelectBoth(canvas);

		await canvas.page.click(selectors.objectMenuSet("fontWeight", "bold"));

		await expect
			.poll(async () => (await canvas.textStyleOf(left))?.fontWeight)
			.toBe("700");
		expect((await canvas.textStyleOf(right))?.fontWeight).toBe("700");
	});
});

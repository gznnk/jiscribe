import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Style applied in bulk to a multi-selection or a group selection.
 *
 * handlePropertyUpdate applies a property to every selected id (and to a group's
 * descendants). The existing suite covers styling a single selection, but bulk
 * application over a multi-selection or a group selection had no coverage. Setting the
 * background color once must land on every selected shape, which is checked through the
 * computed fill. The ObjectMenu reads such a selection as a whole too, so values the
 * shapes disagree on show as mixed rather than as the first shape's.
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

	test("shows a disagreeing multi-selection as mixed rather than the first shape's values", async ({
		canvas,
	}) => {
		const left = await canvas.drawShape(
			"Rectangle",
			{ x: 340, y: 180 },
			{ x: 470, y: 300 },
		);
		await canvas.setStrokeDashType("border-style", "dashed");
		await canvas.setNumberInput("strokeWidth", 6);
		await expect
			.poll(() => canvas.objectById(left).getAttribute("stroke-width"))
			.toBe("6");
		await canvas.openObjectMenu("alignment");
		await canvas.page.click(selectors.objectMenuSet("textAlign", "right"));

		// ObjectMenuButton's isActive shows only as border-color (accent when
		// active, transparent otherwise; background also follows hover), so a
		// button is read as inactive when its border is transparent.
		const inactiveBorder = "rgba(0, 0, 0, 0)";
		const borderColorOf = (property: string, value: string): Promise<string> =>
			canvas.page
				.locator(selectors.objectMenuSet(property, value))
				.evaluate((el) => getComputedStyle(el).borderColor);
		// Proves the reading tells active from inactive before it is used to say
		// that nothing is active.
		await expect
			.poll(() => borderColorOf("textAlign", "right"))
			.not.toBe(inactiveBorder);
		await canvas.deselect();

		await canvas.drawShape("Rectangle", { x: 560, y: 180 }, { x: 690, y: 300 });
		await canvas.deselect();

		await canvas.drag({ x: 310, y: 150 }, { x: 720, y: 330 });
		await expect
			.poll(async () => (await canvas.visibleControlIds()).length)
			.toBeGreaterThan(0);

		// The slider names no one shape's width: the number input is emptied
		// behind the mixed placeholder.
		await canvas.openObjectMenu("border-style");
		const widthInput = canvas.page.getByTestId("menu-number-input:strokeWidth");
		await expect(widthInput).toHaveValue("");
		await expect(widthInput).toHaveAttribute("placeholder", "—");
		for (const dashType of ["solid", "dashed", "dotted"]) {
			await expect
				.poll(() => borderColorOf("strokeDashType", dashType), {
					message: `${dashType} is not active over a mixed dash type`,
				})
				.toBe(inactiveBorder);
		}

		await canvas.openObjectMenu("alignment");
		for (const textAlign of ["left", "center", "right"]) {
			await expect
				.poll(() => borderColorOf("textAlign", textAlign), {
					message: `${textAlign} is not active over a mixed alignment`,
				})
				.toBe(inactiveBorder);
		}
	});
});

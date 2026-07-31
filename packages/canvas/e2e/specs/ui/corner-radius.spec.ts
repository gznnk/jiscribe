import { test, expect } from "../../fixtures";

/**
 * Corner radius (rx) of a rectangle and its undo.
 *
 * object-menu.spec guards colors and dash types, but the corner radius control
 * (property: rx) in the border-style section had no coverage. The number input feeds
 * the rect's rx attribute, and both the applied value and the undo are guarded through
 * that attribute.
 */
test.describe("rectangle corner radius (rx)", () => {
	test("applies the corner radius to rx from the number input and reverts it on undo", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rxBefore = (await canvas.objectById(id).getAttribute("rx")) ?? "0";

		await canvas.openObjectMenu("border-style");
		await canvas.setNumberInput("rx", 24);
		await expect
			.poll(() => canvas.objectById(id).getAttribute("rx"), {
				message: "rx takes the value that was set",
			})
			.toBe("24");

		// Move the focus left in the number input back to the canvas before undoing
		await canvas.selectAt({ x: 500, y: 260 });
		await canvas.undo();
		await expect
			.poll(
				async () => (await canvas.objectById(id).getAttribute("rx")) ?? "0",
				{
					message: "undo restores the original corner radius",
				},
			)
			.toBe(rxBefore);
	});
});

import { test, expect } from "../../fixtures";

/**
 * Nudging a multi-selection.
 *
 * The existing nudge.spec guards 1px / 10px movement of a single shape, but
 * whether everything moves by the same amount when an arrow key is pressed with
 * several shapes selected was not checked. Nudge adds the same delta to every
 * entry of selectedIds, and a regression that moves only a single selection, or
 * only part of the selection, is easy to introduce in a refactor. Guarded by the
 * transform of both shapes.
 */
test.describe("multi-selection nudge", () => {
	test("moves every selected shape by 1px on an arrow key", async ({
		canvas,
	}) => {
		// A: center (370,260) / B: center (630,260)
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 560, y: 200 },
			{ x: 700, y: 320 },
		);
		await canvas.deselect();

		await canvas.selectAll();
		await canvas.nudge("right");

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A moves by +1px",
			})
			.toBe("matrix(1, 0, 0, 1, 371, 260)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 631, 260)",
		);
	});

	test("moves every selected shape by 10px on Shift+arrow", async ({
		canvas,
	}) => {
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 560, y: 200 },
			{ x: 700, y: 320 },
		);
		await canvas.deselect();

		await canvas.selectAll();
		await canvas.nudge("down", { large: true });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A moves by +10px",
			})
			.toBe("matrix(1, 0, 0, 1, 370, 270)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 630, 270)",
		);
	});
});

import { test, expect } from "../../fixtures";

/**
 * Pins that dragging a multi-selection with the pointer moves every member by
 * the same delta and keeps their relative positions.
 *
 * multi-nudge covers the bulk move through the arrow keys (the command path);
 * the pointer drag (the gesture path / moveSelection) is a separate path where
 * moving only the grabbed shape, losing the relative positions or jumping to the
 * cursor can regress on their own. Both transforms are pinned to the same delta.
 *
 * The selection is not single, so the grabbed shape and the other one are both
 * excluded from the snap candidates, and with zoom=1 the delta is exact.
 */
test.describe("multi-select drag move", () => {
	test("moves every selected shape by the same amount and keeps their relative positions", async ({
		canvas,
	}) => {
		// A centered at (370,260), B at (630,260)
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

		// Grab A's center (370,260) and drag (+100,+100).
		await canvas.drag({ x: 370, y: 260 }, { x: 470, y: 360 });

		// Both move (+100,+100), so the 260px gap between centers survives.
		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A moves by (+100,+100)",
			})
			.toBe("matrix(1, 0, 0, 1, 470, 360)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 730, 360)",
		);
	});
});

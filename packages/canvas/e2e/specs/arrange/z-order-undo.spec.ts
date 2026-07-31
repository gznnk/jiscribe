import { test, expect } from "../../fixtures";

/**
 * Undo / redo of stacking order (z-order) changes.
 *
 * z-order.spec guards the result of bringToFront and friends (DOM order), but not
 * whether the operation is pushed onto the history so that undo restores the previous
 * order and redo reapplies it. An arrange command that fails to create a history entry
 * regresses asymmetrically: "only the stacking order cannot be undone". Guarded through
 * the round trip of the DOM order index.
 */
test.describe("stacking order undo / redo", () => {
	test("restores the original order on undo of bringToFront and reapplies it on redo", async ({
		canvas,
	}) => {
		// A first, B second, so B is in front (last in DOM). They are placed apart so
		// they do not overlap.
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		);
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 520, y: 200 }, { x: 660, y: 320 });
		await canvas.deselect();

		// A starts at the back (index 0)
		expect(await canvas.objectIndex(a)).toBe(0);

		// Bring A to the front -> A becomes index 1 (last in DOM)
		await canvas.selectAt({ x: 370, y: 260 });
		await canvas.arrange("bringToFront");
		await expect
			.poll(() => canvas.objectIndex(a), {
				message: "bringToFront puts A in front",
			})
			.toBe(1);

		await canvas.undo();
		await expect
			.poll(() => canvas.objectIndex(a), {
				message: "undo restores the stacking order",
			})
			.toBe(0);

		await canvas.redo();
		await expect
			.poll(() => canvas.objectIndex(a), {
				message: "redo reapplies the stacking order change",
			})
			.toBe(1);
	});
});

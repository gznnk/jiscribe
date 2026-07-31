import { test, expect } from "../../fixtures";

/**
 * Undo / redo of a rotation.
 *
 * basic-gestures guards that a rotation handle drag changes the transform;
 * whether the rotation lands on the history, so undo restores the original
 * orientation and redo reapplies it, was unchecked. A rotation rewrites the
 * transform matrix (the a,b,c,d components), and failing to record a history
 * entry gives the asymmetric regression where only rotations cannot be rolled
 * back. Guarded by round-tripping the transform string.
 */
test.describe("undo / redo of a rotation", () => {
	test("restores the original orientation on undo and reapplies the rotation on redo", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 420, y: 220 },
			{ x: 580, y: 300 },
		);
		// Unrotated before the gesture: the identity matrix plus the center translation
		const before = await canvas.objectById(id).getAttribute("transform");

		// Drag the rotation handle to just above the center to rotate
		await canvas.dragTransformHandle("rotation", { x: 500, y: 120 });
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "the transform changes on rotation",
			})
			.not.toBe(before);
		const rotated = await canvas.objectById(id).getAttribute("transform");

		// undo returns the transform from before the rotation
		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "undo restores the orientation from before the rotation",
			})
			.toBe(before);

		// redo reapplies the rotated transform
		await canvas.redo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "redo reapplies the rotation",
			})
			.toBe(rotated);
	});
});

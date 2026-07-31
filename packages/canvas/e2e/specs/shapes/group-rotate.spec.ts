import { test, expect } from "../../fixtures";

/**
 * Multi-select rotation.
 *
 * Single shapes are covered by rotate-undo / basic-gestures. Rotating a
 * multi-selection instead makes every shape orbit the group center
 * (rotateChildren), rewriting each child's center (the transform's e,f) as well
 * as its orientation. That invites regressions where (1) only some children
 * turn, (2) they spin in place instead of orbiting, or (3) the history splits
 * per child so one undo does not restore everything. Guarded by "both centers
 * move" and "one undo restores both".
 */

/** Extracts the center (e,f) from transform="matrix(a,b,c,d,e,f)". */
function centerOf(transform: string | null): { x: number; y: number } {
	if (!transform) {
		throw new Error("the transform attribute is missing");
	}
	const nums = transform.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`cannot parse the transform: ${transform}`);
	}
	return { x: nums[4], y: nums[5] };
}

test.describe("multi-select rotation (orbiting)", () => {
	test("orbits both shapes around the group center and restores both with one undo", async ({
		canvas,
	}) => {
		// Two rects side by side. A centered at (300,210), B at (700,210).
		// The group center is about (500,210).
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 220, y: 160 },
			{ x: 380, y: 260 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 620, y: 160 },
			{ x: 780, y: 260 },
		);
		await canvas.deselect();

		const aBefore = await canvas.objectById(a).getAttribute("transform");
		const bBefore = await canvas.objectById(b).getAttribute("transform");

		// Select both with a marquee (fully enclosing).
		await canvas.drag({ x: 180, y: 120 }, { x: 820, y: 300 }, 12);

		// Drag the rotation handle far sideways; the children should orbit the group center.
		await canvas.dragTransformHandle("rotation", { x: 760, y: 210 });

		// Wait until A's center moves, which is what tells orbiting from spinning in place.
		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A's transform changes on rotation",
			})
			.not.toBe(aBefore);

		const aRotated = await canvas.objectById(a).getAttribute("transform");
		const bRotated = await canvas.objectById(b).getAttribute("transform");

		// Orbiting moves both centers away from their initial positions.
		expect(centerOf(aRotated)).not.toEqual(centerOf(aBefore));
		expect(centerOf(bRotated)).not.toEqual(centerOf(bBefore));
		// B's transform changes too, which rules out the only-one-turns regression.
		expect(bRotated).not.toBe(bBefore);

		// One undo restores both shapes (the history holds a single entry).
		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "one undo restores A's orientation and position",
			})
			.toBe(aBefore);
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(bBefore);
	});
});

import { test, expect } from "../../fixtures";

/**
 * Basic gesture non-regression for the items the other specs / drivers miss.
 * See packages/canvas/docs/04-gesture-system.md for the spec.
 * - 5-1 move -> shapes/draw.spec.ts
 * - 5-2 resize -> driver/driver-transform.spec.ts (rotation lives here)
 * - 5-4 wheel/zoom and 5-5 right-drag pan -> driver/driver-input.spec.ts
 */
test.describe("basic gesture non-regression", () => {
	// 5-3: a marquee drag from empty space selects multiple shapes
	test("5-3 selects multiple shapes with a marquee drag and deletes them together", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 440, y: 320 });
		await canvas.drawShape("Rectangle", { x: 560, y: 200 }, { x: 700, y: 320 });
		await canvas.deselect();

		const before = (await canvas.captureObjects()).length;
		expect(before).toBe(2);

		// Marquee from empty space enclosing both
		await canvas.drag({ x: 240, y: 150 }, { x: 740, y: 360 }, 12);
		expect(await canvas.hasAnyControl()).toBe(true);

		// Deleting them in one go proves both were selected
		await canvas.deleteSelection();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);
	});

	// 5-2 (rotation): dragging the rotation handle rotates the shape
	test("5-2 rotates the shape when the rotation handle is dragged", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 420, y: 220 },
			{ x: 580, y: 300 },
		);
		const before = await canvas.objectById(id).getAttribute("transform");

		// Drag the rotation handle to just above the center
		await canvas.dragTransformHandle("rotation", { x: 500, y: 120 });

		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "the transform changes when the rotation handle is dragged",
			})
			.not.toBe(before);
	});
});

import { test, expect } from "../../fixtures";

/**
 * Per-direction behavior of the resize handles, plus Shift (locked aspect ratio).
 * driver-transform.spec.ts only covers the basics of bottomRight, so the edge
 * handles (single axis) and the Shift ratio lock are filled in here.
 */
test.describe("resize", () => {
	test("changes only the height with the bottomCenter handle, leaving the width alone", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const width = await rect.getAttribute("width");
		const height = await rect.getAttribute("height");

		// Bottom-center 100px down grows only the height
		await canvas.dragTransformHandle("bottomCenter", { x: 500, y: 420 });

		await expect.poll(() => rect.getAttribute("height")).not.toBe(height);
		expect(await rect.getAttribute("width")).toBe(width);
	});

	test("changes both width and height when the topLeft handle is dragged", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const width = await rect.getAttribute("width");
		const height = await rect.getAttribute("height");

		// Pulling the top left inward shrinks both width and height
		await canvas.dragTransformHandle("topLeft", { x: 460, y: 240 });

		await expect.poll(() => rect.getAttribute("width")).not.toBe(width);
		expect(await rect.getAttribute("height")).not.toBe(height);
	});

	test("keeps the aspect ratio on Shift+bottomRight", async ({ canvas }) => {
		// 200x120 rect (ratio ~= 1.667)
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const startWidth = Number(await rect.getAttribute("width"));
		const startHeight = Number(await rect.getAttribute("height"));
		const startRatio = startWidth / startHeight;

		// Enlarge while holding Shift
		await canvas.dragTransformHandle(
			"bottomRight",
			{ x: 760, y: 360 },
			{ shift: true },
		);

		await expect
			.poll(() => rect.getAttribute("width"))
			.not.toBe(String(startWidth));

		const endWidth = Number(await rect.getAttribute("width"));
		const endHeight = Number(await rect.getAttribute("height"));
		// The ratio survives, allowing for rounding error
		expect(endWidth / endHeight).toBeCloseTo(startRatio, 1);
	});
});

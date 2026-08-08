import { test, expect } from "../../fixtures";

/**
 * Driver self-test for CanvasDriver's input primitives (wheel / rightDrag /
 * control visibility). Verifies the driver API itself, not product behavior.
 */
test.describe("driver: input primitives", () => {
	test("scrolls the canvas on wheel (viewBox changes)", async ({ canvas }) => {
		const before = await canvas.getViewBox();

		await canvas.wheel({ x: 700, y: 450 }, { deltaY: 200 });

		await expect
			.poll(() => canvas.getViewBox(), {
				message: "viewBox changes after the wheel",
			})
			.not.toBe(before);
	});

	test("zooms the canvas on ctrl+wheel (viewBox changes)", async ({
		canvas,
	}) => {
		const before = await canvas.getViewBox();

		await canvas.wheel({ x: 700, y: 450 }, { deltaY: -200, ctrl: true });

		await expect.poll(() => canvas.getViewBox()).not.toBe(before);
	});

	test("pans the viewport on rightDrag (viewBox changes)", async ({
		canvas,
	}) => {
		const before = await canvas.getViewBox();

		await canvas.rightDrag({ x: 700, y: 450 }, { x: 500, y: 350 });

		await expect.poll(() => canvas.getViewBox()).not.toBe(before);
	});

	test("shows transform controls right after drawing", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		const ids = await canvas.visibleControlIds();
		expect(ids).toContain("transform/resize:bottomRight");
		expect(ids).toContain("transform/rotation");
		expect(await canvas.isControlVisible("transform/resize:topLeft")).toBe(
			true,
		);
		expect(await canvas.hasAnyControl()).toBe(true);
	});

	test("removes the controls when the selection is cleared", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		expect(await canvas.visibleControlIds()).toEqual([]);
		expect(await canvas.hasAnyControl()).toBe(false);
	});
});

import { test, expect } from "../../fixtures";

/**
 * Stacking order (z-order). In SVG, DOM order is paint order and later elements are in
 * front. The stacking-order section of ObjectMenu (bringToFront / sendToBack) is
 * verified through the DOM order index from captureObjects().
 */
test.describe("stacking order", () => {
	test("moves the backmost shape to the front (last in DOM) with bringToFront", async ({
		canvas,
	}) => {
		// DOM order follows creation order: A (backmost) -> B -> C (frontmost)
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 420, y: 300 },
		);
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 460, y: 200 }, { x: 580, y: 300 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 620, y: 200 }, { x: 740, y: 300 });
		await canvas.deselect();

		expect(await canvas.objectIndex(a)).toBe(0);

		await canvas.selectAt({ x: 360, y: 250 });
		await canvas.arrange("bringToFront");

		// A ends up last in DOM (frontmost)
		await expect.poll(() => canvas.objectIndex(a)).toBe(2);
	});

	test("moves the frontmost shape to the back (first in DOM) with sendToBack", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 420, y: 300 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 460, y: 200 }, { x: 580, y: 300 });
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 620, y: 200 },
			{ x: 740, y: 300 },
		);
		await canvas.deselect();

		expect(await canvas.objectIndex(c)).toBe(2);

		await canvas.selectAt({ x: 680, y: 250 });
		await canvas.arrange("sendToBack");

		await expect.poll(() => canvas.objectIndex(c)).toBe(0);
	});

	test("raises the shape by exactly one step with bringForward", async ({
		canvas,
	}) => {
		// A(0) -> B(1) -> C(2)
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 420, y: 300 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 460, y: 200 },
			{ x: 580, y: 300 },
		);
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 620, y: 200 },
			{ x: 740, y: 300 },
		);
		await canvas.deselect();

		// Raise A one step: A and B swap (the frontmost C stays)
		await canvas.selectAt({ x: 360, y: 250 });
		await canvas.arrange("bringForward");

		await expect.poll(() => canvas.objectIndex(a)).toBe(1);
		expect(await canvas.objectIndex(b)).toBe(0);
		expect(await canvas.objectIndex(c)).toBe(2);
	});

	test("lowers the shape by exactly one step with sendBackward", async ({
		canvas,
	}) => {
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 420, y: 300 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 460, y: 200 },
			{ x: 580, y: 300 },
		);
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 620, y: 200 },
			{ x: 740, y: 300 },
		);
		await canvas.deselect();

		// Lower C one step: C and B swap (the backmost A stays)
		await canvas.selectAt({ x: 680, y: 250 });
		await canvas.arrange("sendBackward");

		await expect.poll(() => canvas.objectIndex(c)).toBe(1);
		expect(await canvas.objectIndex(b)).toBe(2);
		expect(await canvas.objectIndex(a)).toBe(0);
	});

	test("leaves the order unchanged when bringForward is used on the frontmost shape (clamped)", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 420, y: 300 });
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 620, y: 200 },
			{ x: 740, y: 300 },
		);
		await canvas.deselect();

		expect(await canvas.objectIndex(c)).toBe(1);

		await canvas.selectAt({ x: 680, y: 250 });
		await canvas.arrange("bringForward");

		// Already frontmost, so nothing changes
		await expect.poll(() => canvas.objectIndex(c)).toBe(1);
	});

	test("leaves the order unchanged when sendBackward is used on the backmost shape (clamped)", async ({
		canvas,
	}) => {
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 420, y: 300 },
		);
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 620, y: 200 }, { x: 740, y: 300 });
		await canvas.deselect();

		expect(await canvas.objectIndex(a)).toBe(0);

		await canvas.selectAt({ x: 360, y: 250 });
		await canvas.arrange("sendBackward");

		// Already backmost, so nothing changes
		await expect.poll(() => canvas.objectIndex(a)).toBe(0);
	});
});

import { test, expect } from "../../fixtures";

/**
 * Selection operations from the keyboard.
 * - Ctrl+A selects all / Escape clears the selection
 * - Delete removes, undo restores
 */
test.describe("keyboard: selection", () => {
	test("selects everything on Ctrl+A and deletes it in one go", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 440, y: 320 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 560, y: 200 }, { x: 700, y: 320 });
		await canvas.deselect();
		expect((await canvas.captureObjects()).length).toBe(2);

		await canvas.selectAll();
		expect(await canvas.hasAnyControl()).toBe(true);

		await canvas.deleteSelection();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);
	});

	test("clears the selection on Escape", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		// Right after drawing the shape is selected, so controls are showing.
		expect(await canvas.hasAnyControl()).toBe(true);

		await canvas.pressEscape();

		await expect.poll(() => canvas.hasAnyControl()).toBe(false);
	});

	test("deletes on Delete and restores on undo", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const transform = await canvas.objectById(id).getAttribute("transform");

		await canvas.deleteSelection();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);

		await canvas.undo();
		// The same shape comes back, id and position included.
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(1);
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			transform,
		);
	});
});

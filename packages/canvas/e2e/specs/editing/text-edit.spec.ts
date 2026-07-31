import { test, expect } from "../../fixtures";

test.describe("text editing", () => {
	test("edits on double click and commits on an outside click", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, "Hello Canvas");
		await canvas.commitText();

		await expect(canvas.page.locator("body")).toContainText("Hello Canvas");
	});

	test("cancels on Escape and does not save the text", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, "Discarded");
		await canvas.cancelText();

		await expect(canvas.page.locator("body")).not.toContainText("Discarded");
	});

	test("accepts multi-line text", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 650, y: 360 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 525, y: 280 }, "Line One\nLine Two");
		await canvas.commitText();

		const body = canvas.page.locator("body");
		await expect(body).toContainText("Line One");
		await expect(body).toContainText("Line Two");
	});
});

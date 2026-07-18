import { test, expect } from "../../fixtures";

test.describe("テキスト編集", () => {
	test("ダブルクリックで編集し、外側クリックで確定される", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, "Hello Canvas");
		await canvas.commitText();

		await expect(canvas.page.locator("body")).toContainText("Hello Canvas");
	});

	test("Escape はキャンセルでありテキストは保存されない", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, "Discarded");
		await canvas.cancelText();

		await expect(canvas.page.locator("body")).not.toContainText("Discarded");
	});

	test("複数行テキストを入力できる", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 650, y: 360 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 525, y: 280 }, "Line One\nLine Two");
		await canvas.commitText();

		const body = canvas.page.locator("body");
		await expect(body).toContainText("Line One");
		await expect(body).toContainText("Line Two");
	});
});

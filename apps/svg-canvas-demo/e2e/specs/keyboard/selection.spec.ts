import { test, expect } from "../../fixtures";

/**
 * キーボードによる選択操作。
 * - Ctrl+A 全選択 / Escape 選択解除
 * - Delete での削除と Undo による復元
 */
test.describe("キーボード: 選択", () => {
	test("Ctrl+A で全選択し、まとめて削除できる", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 440, y: 320 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 560, y: 200 }, { x: 700, y: 320 });
		await canvas.deselect();
		expect((await canvas.captureObjects()).length).toBe(2);

		await canvas.selectAll();
		expect(await canvas.hasAnyControl()).toBe(true);

		// 全選択されていれば Delete で両方消える
		await canvas.deleteSelection();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);
	});

	test("Escape で選択が解除される", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		// 描画直後は選択状態（コントロールが出ている）
		expect(await canvas.hasAnyControl()).toBe(true);

		await canvas.pressEscape();

		await expect.poll(() => canvas.hasAnyControl()).toBe(false);
	});

	test("Delete で削除し、Undo で復元される", async ({ canvas }) => {
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
		// 同じ図形（id・位置）が戻る
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(1);
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			transform,
		);
	});
});

import { test, expect } from "../../fixtures";

/**
 * CanvasDriver の変形ハンドル操作・Undo/Redo・スウォッチ選択の動作確認。
 */
test.describe("ドライバ動作確認: 変形ハンドル・Undo", () => {
	test("bottomRight ハンドルのドラッグでサイズが変わる", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const before = await rect.getAttribute("width");

		await canvas.dragTransformHandle("bottomRight", { x: 680, y: 400 });

		await expect
			.poll(() => rect.getAttribute("width"), {
				message: "ハンドルドラッグで width が変化すること",
			})
			.not.toBe(before);
	});

	test("Undo でリサイズが元に戻り、Redo で再適用される", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const original = await rect.getAttribute("width");

		await canvas.dragTransformHandle("bottomRight", { x: 680, y: 400 });
		const resized = await rect.getAttribute("width");
		expect(resized).not.toBe(original);

		await canvas.undo();
		await expect.poll(() => rect.getAttribute("width")).toBe(original);

		await canvas.redo();
		await expect.poll(() => rect.getAttribute("width")).toBe(resized);
	});

	test("プリセットスウォッチで背景色を設定できる", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		// bg-color セクションのプリセット白を選ぶ（fill プロパティ）
		await canvas.pickColorSwatch("bg-color", "fill", "#ffffff");

		// 色は SVG 属性ではなく emotion CSS で当たるため computed style で検証する
		const expectedFill = await canvas.normalizeColor("#ffffff");
		await expect
			.poll(() => canvas.computedColor(id, "fill"))
			.toBe(expectedFill);
	});
});

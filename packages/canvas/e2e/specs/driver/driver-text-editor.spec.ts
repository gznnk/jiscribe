import { test, expect } from "../../fixtures";

/**
 * CanvasDriver のテキストエディタ内観メソッドの動作確認。
 */
test.describe("ドライバ動作確認: テキストエディタ内観", () => {
	test("編集開始直後は textarea にフォーカスがある", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, "focus check");

		expect(await canvas.isTextEditorFocused()).toBe(true);
		await canvas.commitText();
		expect(await canvas.isTextEditorFocused()).toBe(false);
	});

	test("既定の縦アライメントは middle", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, "align");

		expect(await canvas.textEditorVerticalAlign()).toBe("middle");
		await canvas.commitText();
	});

	test("選択範囲とスクロール位置を読める", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 650, y: 360 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 525, y: 280 }, "abcdef");

		// タイプ直後はキャレットが末尾（空選択）
		const selection = await canvas.textEditorSelection();
		expect(selection).toEqual({ start: 6, end: 6 });

		// スクロール位置は数値として取得できる（初期は 0）
		expect(await canvas.textEditorScrollTop()).toBe(0);
		await canvas.commitText();
	});
});

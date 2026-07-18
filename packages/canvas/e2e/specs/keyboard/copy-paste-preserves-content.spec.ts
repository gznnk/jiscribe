import { test, expect } from "../../fixtures";

/**
 * コピー＆ペースト（Ctrl+C → Ctrl+V）が中身を引き継ぐことの検証。
 *
 * clipboard.spec は「ペーストで数が増える」までしか守らない。コピペは複製（Ctrl+D）とは
 * 別経路で、CopyCommand → ClipboardData へシリアライズ → ペーストで再構築するため、
 * シリアライズ時のスタイル・テキスト欠落は複製が無事でも独立に起き得る。元とペースト先の
 * computed fill 一致・テキストの 2 重化という観測可能な結果で守る。
 */
test.describe("コピー＆ペーストが中身を引き継ぐ", () => {
	test("コピー＆ペーストは背景色を引き継ぐ", async ({ canvas }) => {
		const srcId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const customFill = await canvas.normalizeColor("#f59e0b");
		await canvas.setColor("bg-color", "#f59e0b");
		await expect
			.poll(() => canvas.computedColor(srcId, "fill"))
			.toBe(customFill);

		// 色入力欄に残ったフォーカスをキャンバスへ戻してからコピペする
		// （入力欄にフォーカスがあると Ctrl+C/V がそちらへ奪われる）。
		await canvas.selectAt({ x: 500, y: 260 });
		await canvas.copy();
		await canvas.paste();

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(2);

		const objects = await canvas.captureObjects();
		const pasted = objects.find((obj) => obj.id !== srcId);
		expect(pasted?.id).toBeTruthy();
		expect(await canvas.computedColor(srcId, "fill")).toBe(customFill);
		expect(await canvas.computedColor(pasted!.id!, "fill")).toBe(customFill);
	});

	test("コピー＆ペーストはテキストを引き継ぐ", async ({ canvas }) => {
		const text = "Copy Me";
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, text);
		await canvas.commitText();
		await expect(canvas.page.locator("body")).toContainText(text);

		await canvas.selectAt({ x: 500, y: 260 });
		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(2);

		await expect
			.poll(
				() =>
					canvas.page.evaluate((needle) => {
						const haystack = document.body.textContent ?? "";
						return haystack.split(needle).length - 1;
					}, text),
				{ message: "ペースト後はテキストが 2 箇所に現れること" },
			)
			.toBe(2);
	});
});

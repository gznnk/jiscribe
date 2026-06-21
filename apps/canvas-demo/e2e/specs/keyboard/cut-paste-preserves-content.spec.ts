import { test, expect } from "../../fixtures";

/**
 * 切り取り＆ペースト（Ctrl+X → Ctrl+V）が中身を引き継ぐことの検証。
 *
 * clipboard.spec は「Ctrl+X で消え Ctrl+V で戻る」を数で守るが、戻ってきた図形が
 * スタイル・テキストを保っているかは検証していなかった。CutCommand は copy + delete で、
 * クリップボードへのシリアライズが絡むため、コピペとは別に中身欠落が起き得る。
 * 切り取り後は元が消え、ペーストで中身（背景色・テキスト）ごと 1 つ戻ることを守る。
 */
test.describe("切り取り＆ペーストが中身を引き継ぐ", () => {
	test("切り取り→ペーストで背景色ごと戻る", async ({ canvas }) => {
		const srcId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const customFill = await canvas.normalizeColor("#0ea5e9");
		await canvas.setColor("bg-color", "#0ea5e9");
		await expect
			.poll(() => canvas.computedColor(srcId, "fill"))
			.toBe(customFill);

		// 色入力欄に残ったフォーカスをキャンバスへ戻してから切り取る
		await canvas.selectAt({ x: 500, y: 260 });
		await canvas.cut();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "切り取りで元図形が消えること",
			})
			.toBe(0);

		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "ペーストで 1 つ戻ること",
			})
			.toBe(1);

		const pasted = (await canvas.captureObjects())[0];
		expect(await canvas.computedColor(pasted.id!, "fill")).toBe(customFill);
	});

	test("切り取り→ペーストでテキストごと戻る", async ({ canvas }) => {
		const text = "Cut Me";
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, text);
		await canvas.commitText();
		await expect(canvas.page.locator("body")).toContainText(text);

		await canvas.selectAt({ x: 500, y: 260 });
		await canvas.cut();
		// 切り取りで図形もテキストも消える
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);
		await expect(canvas.page.locator("body")).not.toContainText(text);

		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(1);
		await expect(canvas.page.locator("body")).toContainText(text);
	});
});

import { test, expect } from "../../fixtures";

/**
 * 複製（Ctrl+D）が中身を引き継ぐことの検証。
 *
 * 既存の clipboard / duplicate-paste-offset は「数が増える」「位置が +20 ずれる」までは
 * 守るが、複製された図形が元のスタイル（背景色）やテキストを引き継ぐかは検証していない。
 * 複製は state の deep copy ＋ ID 振り直しで実装されており、コピー漏れ（色だけ・テキスト
 * だけ落ちる）はリファクタで起きやすく、かつ画面では一見動いて見えるため気づきにくい。
 * 観測可能な結果（両図形の computed fill 一致・テキストの 2 重化）で守る。
 */
test.describe("複製が中身を引き継ぐ", () => {
	test("複製は背景色を引き継ぐ", async ({ canvas }) => {
		const srcId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const customFill = await canvas.normalizeColor("#22c55e");
		await canvas.setColor("bg-color", "#22c55e");
		await expect
			.poll(() => canvas.computedColor(srcId, "fill"))
			.toBe(customFill);

		// 色入力欄に残ったフォーカスをキャンバスへ戻す（Ctrl+D を入力欄が奪うと複製されない）。
		// 図形をクリックし直すと選択は維持したままキャンバスにフォーカスが戻る。
		await canvas.selectAt({ x: 500, y: 260 });

		// 複製すると 2 つになり、クローンも同じ背景色を持つ
		await canvas.duplicate();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(2);

		const objects = await canvas.captureObjects();
		const cloned = objects.find((obj) => obj.id !== srcId);
		expect(cloned?.id).toBeTruthy();
		expect(await canvas.computedColor(srcId, "fill")).toBe(customFill);
		expect(await canvas.computedColor(cloned!.id!, "fill")).toBe(customFill);
	});

	test("複製はテキストを引き継ぐ", async ({ canvas }) => {
		const text = "Duplicate Me";
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, text);
		await canvas.commitText();
		await expect(canvas.page.locator("body")).toContainText(text);

		// 図形を選び直して複製すると、同じテキストが 2 つレンダリングされる
		await canvas.selectAt({ x: 500, y: 260 });
		await canvas.duplicate();
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
				{ message: "複製後はテキストが 2 箇所に現れること" },
			)
			.toBe(2);
	});
});

import { test, expect } from "../../fixtures";

/**
 * CanvasDriver の ObjectMenu スライダー操作の動作確認。
 * border-style セクションの strokeWidth / rx スライダーを対象にする
 * （rect の stroke-width / rx 属性で結果を観測できる）。
 */
test.describe("ドライバ動作確認: ObjectMenu スライダー", () => {
	test("スライダーのドラッグで strokeWidth が変わり、選択は維持される", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const before = await rect.getAttribute("stroke-width");

		await canvas.openObjectMenu("border-style");
		await canvas.dragSliderBy("strokeWidth", 40);

		await expect
			.poll(() => rect.getAttribute("stroke-width"), {
				message: "スライダードラッグで stroke-width が変化すること",
			})
			.not.toBe(before);
		expect(await canvas.hasAnyControl()).toBe(true);
	});

	test("数値入力で strokeWidth を確定でき、選択は維持される", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);

		await canvas.openObjectMenu("border-style");
		await canvas.setNumberInput("strokeWidth", 8);

		await expect.poll(() => rect.getAttribute("stroke-width")).toBe("8");
		expect(await canvas.hasAnyControl()).toBe(true);
	});
});

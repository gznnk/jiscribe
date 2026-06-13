import { test, expect } from "../../fixtures";

/**
 * manual-test-gesture-attributes.md「5. 基本ジェスチャーの非回帰」のうち、
 * 既存 spec / driver で未カバーの項目を補う。
 * - 5-1 移動 → shapes/draw.spec.ts
 * - 5-2 リサイズ → driver/driver-transform.spec.ts（回転は本ファイル）
 * - 5-4 ホイール/ズーム・5-5 右ドラッグパン → driver/driver-input.spec.ts
 */
test.describe("基本ジェスチャーの非回帰", () => {
	// 5-3: 空白からのマーキードラッグで複数図形を選択できる
	test("5-3 マーキードラッグで複数図形を選択し、まとめて削除できる", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 440, y: 320 });
		await canvas.drawShape("Rectangle", { x: 560, y: 200 }, { x: 700, y: 320 });
		await canvas.deselect();

		const before = (await canvas.captureObjects()).length;
		expect(before).toBe(2);

		// 空白から両方を囲むマーキー
		await canvas.drag({ x: 240, y: 150 }, { x: 740, y: 360 }, 12);
		expect(await canvas.hasAnyControl()).toBe(true);

		// まとめて削除できる = 両方選択されていた
		await canvas.deleteSelection();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);
	});

	// 5-2（回転）: 回転ハンドルのドラッグで図形が回転する
	test("5-2 回転ハンドルのドラッグで図形が回転する", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 420, y: 220 },
			{ x: 580, y: 300 },
		);
		const before = await canvas.objectById(id).getAttribute("transform");

		// 回転ハンドルを中心の真上付近へドラッグして回転させる
		await canvas.dragTransformHandle("rotation", { x: 500, y: 120 });

		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "回転ハンドルのドラッグで transform が変化すること",
			})
			.not.toBe(before);
	});
});

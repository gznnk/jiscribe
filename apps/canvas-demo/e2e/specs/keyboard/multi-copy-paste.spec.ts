import { test, expect } from "../../fixtures";

/**
 * 複数選択のコピー＆ペーストが相対配置を保つことの検証。
 *
 * clipboard.spec は単一図形のコピペを数で守るだけで、複数選択をまとめてコピペしたときに
 * 「図形どうしの位置関係が保たれるか」は未カバーだった。複数クローン（cloneObjects + 一律
 * オフセット）は、各図形を別々にずらして相対配置を崩す退行が起きやすい。ペーストされた 2 つが
 * それぞれ元から +20,+20 ずれ、かつ元の間隔（260px）を保つことを transform で守る。
 */
test.describe("複数選択のコピー＆ペースト", () => {
	test("2 つまとめてコピペすると相対配置を保ったまま +20,+20 に複製される", async ({
		canvas,
	}) => {
		// A: 中心 (370,260) / B: 中心 (630,260)（横に 260px 離れている）
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 560, y: 200 },
			{ x: 700, y: 320 },
		);
		await canvas.deselect();

		// 全選択してコピー＆ペースト → 4 つになる
		await canvas.selectAll();
		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "コピペで 2 つ増えて合計 4 になること",
			})
			.toBe(4);

		// 元の 2 つは不動
		expect(await canvas.objectById(a).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 370, 260)",
		);
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 630, 260)",
		);

		// ペーストされた 2 つは A・B からそれぞれ +20,+20。間隔 260px は保たれる。
		const pastedTransforms = (await canvas.captureObjects())
			.filter((obj) => obj.id !== a && obj.id !== b)
			.map((obj) => obj.transform)
			.sort();
		expect(pastedTransforms).toEqual([
			"matrix(1, 0, 0, 1, 390, 280)",
			"matrix(1, 0, 0, 1, 650, 280)",
		]);
	});
});

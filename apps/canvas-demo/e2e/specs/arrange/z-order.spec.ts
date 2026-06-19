import { test, expect } from "../../fixtures";

/**
 * 重なり順（z-order）。SVG では DOM 順が描画順で、後ろの要素ほど前面に出る。
 * ObjectMenu の重なり順セクション（bringToFront / sendToBack）で並びが変わることを
 * captureObjects() の DOM 順インデックスで検証する。
 */
test.describe("重なり順", () => {
	test("bringToFront で最背面の図形が最前面（DOM 末尾）へ移動する", async ({
		canvas,
	}) => {
		// 作成順に DOM へ並ぶ: A(最背面) → B → C(最前面)
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 420, y: 300 },
		);
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 460, y: 200 }, { x: 580, y: 300 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 620, y: 200 }, { x: 740, y: 300 });
		await canvas.deselect();

		expect(await canvas.objectIndex(a)).toBe(0);

		await canvas.selectAt({ x: 360, y: 250 });
		await canvas.arrange("bringToFront");

		// A が DOM 末尾（最前面）に来る
		await expect.poll(() => canvas.objectIndex(a)).toBe(2);
	});

	test("sendToBack で最前面の図形が最背面（DOM 先頭）へ移動する", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 420, y: 300 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 460, y: 200 }, { x: 580, y: 300 });
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 620, y: 200 },
			{ x: 740, y: 300 },
		);
		await canvas.deselect();

		expect(await canvas.objectIndex(c)).toBe(2);

		await canvas.selectAt({ x: 680, y: 250 });
		await canvas.arrange("sendToBack");

		await expect.poll(() => canvas.objectIndex(c)).toBe(0);
	});
});

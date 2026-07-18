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

	test("bringForward は1段だけ前面へ上げる", async ({ canvas }) => {
		// A(0) → B(1) → C(2)
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 420, y: 300 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 460, y: 200 },
			{ x: 580, y: 300 },
		);
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 620, y: 200 },
			{ x: 740, y: 300 },
		);
		await canvas.deselect();

		// A を1段前へ → A と B が入れ替わる（最前面の C は動かない）
		await canvas.selectAt({ x: 360, y: 250 });
		await canvas.arrange("bringForward");

		await expect.poll(() => canvas.objectIndex(a)).toBe(1);
		expect(await canvas.objectIndex(b)).toBe(0);
		expect(await canvas.objectIndex(c)).toBe(2);
	});

	test("sendBackward は1段だけ背面へ下げる", async ({ canvas }) => {
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 420, y: 300 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 460, y: 200 },
			{ x: 580, y: 300 },
		);
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 620, y: 200 },
			{ x: 740, y: 300 },
		);
		await canvas.deselect();

		// C を1段後ろへ → C と B が入れ替わる（最背面の A は動かない）
		await canvas.selectAt({ x: 680, y: 250 });
		await canvas.arrange("sendBackward");

		await expect.poll(() => canvas.objectIndex(c)).toBe(1);
		expect(await canvas.objectIndex(b)).toBe(2);
		expect(await canvas.objectIndex(a)).toBe(0);
	});

	test("最前面で bringForward しても順序は変わらない（クランプ）", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 420, y: 300 });
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 620, y: 200 },
			{ x: 740, y: 300 },
		);
		await canvas.deselect();

		expect(await canvas.objectIndex(c)).toBe(1);

		await canvas.selectAt({ x: 680, y: 250 });
		await canvas.arrange("bringForward");

		// すでに最前面なので変わらない
		await expect.poll(() => canvas.objectIndex(c)).toBe(1);
	});

	test("最背面で sendBackward しても順序は変わらない（クランプ）", async ({
		canvas,
	}) => {
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 420, y: 300 },
		);
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 620, y: 200 }, { x: 740, y: 300 });
		await canvas.deselect();

		expect(await canvas.objectIndex(a)).toBe(0);

		await canvas.selectAt({ x: 360, y: 250 });
		await canvas.arrange("sendBackward");

		// すでに最背面なので変わらない
		await expect.poll(() => canvas.objectIndex(a)).toBe(0);
	});
});

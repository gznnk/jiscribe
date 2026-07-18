import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 複数選択・グループ選択に対するスタイル一括適用を守る。
 *
 * handlePropertyUpdate は選択中の全 id（およびグループの子孫）へプロパティを適用する。
 * 既存スイートは単一選択のスタイル設定は見るが、複数選択・グループ選択での一括適用は
 * 未カバーだった。背景色を 1 回設定して、選択した全図形に乗ることを computed fill で守る。
 */

/** 2 つの矩形を並べて描き、それぞれの id を返す（各描画後に選択解除） */
async function drawTwoRects(
	canvas: CanvasDriver,
): Promise<{ left: string; right: string }> {
	const left = await canvas.drawShape(
		"Rectangle",
		{ x: 340, y: 180 },
		{ x: 470, y: 300 },
	);
	await canvas.deselect();
	const right = await canvas.drawShape(
		"Rectangle",
		{ x: 560, y: 180 },
		{ x: 690, y: 300 },
	);
	await canvas.deselect();
	return { left, right };
}

test.describe("複数選択・グループへのスタイル一括適用", () => {
	test("マーキーで複数選択して背景色を設定すると全図形に反映される", async ({
		canvas,
	}) => {
		const { left, right } = await drawTwoRects(canvas);

		// 両方を完全に囲むマーキーで複数選択する。
		await canvas.drag({ x: 310, y: 150 }, { x: 720, y: 330 });
		await expect
			.poll(async () => (await canvas.visibleControlIds()).length)
			.toBeGreaterThan(0);

		const expectedFill = await canvas.normalizeColor("#22c55e");
		await canvas.setColor("bg-color", "#22c55e");

		await expect
			.poll(() => canvas.computedColor(left, "fill"))
			.toBe(expectedFill);
		expect(await canvas.computedColor(right, "fill")).toBe(expectedFill);
	});

	test("グループを選択して背景色を設定すると全メンバーに反映される", async ({
		canvas,
	}) => {
		const { left, right } = await drawTwoRects(canvas);

		await canvas.drag({ x: 310, y: 150 }, { x: 720, y: 330 });
		await expect
			.poll(async () => (await canvas.visibleControlIds()).length)
			.toBeGreaterThan(0);
		await canvas.group();

		// グループ選択状態で背景色を一括設定する（子孫へ再帰適用される経路）。
		const expectedFill = await canvas.normalizeColor("#f97316");
		await canvas.setColor("bg-color", "#f97316");

		await expect
			.poll(() => canvas.computedColor(left, "fill"))
			.toBe(expectedFill);
		expect(await canvas.computedColor(right, "fill")).toBe(expectedFill);
	});
});

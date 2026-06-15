import { test, expect } from "../../fixtures";

/**
 * リサイズハンドルの方向別挙動と Shift（アスペクト比固定）。
 * driver-transform.spec.ts は bottomRight の基本動作のみをカバーするため、
 * ここでは辺ハンドル（片軸のみ変化）と Shift 比率維持を補う。
 */
test.describe("リサイズ", () => {
	test("bottomCenter ハンドルは高さだけを変え、幅は変わらない", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const width = await rect.getAttribute("width");
		const height = await rect.getAttribute("height");

		// 下辺中央を 100px 下へ → 高さだけ増える
		await canvas.dragTransformHandle("bottomCenter", { x: 500, y: 420 });

		await expect.poll(() => rect.getAttribute("height")).not.toBe(height);
		expect(await rect.getAttribute("width")).toBe(width);
	});

	test("topLeft ハンドルのドラッグで幅・高さが変わる", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const width = await rect.getAttribute("width");
		const height = await rect.getAttribute("height");

		// 左上を内側へ寄せる → 幅・高さとも減る
		await canvas.dragTransformHandle("topLeft", { x: 460, y: 240 });

		await expect.poll(() => rect.getAttribute("width")).not.toBe(width);
		expect(await rect.getAttribute("height")).not.toBe(height);
	});

	test("Shift+bottomRight はアスペクト比を保つ", async ({ canvas }) => {
		// 200x120 の矩形（比 ≒ 1.667）
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const startWidth = Number(await rect.getAttribute("width"));
		const startHeight = Number(await rect.getAttribute("height"));
		const startRatio = startWidth / startHeight;

		// Shift を押しながら大きくする
		await canvas.dragTransformHandle(
			"bottomRight",
			{ x: 760, y: 360 },
			{ shift: true },
		);

		await expect
			.poll(() => rect.getAttribute("width"))
			.not.toBe(String(startWidth));

		const endWidth = Number(await rect.getAttribute("width"));
		const endHeight = Number(await rect.getAttribute("height"));
		// 比率が維持される（丸め誤差を許容）
		expect(endWidth / endHeight).toBeCloseTo(startRatio, 1);
	});
});

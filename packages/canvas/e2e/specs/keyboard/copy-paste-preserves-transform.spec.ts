import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * コピー＆ペースト／複製が回転（transform 行列の回転・スケール成分）を引き継ぐことを守る。
 *
 * 既存の preserves-content 系は背景色・テキスト・フォントは見るが、回転を含む transform が
 * クリップボード経由で保たれるかは未カバーだった。matrix(a,b,c,d,e,f) のうち a,b,c,d
 * （回転＋スケール）が複製先でも一致することを検証する（e,f は配置オフセットで変わる）。
 */

type Matrix = {
	a: number;
	b: number;
	c: number;
	d: number;
	e: number;
	f: number;
};

/** transform 文字列 "matrix(a, b, c, d, e, f)" を数値へ分解する */
function parseMatrix(transform: string | null): Matrix {
	const matched = (transform ?? "").match(/matrix\(([^)]+)\)/);
	if (!matched) {
		throw new Error(`matrix を解析できない: ${transform}`);
	}
	const [a, b, c, d, e, f] = matched[1].split(",").map(Number);
	return { a, b, c, d, e, f };
}

/** id の図形の transform 行列を取得する */
async function matrixOf(canvas: CanvasDriver, id: string): Promise<Matrix> {
	const objects = await canvas.captureObjects();
	const target = objects.find((obj) => obj.id === id);
	return parseMatrix(target?.transform ?? null);
}

/** 矩形を描いて回転させ、id を返す（回転後も選択維持） */
async function drawRotatedRect(canvas: CanvasDriver): Promise<string> {
	const id = await canvas.drawShape(
		"Rectangle",
		{ x: 420, y: 220 },
		{ x: 580, y: 300 },
	);
	// 回転ハンドルを中心の真上付近へドラッグして回転させる。
	await canvas.dragTransformHandle("rotation", { x: 500, y: 120 });
	return id;
}

test.describe("コピー＆ペースト／複製の回転保持", () => {
	test("コピー＆ペーストは回転（行列の a,b,c,d）を引き継ぐ", async ({
		canvas,
	}) => {
		const srcId = await drawRotatedRect(canvas);
		const src = await matrixOf(canvas, srcId);
		// 実際に回転していること（非回転なら b≈0 で検証が空振りする）。
		expect(Math.abs(src.b)).toBeGreaterThan(0.1);

		const before = await canvas.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before.length + 1);

		const cloned = (await canvas.captureObjects()).find(
			(obj) => !beforeIds.has(obj.id),
		);
		const clone = parseMatrix(cloned?.transform ?? null);
		expect(clone.a).toBeCloseTo(src.a, 2);
		expect(clone.b).toBeCloseTo(src.b, 2);
		expect(clone.c).toBeCloseTo(src.c, 2);
		expect(clone.d).toBeCloseTo(src.d, 2);
	});

	test("複製（Ctrl+D）は回転（行列の a,b,c,d）を引き継ぐ", async ({
		canvas,
	}) => {
		const srcId = await drawRotatedRect(canvas);
		const src = await matrixOf(canvas, srcId);
		expect(Math.abs(src.b)).toBeGreaterThan(0.1);

		const before = await canvas.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await canvas.duplicate();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before.length + 1);

		const cloned = (await canvas.captureObjects()).find(
			(obj) => !beforeIds.has(obj.id),
		);
		const clone = parseMatrix(cloned?.transform ?? null);
		expect(clone.a).toBeCloseTo(src.a, 2);
		expect(clone.b).toBeCloseTo(src.b, 2);
		expect(clone.c).toBeCloseTo(src.c, 2);
		expect(clone.d).toBeCloseTo(src.d, 2);
	});
});

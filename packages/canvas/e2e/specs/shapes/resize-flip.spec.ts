import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * リサイズハンドルを反対側の辺を越えてドラッグしたときの「反転（フリップ）」を守る。
 *
 * 実装はフリップを「width/height は絶対値、符号は scaleX/scaleY」で表現する
 * （TransformControlHandler: width: Math.abs(newWidth), scaleX: sign(newWidth)）。
 * 既存スイートは通常方向のリサイズは見るが、反対側を越える反転は未カバーだった。
 * 反転後も図形が壊れず（幅・高さは正）、行列の符号だけが反転することを守る。
 */

type Matrix = {
	a: number;
	b: number;
	c: number;
	d: number;
	e: number;
	f: number;
};

function parseMatrix(transform: string | null): Matrix {
	const matched = (transform ?? "").match(/matrix\(([^)]+)\)/);
	if (!matched) {
		throw new Error(`matrix を解析できない: ${transform}`);
	}
	const [a, b, c, d, e, f] = matched[1].split(",").map(Number);
	return { a, b, c, d, e, f };
}

async function matrixOf(canvas: CanvasDriver, id: string): Promise<Matrix> {
	return parseMatrix(await canvas.objectById(id).getAttribute("transform"));
}

async function sizeAttr(
	canvas: CanvasDriver,
	id: string,
): Promise<{ width: number; height: number }> {
	const el = canvas.objectById(id);
	return {
		width: Number(await el.getAttribute("width")),
		height: Number(await el.getAttribute("height")),
	};
}

test.describe("リサイズの反転（フリップ）", () => {
	test("右ハンドルを左辺の外まで引くと水平反転する（scaleX 符号反転・幅は正のまま）", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 560, y: 300 },
		);
		// 回転なしなので matrix.a = scaleX。初期は正。
		expect((await matrixOf(canvas, id)).a).toBeGreaterThan(0);

		// 右中央ハンドルを左辺（x=400）より左へ引く（ctrl でスナップ無効）。
		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: 320, y: 250 },
			{ ctrl: true },
		);

		const matrix = await matrixOf(canvas, id);
		const size = await sizeAttr(canvas, id);
		expect(matrix.a).toBeLessThan(0); // 水平反転
		expect(size.width).toBeGreaterThan(0); // 幅は正のまま（壊れていない）
		expect(size.height).toBeGreaterThan(0);
	});

	test("下ハンドルを上辺の外まで引くと垂直反転する（scaleY 符号反転・高さは正のまま）", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 560, y: 300 },
		);
		// 回転なしなので matrix.d = scaleY。初期は正。
		expect((await matrixOf(canvas, id)).d).toBeGreaterThan(0);

		// 下中央ハンドルを上辺（y=200）より上へ引く。
		await canvas.dragTransformHandle(
			"bottomCenter",
			{ x: 480, y: 140 },
			{ ctrl: true },
		);

		const matrix = await matrixOf(canvas, id);
		const size = await sizeAttr(canvas, id);
		expect(matrix.d).toBeLessThan(0); // 垂直反転
		expect(size.width).toBeGreaterThan(0);
		expect(size.height).toBeGreaterThan(0);
	});

	// 反転は scaleX/scaleY を行列の符号で表す経路で、Rectangle と同じだが既存テストは
	// Rectangle のみだった。Ellipse でも非矩形の両軸反転が同じ経路で効くことを守る。
	// Ellipse は width/height 属性を持たない（rx/ry）ため、「壊れていない」検証は
	// boundingBox の面積で行う。（Polygon は scale を points 側へ畳み込むため別経路で、
	// 行列符号では測れない。ここでは対象外とする。）
	test("Ellipse: 右ハンドルを左辺の外まで引くと水平反転する（scaleX 符号反転）", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Ellipse",
			{ x: 400, y: 200 },
			{ x: 560, y: 300 },
		);
		expect((await matrixOf(canvas, id)).a).toBeGreaterThan(0);

		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: 320, y: 250 },
			{ ctrl: true },
		);

		expect((await matrixOf(canvas, id)).a).toBeLessThan(0); // 水平反転
		const box = await canvas.objectById(id).boundingBox();
		expect(box?.width ?? 0).toBeGreaterThan(0); // 面積を保つ（壊れていない）
		expect(box?.height ?? 0).toBeGreaterThan(0);
	});

	test("Ellipse: 下ハンドルを上辺の外まで引くと垂直反転する（scaleY 符号反転）", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Ellipse",
			{ x: 400, y: 200 },
			{ x: 560, y: 300 },
		);
		expect((await matrixOf(canvas, id)).d).toBeGreaterThan(0);

		await canvas.dragTransformHandle(
			"bottomCenter",
			{ x: 480, y: 140 },
			{ ctrl: true },
		);

		expect((await matrixOf(canvas, id)).d).toBeLessThan(0); // 垂直反転
		const box = await canvas.objectById(id).boundingBox();
		expect(box?.width ?? 0).toBeGreaterThan(0);
		expect(box?.height ?? 0).toBeGreaterThan(0);
	});
});

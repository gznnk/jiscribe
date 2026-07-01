import { test, expect } from "../../fixtures";

/**
 * キーボードズーム（Ctrl+= / Ctrl+-）の「固定段への吸着」を精密に守る。
 *
 * 既存の zoom-keyboard.spec は「縮む／広がる」方向と中心保持までしか見ていない。
 * 実装（ZoomInCommand/ZoomOutCommand）は Miro のように固定段
 * （…/75/100/125/150/…、constants/zoom.ts の ZOOM_STOPS）へスナップし、
 * ズームイン→ズームアウトで必ず元の段（100% など）へ戻れる。
 * 等比（毎回 ×1.1/×0.9）へ戻す退行や、段がずれて 100% に戻らなくなる退行は
 * 方向・中心チェックだけでは捕まらないので、ここで段の値そのものを固める。
 *
 * 初期ズームは 100%（CanvasMapper の zoom:1）。viewBox 幅は width/round(zoom,4)
 * なので zoom = vb0.width / vb.width で ~1e-4 精度で復元できる。
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

const centerX = (vb: ViewBox): number => vb.minX + vb.width / 2;
const centerY = (vb: ViewBox): number => vb.minY + vb.height / 2;

/** 初期ズーム 100% を基準にした現在ズーム倍率。 */
const zoomOf = (vb0: ViewBox, vb: ViewBox): number => vb0.width / vb.width;

test.describe("キーボードズームの固定段吸着", () => {
	test("Ctrl+= は 100% → 125% → 150% と固定段へ吸着する", async ({
		canvas,
	}) => {
		const vb0 = parseViewBox(await canvas.getViewBox());

		await canvas.zoomIn();
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).width)
			.toBeLessThan(vb0.width);
		const vb1 = parseViewBox(await canvas.getViewBox());

		await canvas.zoomIn();
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).width)
			.toBeLessThan(vb1.width);
		const vb2 = parseViewBox(await canvas.getViewBox());

		// 100% から一段上＝125%、さらに一段上＝150%。
		expect(zoomOf(vb0, vb1)).toBeCloseTo(1.25, 3);
		expect(zoomOf(vb0, vb2)).toBeCloseTo(1.5, 3);
		// 高さも同じ段で連動する。
		expect(vb0.height / vb2.height).toBeCloseTo(1.5, 3);

		// 中心基点：画面中心の world 座標はステップを通じて不動。
		expect(centerX(vb2)).toBeCloseTo(centerX(vb0), 0);
		expect(centerY(vb2)).toBeCloseTo(centerY(vb0), 0);
	});

	test("Ctrl+- は 100% → 75% → 50% と固定段へ吸着する", async ({ canvas }) => {
		const vb0 = parseViewBox(await canvas.getViewBox());

		await canvas.zoomOut();
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).width)
			.toBeGreaterThan(vb0.width);
		const vb1 = parseViewBox(await canvas.getViewBox());

		await canvas.zoomOut();
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).width)
			.toBeGreaterThan(vb1.width);
		const vb2 = parseViewBox(await canvas.getViewBox());

		// 100% から一段下＝75%、さらに一段下＝50%。
		expect(zoomOf(vb0, vb1)).toBeCloseTo(0.75, 3);
		expect(zoomOf(vb0, vb2)).toBeCloseTo(0.5, 3);
		expect(vb0.height / vb2.height).toBeCloseTo(0.5, 3);

		expect(centerX(vb2)).toBeCloseTo(centerX(vb0), 0);
		expect(centerY(vb2)).toBeCloseTo(centerY(vb0), 0);
	});

	test("ズームイン後にズームアウトするとちょうど 100% へ戻る", async ({
		canvas,
	}) => {
		const vb0 = parseViewBox(await canvas.getViewBox());

		await canvas.zoomIn();
		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).width)
			.toBeLessThan(vb0.width);

		await canvas.zoomOut();
		await expect
			.poll(async () => zoomOf(vb0, parseViewBox(await canvas.getViewBox())))
			.toBeCloseTo(1, 3);

		// 等比だと 1.0×1.1×0.9=0.99 で 100% に戻らない。固定段なら必ず 100%。
		const vbBack = parseViewBox(await canvas.getViewBox());
		expect(zoomOf(vb0, vbBack)).toBeCloseTo(1, 3);
	});
});

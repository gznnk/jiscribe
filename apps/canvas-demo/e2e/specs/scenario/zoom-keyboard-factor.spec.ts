import { test, expect } from "../../fixtures";

/**
 * キーボードズーム（Ctrl+= / Ctrl+-）の「等比ステップ」を精密に守る。
 *
 * 既存の zoom-keyboard.spec は「縮む／広がる」方向と中心保持までしか見ていない。
 * 実装（ZoomInCommand/ZoomOutCommand）は zoom を毎回 ZOOM.IN_FACTOR=1.1 /
 * ZOOM.OUT_FACTOR=0.9 で「掛ける」等比ズームで、viewBox 幅は width/zoom なので
 * 1 ステップごとに一定倍率で変化する。これを加算ステップに変えてしまう退行や、
 * 倍率がステップで揺らぐ退行は方向・中心チェックだけでは捕まらない。
 *
 * ここでは「連続ステップの倍率が一定」かつ「2 ステップ後はちょうど factor² 倍」まで
 * 踏み込んで固める。viewBox 幅は width/round(zoom,4) なので倍率は ~1e-4 精度で正確。
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

/** ZOOM.IN_FACTOR / ZOOM.OUT_FACTOR（constants/zoom.ts）と一致させる */
const IN_FACTOR = 1.1;
const OUT_FACTOR = 0.9;

test.describe("キーボードズームの等比ステップ", () => {
	test("Ctrl+= は毎ステップ viewBox 幅を 1/1.1 倍にし、2 ステップで 1/1.21 倍になる", async ({
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

		// 1 ステップ目の倍率＝ 1/1.1。
		expect(vb1.width / vb0.width).toBeCloseTo(1 / IN_FACTOR, 3);
		// 2 ステップ目も同じ倍率（＝等比。加算なら倍率が変わって落ちる）。
		expect(vb2.width / vb1.width).toBeCloseTo(1 / IN_FACTOR, 3);
		// 2 ステップ後はちょうど factor² 倍。
		expect(vb2.width / vb0.width).toBeCloseTo(1 / (IN_FACTOR * IN_FACTOR), 3);
		// 高さも同じ倍率で連動する。
		expect(vb2.height / vb0.height).toBeCloseTo(1 / (IN_FACTOR * IN_FACTOR), 3);

		// 中心基点：画面中心の world 座標はステップを通じて不動。
		expect(centerX(vb2)).toBeCloseTo(centerX(vb0), 0);
		expect(centerY(vb2)).toBeCloseTo(centerY(vb0), 0);
	});

	test("Ctrl+- は毎ステップ viewBox 幅を 1/0.9 倍にし、2 ステップで 1/0.81 倍になる", async ({
		canvas,
	}) => {
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

		expect(vb1.width / vb0.width).toBeCloseTo(1 / OUT_FACTOR, 3);
		expect(vb2.width / vb1.width).toBeCloseTo(1 / OUT_FACTOR, 3);
		expect(vb2.width / vb0.width).toBeCloseTo(1 / (OUT_FACTOR * OUT_FACTOR), 3);
		expect(vb2.height / vb0.height).toBeCloseTo(
			1 / (OUT_FACTOR * OUT_FACTOR),
			3,
		);

		expect(centerX(vb2)).toBeCloseTo(centerX(vb0), 0);
		expect(centerY(vb2)).toBeCloseTo(centerY(vb0), 0);
	});
});

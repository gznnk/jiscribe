import { test, expect } from "../../fixtures";

/**
 * Ctrl+ホイールズームの「1 イベント＝固定倍率 1 ステップ（符号のみで決まり、量に依らない）」
 * を精密に守る。
 *
 * zoom-cursor-anchor.spec は基点保持を、zoom-keyboard-factor.spec はキーボード経路の等比性を
 * 守るが、ホイールズーム（CanvasEventHandler のズーム経路）の倍率は未検証だった。実装は
 *   zoomFactor = zoomDelta(=wheel deltaY) > 0 ? ZOOM.OUT_FACTOR : ZOOM.IN_FACTOR
 * で、deltaY の符号だけを見て 1 イベントにつき ×1.1 / ×0.9 を 1 回かける。deltaY の大小は
 * 倍率に影響しない。これを「deltaY の大小に依らず同じ倍率になる」ことまで踏み込んで固める。
 * 量に比例させる／複数ステップに化ける退行はここで落ちる。
 *
 * viewBox 幅 = viewport.width / round(zoom,4) なので、幅の比は ~1e-4 精度で倍率そのもの。
 * 倍率は基点に依らないため、ズーム位置は固定点でよい。
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

/** ZOOM.IN_FACTOR / ZOOM.OUT_FACTOR（constants/zoom.ts）と一致させる */
const IN_FACTOR = 1.1;
const OUT_FACTOR = 0.9;
/** ズームの基点（倍率は基点に依らないので固定点でよい） */
const ANCHOR = { x: 500, y: 400 };

async function viewBoxWidth(canvas: {
	getViewBox: () => Promise<string | null>;
}): Promise<number> {
	return parseViewBox(await canvas.getViewBox()).width;
}

test.describe("ホイールズームの 1 ステップ倍率", () => {
	test("Ctrl+ホイールは deltaY の符号だけで ×1.1 / ×0.9 を 1 回かける（量に依らない）", async ({
		canvas,
	}) => {
		const w0 = await viewBoxWidth(canvas);

		// 大きい deltaY でズームイン → viewBox 幅は 1/1.1 倍。
		await canvas.wheel(ANCHOR, { deltaY: -200, ctrl: true });
		await expect.poll(() => viewBoxWidth(canvas)).toBeLessThan(w0);
		const w1 = await viewBoxWidth(canvas);
		expect(w0 / w1).toBeCloseTo(IN_FACTOR, 3);

		// 小さい deltaY でズームイン → 同じ倍率（量に依らない）。
		await canvas.wheel(ANCHOR, { deltaY: -40, ctrl: true });
		await expect.poll(() => viewBoxWidth(canvas)).toBeLessThan(w1);
		const w2 = await viewBoxWidth(canvas);
		expect(w1 / w2).toBeCloseTo(IN_FACTOR, 3);

		// 大きい deltaY でズームアウト → viewBox 幅は 1/0.9 倍。
		await canvas.wheel(ANCHOR, { deltaY: 200, ctrl: true });
		await expect.poll(() => viewBoxWidth(canvas)).toBeGreaterThan(w2);
		const w3 = await viewBoxWidth(canvas);
		expect(w3 / w2).toBeCloseTo(1 / OUT_FACTOR, 3);

		// 小さい deltaY でズームアウト → 同じ倍率（量に依らない）。
		await canvas.wheel(ANCHOR, { deltaY: 25, ctrl: true });
		await expect.poll(() => viewBoxWidth(canvas)).toBeGreaterThan(w3);
		const w4 = await viewBoxWidth(canvas);
		expect(w4 / w3).toBeCloseTo(1 / OUT_FACTOR, 3);
	});
});

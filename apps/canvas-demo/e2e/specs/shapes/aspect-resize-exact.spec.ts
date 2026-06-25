import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Shift（アスペクト比維持）リサイズの「正確な寸法」を守る。
 *
 * resize.spec は Shift+bottomRight で比率が保たれること（ratio を toBeCloseTo(…,1)）までしか
 * 見ていない。実装は bottomRight アンカーで
 *   ・カーソルを topLeft→bottomRight の対角線へ射影してから
 *   ・newWidth = 射影x − topLeft.x、newHeight = newWidth / (width/height)
 *   ・アンカーは topLeft（固定）、中心 = topLeft + (w/2, h/2)
 * と計算する。ここでは対角線上の点へ落として「ちょうど 2 倍」になること、
 * すなわち寸法・中心・比率の数値そのものまで踏み込んで固める。射影や倍率の取り違えが
 * あると、比率は近くても寸法・中心がズレてここで落ちる。
 *
 * スナップは ctrl で無効化（単一図形では発火しないが念のため）。zoom=1。
 */

const TOLERANCE_PX = 2;

/** 矩形 (400,200)-(560,300): width=160 / height=100 / 比 1.6 / topLeft(400,200) */
const RECT_FROM = { x: 400, y: 200 };
const RECT_TO = { x: 560, y: 300 };
const TOP_LEFT = { x: 400, y: 200 };
const START_WIDTH = 160;
const START_HEIGHT = 100;

/** 図形の寸法と中心（transform の e,f）を読む */
async function frameOf(
	canvas: CanvasDriver,
	id: string,
): Promise<{ width: number; height: number; cx: number; cy: number }> {
	return canvas.objectById(id).evaluate((el) => {
		const transform = el.getAttribute("transform") ?? "";
		const match = transform.match(/^matrix\((.+)\)$/);
		const parts = match ? match[1].split(",").map((s) => Number(s.trim())) : [];
		return {
			width: Number(el.getAttribute("width")),
			height: Number(el.getAttribute("height")),
			cx: parts[4],
			cy: parts[5],
		};
	});
}

test.describe("Shift リサイズの正確な寸法", () => {
	test("対角線上へ Shift+bottomRight すると topLeft 固定でちょうど 2 倍になる", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		const before = await frameOf(canvas, id);
		expect(before.width).toBeCloseTo(START_WIDTH, 1);
		expect(before.height).toBeCloseTo(START_HEIGHT, 1);

		// topLeft(400,200) から対角方向 (160,100) の 2 倍先 = (720,400)。
		// この点は対角線上なので射影しても自身。newWidth=320, newHeight=320/1.6=200。
		await canvas.dragTransformHandle(
			"bottomRight",
			{ x: 720, y: 400 },
			{ shift: true, ctrl: true },
		);

		await expect
			.poll(async () => (await frameOf(canvas, id)).width, {
				message: "Shift+bottomRight で幅が拡大すること",
			})
			.toBeGreaterThan(before.width + 1);

		const after = await frameOf(canvas, id);
		// 寸法はちょうど 2 倍。
		expect(Math.abs(after.width - START_WIDTH * 2)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		expect(Math.abs(after.height - START_HEIGHT * 2)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		// 比率は厳密に維持（拡大しても 1.6 のまま）。
		expect(after.width / after.height).toBeCloseTo(
			START_WIDTH / START_HEIGHT,
			2,
		);
		// アンカーは topLeft。中心は topLeft + (新w/2, 新h/2) = (560, 300)。
		expect(Math.abs(after.cx - (TOP_LEFT.x + START_WIDTH))).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		expect(
			Math.abs(after.cy - (TOP_LEFT.y + START_HEIGHT)),
		).toBeLessThanOrEqual(TOLERANCE_PX);
	});
});

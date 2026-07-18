import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 辺ハンドル（片軸）リサイズの「アンカー＝反対側の辺」挙動を精密に守る。
 *
 * resize.spec は「動いた／動かない」までしか見ておらず、リサイズ実装の肝である
 *   ・引いた辺は反対側の辺を固定したまま動く
 *   ・寸法は引いた量ぶん増減する
 *   ・中心はその半分だけずれる（反対辺が固定なので）
 *   ・直交軸（幅⇔高さ）と直交軸の中心は動かない
 * という数値関係は未検証だった。アンカーの取り違え（中心固定で両側が動く等）が起きると
 * 「中心が半分ずれる」がここで崩れて落ちる。
 *
 * スナップは単一図形でも寸法吸着が入りうるため ctrl で無効化し、ハンドルの純粋な
 * 追従だけを測る。zoom=1 なので画面移動量＝world 移動量。
 */

const TOLERANCE_PX = 2;

/** 図形の現在の寸法（width/height）と中心（transform の e,f）を読む */
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

/**
 * 各辺ハンドルの検証ケース。
 * 描画矩形 (400,200)-(600,320) は width=200 / height=120 / 中心 (500,260)、
 * 上辺 y=200・下辺 y=320・左辺 x=400・右辺 x=600。
 * `to` はハンドル（辺の中点）を動かす先（コンテンツ座標）。
 */
const CASES = [
	{
		handle: "bottomCenter" as const,
		to: { x: 500, y: 420 }, // 下辺を +100 下へ
		expect: { dWidth: 0, dHeight: 100, dcx: 0, dcy: 50 },
	},
	{
		handle: "topCenter" as const,
		to: { x: 500, y: 140 }, // 上辺を 60 上へ
		expect: { dWidth: 0, dHeight: 60, dcx: 0, dcy: -30 },
	},
	{
		handle: "rightCenter" as const,
		to: { x: 680, y: 260 }, // 右辺を +80 右へ
		expect: { dWidth: 80, dHeight: 0, dcx: 40, dcy: 0 },
	},
	{
		handle: "leftCenter" as const,
		to: { x: 360, y: 260 }, // 左辺を 40 左へ
		expect: { dWidth: 40, dHeight: 0, dcx: -20, dcy: 0 },
	},
];

test.describe("辺ハンドルリサイズのアンカー挙動", () => {
	for (const testCase of CASES) {
		test(`${testCase.handle}: 反対辺を固定し、寸法は引いた量・中心は半分だけ動く`, async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 600, y: 320 },
			);
			const before = await frameOf(canvas, id);

			await canvas.dragTransformHandle(testCase.handle, testCase.to, {
				ctrl: true,
			});

			// リサイズが効いたこと（主軸の寸法が変わったこと）を先に待つ。
			const primaryIsWidth = testCase.expect.dWidth !== 0;
			await expect
				.poll(async () =>
					primaryIsWidth
						? (await frameOf(canvas, id)).width
						: (await frameOf(canvas, id)).height,
				)
				.not.toBe(primaryIsWidth ? before.width : before.height);

			const after = await frameOf(canvas, id);
			// 寸法は引いた量ぶん増える。
			expect(
				Math.abs(after.width - before.width - testCase.expect.dWidth),
			).toBeLessThanOrEqual(TOLERANCE_PX);
			expect(
				Math.abs(after.height - before.height - testCase.expect.dHeight),
			).toBeLessThanOrEqual(TOLERANCE_PX);
			// 中心は反対辺固定のため、引いた量の半分だけずれる。
			expect(
				Math.abs(after.cx - before.cx - testCase.expect.dcx),
			).toBeLessThanOrEqual(TOLERANCE_PX);
			expect(
				Math.abs(after.cy - before.cy - testCase.expect.dcy),
			).toBeLessThanOrEqual(TOLERANCE_PX);
		});
	}
});

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * リサイズの反転（フリップ）後の「正確な寸法・中心・符号」を守る。
 *
 * resize-flip.spec は反転で行列の符号が反転すること・幅高さが正のままであることまでで、
 * 反転後の寸法や中心がどこに来るかは未検証だった。実装は反対辺をアンカーに保つので、
 * 右辺ハンドルを左辺(x=400)の 100px 外(x=300)まで引くと、図形は [300,400] を占める：
 *   ・幅は越えた量ぶん = 100（絶対値）
 *   ・中心 x = (300+400)/2 = 350（反対辺 400 を固定した結果）
 *   ・scaleX 反転 = matrix.a = -1（無回転）
 *   ・直交軸（高さ・中心 y）は不変
 * アンカーや中心計算の取り違えは符号だけの検証では捕まらないため、ここで数値を固める。
 * スナップは ctrl で無効化。zoom=1。
 */

const TOLERANCE_PX = 2;

type Frame = {
	width: number;
	height: number;
	a: number;
	cx: number;
	cy: number;
};

async function frameOf(canvas: CanvasDriver, id: string): Promise<Frame> {
	return canvas.objectById(id).evaluate((el) => {
		const transform = el.getAttribute("transform") ?? "";
		const match = transform.match(/^matrix\((.+)\)$/);
		const parts = match ? match[1].split(",").map((s) => Number(s.trim())) : [];
		return {
			width: Number(el.getAttribute("width")),
			height: Number(el.getAttribute("height")),
			a: parts[0],
			cx: parts[4],
			cy: parts[5],
		};
	});
}

test.describe("リサイズ反転後の正確な寸法", () => {
	test("右辺を左辺の 100px 外まで引くと [300,400] を占める（幅100・中心350・a=-1）", async ({
		canvas,
	}) => {
		// 矩形 (400,200)-(560,300): 左400・右560・幅160・高100・中心(480,250)。
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 560, y: 300 },
		);
		const before = await frameOf(canvas, id);
		expect(before.a).toBeGreaterThan(0);

		// 右中央ハンドルを左辺(400)の 100px 外(x=300)へ引く（ctrl でスナップ無効）。
		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: 300, y: 250 },
			{ ctrl: true },
		);

		// 反転（a<0）が適用されるまで待つ。
		await expect
			.poll(async () => (await frameOf(canvas, id)).a, {
				message: "水平反転で a が負になること",
			})
			.toBeLessThan(0);

		const after = await frameOf(canvas, id);
		// 幅は越えた量ぶん = 100（絶対値、正のまま）。
		expect(Math.abs(after.width - 100)).toBeLessThanOrEqual(TOLERANCE_PX);
		// scaleX 反転 = -1（無回転なので a = scaleX）。
		expect(Math.abs(after.a - -1)).toBeLessThanOrEqual(0.02);
		// 中心 x は反対辺(400)固定の結果 (300+400)/2 = 350。
		expect(Math.abs(after.cx - 350)).toBeLessThanOrEqual(TOLERANCE_PX);
		// 直交軸（高さ・中心 y）は不変。
		expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		expect(Math.abs(after.cy - before.cy)).toBeLessThanOrEqual(TOLERANCE_PX);
	});
});

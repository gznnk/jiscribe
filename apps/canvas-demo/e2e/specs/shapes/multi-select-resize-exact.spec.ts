import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 複数選択リサイズの「正確な比例拡大」を守る。
 *
 * group-resize.spec は「両方が拡大し外側ほど開く／1 回の undo で戻る」までで、拡大率や
 * 各子の最終寸法・位置の数値は未検証だった。実装は選択全体の bbox を基準に、反対角を
 * アンカーとして各子の寸法と中心を同じ scale で拡大する。
 *
 * ドラッグ先を bbox の対角線上（アンカーから方向 (560,100) の 1.5 倍先）に取ることで
 * scaleX==scaleY==1.5 となり、複数選択リサイズが縦横比を保つか否かに依らず期待値が
 * 一意に定まる。各子の寸法・中心がちょうど 1.5 倍（アンカー基準）に動くことを固める。
 * 率の取り違えや子ごとに異なる拡大をする退行はここで落ちる。
 *
 * スナップは ctrl で無効化。zoom=1。
 */

const TOLERANCE_PX = 3;

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

test.describe("複数選択リサイズの正確な比例拡大", () => {
	test("角ハンドルを対角線上へ引くと各子が 1.5 倍ちょうどに拡大する", async ({
		canvas,
	}) => {
		// A: (220,160)-(380,260) 中心(300,210) / B: (620,160)-(780,260) 中心(700,210)。
		// グループ bbox: 左220・上160・右780・下260（幅560×高100）。
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 220, y: 160 },
			{ x: 380, y: 260 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 620, y: 160 },
			{ x: 780, y: 260 },
		);
		await canvas.deselect();

		// マーキーで両方を完全包含選択。
		await canvas.drag({ x: 180, y: 120 }, { x: 820, y: 300 }, 12);

		// 右下角(780,260)を対角線上の (1060,310) へ。アンカー=左上(220,160)。
		// 方向 (560,100) の 1.5 倍先なので scaleX==scaleY==1.5（縦横比保持の有無に依らず一意）。
		await canvas.dragTransformHandle(
			"bottomRight",
			{ x: 1060, y: 310 },
			{ ctrl: true },
		);

		await expect
			.poll(async () => (await frameOf(canvas, a)).width, {
				message: "A の幅が拡大すること",
			})
			.toBeGreaterThan(160);

		const af = await frameOf(canvas, a);
		const bf = await frameOf(canvas, b);

		// 寸法は 1.5 倍: 幅160→240, 高100→150（両子とも同率）。
		expect(Math.abs(af.width - 240)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(af.height - 150)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(bf.width - 240)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(bf.height - 150)).toBeLessThanOrEqual(TOLERANCE_PX);

		// 中心はアンカー(220,160)からの距離が 1.5 倍: A(300,210)→(340,235)、B(700,210)→(940,235)。
		expect(Math.abs(af.cx - 340)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(af.cy - 235)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(bf.cx - 940)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(bf.cy - 235)).toBeLessThanOrEqual(TOLERANCE_PX);
	});
});

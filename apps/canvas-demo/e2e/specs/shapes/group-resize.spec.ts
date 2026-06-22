import { test, expect } from "../../fixtures";

/**
 * 複数選択（マルチセレクト）のリサイズ。
 *
 * 単一図形のリサイズは resize / rotated-resize / driver-transform が守るが、複数選択を
 * まとめてリサイズすると、選択全体のバウンディングボックス（calcMultiSelectGroupBounds）を
 * 基準に各子が拡大縮小される。これは各子の寸法だけでなく位置（中心）も比例で動かす操作で、
 * (1) 子の寸法が変わらない（位置だけ動く）、(2) 一部の子だけ拡大される、(3) 履歴が分かれて
 * 1 回の undo で戻りきらない、といった退行が起きやすい。「両方が拡大し、外側の子ほど外へ
 * 開く」「1 回の undo で両方戻る」で守る。
 */

/** transform="matrix(a,b,c,d,e,f)" の中心X（e）を返す */
function centerXOf(transform: string | null): number {
	const nums = transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`transform を解釈できない: ${transform}`);
	}
	return nums[4];
}

test.describe("複数選択のリサイズ（比例拡大）", () => {
	test("マルチセレクトの角ハンドルは両図形を比例拡大し、1 回の undo で両方戻る", async ({
		canvas,
	}) => {
		// 横並びの 2 矩形（各 幅160・高さ100）。
		// A 中心 (300,210) / B 中心 (700,210)。グループ bbox: left=220 right=780 top=160 bottom=260。
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

		const aRect = canvas.objectById(a);
		const bRect = canvas.objectById(b);
		const aWidthBefore = Number(await aRect.getAttribute("width"));
		const bWidthBefore = Number(await bRect.getAttribute("width"));
		const aTransformBefore = await aRect.getAttribute("transform");
		const bTransformBefore = await bRect.getAttribute("transform");
		const bCenterXBefore = centerXOf(bTransformBefore);

		// マーキーで両方を選択（完全包含）。
		await canvas.drag({ x: 180, y: 120 }, { x: 820, y: 300 }, 12);

		// グループ bbox の右下角（780,260）を外側へドラッグして拡大する。
		// 左上角 (220,160) を固定点に、x は 560→820、y は 100→200 へ拡大される。
		await canvas.dragTransformHandle("bottomRight", { x: 1040, y: 360 });

		// 比例拡大なので両方の幅が増える（位置だけ動く退行を弾く）。
		await expect
			.poll(() => aRect.getAttribute("width").then(Number), {
				message: "A の幅が拡大すること",
			})
			.toBeGreaterThan(aWidthBefore);
		expect(Number(await bRect.getAttribute("width"))).toBeGreaterThan(
			bWidthBefore,
		);

		// 外側（右）の子ほど外へ開く: B の中心Xは右へ動く。
		expect(centerXOf(await bRect.getAttribute("transform"))).toBeGreaterThan(
			bCenterXBefore,
		);

		// 1 回の undo で両図形の寸法・位置がまとめて元へ戻る（履歴 1 エントリ）。
		await canvas.undo();
		await expect
			.poll(() => aRect.getAttribute("transform"), {
				message: "1 回の undo で A が元の寸法・位置へ戻ること",
			})
			.toBe(aTransformBefore);
		expect(await aRect.getAttribute("width")).toBe(String(aWidthBefore));
		expect(await bRect.getAttribute("transform")).toBe(bTransformBefore);
		expect(await bRect.getAttribute("width")).toBe(String(bWidthBefore));
	});
});

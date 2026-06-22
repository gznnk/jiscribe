import { test, expect } from "../../fixtures";

/**
 * 複数選択（マルチセレクト）の回転。
 *
 * 単一図形の回転は rotate-undo / basic-gestures が守るが、複数選択をまとめて回転すると
 * 各図形はグループ中心まわりに「公転」する（rotateChildren）。これは各子の向きだけでなく
 * 中心座標（transform の e,f）も書き換える操作で、(1) 一部の子だけ回ってしまう、
 * (2) その場回転になって公転しない、(3) 履歴が子ごとに分かれて 1 回の undo で戻りきらない、
 * といった退行が起きやすい。「両方の中心が動く」「1 回の undo で両方戻る」で守る。
 */

/** transform="matrix(a,b,c,d,e,f)" から中心座標（e,f）を取り出す */
function centerOf(transform: string | null): { x: number; y: number } {
	if (!transform) {
		throw new Error("transform が取得できない");
	}
	const nums = transform.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`transform を解釈できない: ${transform}`);
	}
	return { x: nums[4], y: nums[5] };
}

test.describe("複数選択の回転（公転）", () => {
	test("マルチセレクトの回転は両図形を中心まわりに公転させ、1 回の undo で両方戻る", async ({
		canvas,
	}) => {
		// 横並びの 2 矩形。A 中心 (300,210) / B 中心 (700,210)。
		// グループ中心はおよそ (500,210)。
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

		const aBefore = await canvas.objectById(a).getAttribute("transform");
		const bBefore = await canvas.objectById(b).getAttribute("transform");

		// マーキーで両方を選択する（完全包含）。
		await canvas.drag({ x: 180, y: 120 }, { x: 820, y: 300 }, 12);

		// 回転ハンドルを横へ大きくドラッグして回す。グループ中心まわりに公転するはず。
		await canvas.dragTransformHandle("rotation", { x: 760, y: 210 });

		// A の中心が動く（その場回転ではなく公転している）まで待つ。
		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "回転で A の transform が変化すること",
			})
			.not.toBe(aBefore);

		const aRotated = await canvas.objectById(a).getAttribute("transform");
		const bRotated = await canvas.objectById(b).getAttribute("transform");

		// 公転なので両方の中心座標が初期位置から動いている。
		expect(centerOf(aRotated)).not.toEqual(centerOf(aBefore));
		expect(centerOf(bRotated)).not.toEqual(centerOf(bBefore));
		// B も回転して transform が変わっている（片方だけ回る退行を弾く）。
		expect(bRotated).not.toBe(bBefore);

		// 1 回の undo で両図形がまとめて元へ戻る（履歴が 1 エントリにまとまっている）。
		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "1 回の undo で A が元の向き・位置へ戻ること",
			})
			.toBe(aBefore);
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(bBefore);
	});
});

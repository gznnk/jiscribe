import { test, expect } from "../../fixtures";

/**
 * 複数選択（マルチセレクト）をまとめて移動するときのスナップ（吸着）。
 *
 * snap.spec は単一図形の移動スナップを守るが、複数選択をまとめて動かすときは
 * 選択全体のバウンディングボックスの辺／中心がスナップ候補になる（グループ bbox 経由）。
 * 単一図形と複数選択ではスナップに渡す矩形が異なるため別経路で、壊れると「まとめて動かすと
 * 吸着しない」退行になる。ドラッグ中の青ガイドと、解放後に確定した中心座標で守る。
 *
 * 既定ビューポート（zoom=1）では画面座標＝SVG 座標、スナップ閾値は 8（SNAP_THRESHOLD_PX）。
 */

/** transform="matrix(a,b,c,d,e,f)" の中心X（e）を返す */
function centerXOf(transform: string | null): number {
	const nums = transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`transform を解釈できない: ${transform}`);
	}
	return nums[4];
}

test.describe("複数選択のまとめ移動スナップ", () => {
	test("まとめて動かすと選択全体の右辺が相手の右辺へ吸着する", async ({
		canvas,
	}) => {
		// 参照 A: 中心 (500,200)・右辺 x=600（スナップ相手）。
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();

		// B・C（各 幅120）を縦に重ねて配置。両方とも left=300 right=420。
		// グループ bbox の右辺は 420。中心・左辺は A の候補（400/500/600）から離してあるので、
		// 右辺どうしのスナップだけが狙える。
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 450 },
			{ x: 420, y: 520 },
		);
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 540 },
			{ x: 420, y: 610 },
		);
		await canvas.deselect();

		// マーキーで B・C を選択。
		await canvas.drag({ x: 280, y: 430 }, { x: 440, y: 630 }, 12);

		// グループを右へ動かして、右辺(420)を A の右辺(600)近くへ寄せる。
		// B 中心 360 → 537（+177）でグループ右辺 ≒ 597（600 から距離 3、閾値内）。
		await canvas.dragInspecting(
			{ x: 360, y: 485 },
			{ x: 537, y: 485 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(1);
				expect(await canvas.snapGuideCoordinates("x")).toEqual([600]);
			},
		);

		// 解放後: グループ右辺が 600 へ吸着 → B・C の中心X は 540（右辺 600 − 半幅 60）。
		// 吸着しなければ 537 付近のはず。
		await expect
			.poll(async () => {
				const obj = (await canvas.captureObjects()).find((o) => o.id === b);
				return centerXOf(obj?.transform ?? null);
			})
			.toBe(540);
		const cObj = (await canvas.captureObjects()).find((o) => o.id === c);
		expect(centerXOf(cObj?.transform ?? null)).toBe(540);
	});
});

import { test, expect } from "../../fixtures";

/**
 * リサイズ中のエッジスナップ（吸着）の非回帰。
 *
 * snap.spec は「図形の移動」時のスナップを守るが、リサイズハンドルで辺を動かしたときの
 * スナップ（TransformControlHandler のスナップ経路）は未カバーだった。移動スナップと
 * リサイズスナップは別コードで、リサイズ側はスナップ結果を最終ジオメトリ（幅・中心）へ
 * 反映する（snapped を resizeResult に採用）ぶん、壊れると「辺が相手に揃わない」かたちで
 * 退行する。スナップ後は確定ジオメトリに残るため、解放後の width / 中心X で守る（ドラッグ
 * 中ガイドの内観は不要でフレークしにくい）。
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

test.describe("リサイズ中のエッジスナップ", () => {
	test("右辺ハンドルを相手の右辺の近くまで縮めると右辺が吸着し、幅が確定する", async ({
		canvas,
	}) => {
		// A: 中心 (500,200)・幅 200。right = 600（スナップ相手）。
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();

		// B: A の下に配置。left=300・right=555・幅 255・中心X 427.5。
		// 中心X は A の各候補（500/400/600）から十分離れているので、中央スナップは起きず
		// 右辺どうしのエッジスナップだけが狙える。
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 400 },
			{ x: 555, y: 500 },
		);
		const bRect = canvas.objectById(bId);
		expect(await bRect.getAttribute("width")).toBe("255");

		// B の右辺ハンドルを x=596 まで引く。596 は A の right=600 から距離 4（閾値 8 内）。
		// 左辺(300)は固定なので、右辺が 600 へ吸着すれば 幅=300・中心X=450 に確定する。
		await canvas.dragTransformHandle("rightCenter", { x: 596, y: 450 });

		// 右辺が 600 に吸着して幅が 300 になる（吸着しなければ 296 付近のはず）。
		await expect
			.poll(() => bRect.getAttribute("width"), {
				message: "右辺が相手の right=600 に吸着して幅が 300 に確定すること",
			})
			.toBe("300");

		// 中心X も left=300・right=600 の中点 450 に確定する。
		const b = (await canvas.captureObjects()).find((o) => o.id === bId);
		expect(centerXOf(b?.transform ?? null)).toBeCloseTo(450, 1);
	});

	test("Ctrl 押下中のリサイズはスナップせず、右辺はドロップ位置のまま確定する", async ({
		canvas,
	}) => {
		// 同じ配置: A の right=600 がスナップ候補。
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 400 },
			{ x: 555, y: 500 },
		);
		const bRect = canvas.objectById(bId);

		// Ctrl を押しながら右辺を x=596 まで引く。スナップ無効なので 600 へ吸着しない。
		// 左辺(300)固定・右辺 596 のまま → 幅 ≒ 296（スナップ時の 300 にはならない）。
		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: 596, y: 450 },
			{ ctrl: true },
		);

		await expect
			.poll(() => bRect.getAttribute("width").then(Number), {
				message: "Ctrl 押下中はスナップせず幅が 300 にならないこと",
			})
			.toBeLessThan(299);
		expect(Number(await bRect.getAttribute("width"))).toBeGreaterThan(293);
	});
});

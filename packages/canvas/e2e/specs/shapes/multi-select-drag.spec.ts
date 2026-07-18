import { test, expect } from "../../fixtures";

/**
 * 複数選択した図形を「ポインタドラッグ」でまとめて動かしたとき、全員が同じデルタだけ
 * 動き相対位置が保たれることを精密に守る。
 *
 * multi-nudge は矢印キー（コマンド経路）でのまとめ移動を守るが、ポインタドラッグ
 * （ジェスチャー経路 / moveSelection）でのまとめ移動は未カバーだった。掴んだ図形だけ
 * 動く・相対位置が崩れる・カーソルへ飛びつく退行は別経路で起きうる。両図形の
 * transform をデルタ一致で固める。
 *
 * 単一でないため掴んだ図形・他方ともスナップ候補から除外され、zoom=1 で移動量は厳密。
 */
test.describe("複数選択のドラッグ移動", () => {
	test("複数選択をドラッグすると全員が同じ量だけ動き相対位置を保つ", async ({
		canvas,
	}) => {
		// A: 中心 (370,260) / B: 中心 (630,260)
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 560, y: 200 },
			{ x: 700, y: 320 },
		);
		await canvas.deselect();

		await canvas.selectAll();

		// A の中心 (370,260) を掴んで (+100,+100) ドラッグ。
		await canvas.drag({ x: 370, y: 260 }, { x: 470, y: 360 });

		// 両方が (+100,+100)。相対距離（中心間 260px）も保たれる。
		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A が (+100,+100) 動くこと",
			})
			.toBe("matrix(1, 0, 0, 1, 470, 360)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 730, 360)",
		);
	});
});

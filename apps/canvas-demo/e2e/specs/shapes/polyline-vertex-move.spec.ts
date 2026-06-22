import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * ポリライン頂点の「移動」と undo / redo。
 *
 * polyline-vertex は頂点の挿入・削除を守るが、既存頂点ハンドル（vertex-control）を
 * ドラッグして座標を動かす経路（VertexControlHandler の drag）は未カバーだった。
 * 頂点移動は points 配列の 1 要素だけを書き換える編集で、履歴エントリを作り損ねると
 * 「頂点を動かしたのに undo で戻せない」非対称な退行になる。points 文字列の往復で守る。
 */

/** data-id を持つコントロールの中心からドラッグする */
async function dragControl(
	canvas: CanvasDriver,
	dataId: string,
	to: { x: number; y: number },
) {
	const control = canvas.page.locator(`[data-id="${dataId}"]`);
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`コントロール ${dataId} の位置が取得できない`);
	}
	await canvas.drag(
		{ x: box.x + box.width / 2, y: box.y + box.height / 2 },
		to,
		10,
	);
}

test.describe("ポリライン頂点の移動", () => {
	test("頂点ハンドルのドラッグで座標が変わり、undo で戻り redo で再適用される", async ({
		canvas,
	}) => {
		// 水平な 2 点ポリライン（300,300 → 600,300）。描画直後は選択済みで頂点ハンドルが出る。
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 300 },
		);
		const before = await canvas.objectById(id).getAttribute("points");

		// 右端の頂点（index 1）を斜め上へドラッグして動かす。
		await dragControl(canvas, `vertex-control:${id}:1`, { x: 650, y: 180 });

		await expect
			.poll(() => canvas.objectById(id).getAttribute("points"), {
				message: "頂点移動で points が変化すること",
			})
			.not.toBe(before);
		const moved = await canvas.objectById(id).getAttribute("points");

		// undo で元の頂点座標へ戻る。
		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("points"), {
				message: "undo で頂点が元の座標へ戻ること",
			})
			.toBe(before);

		// redo で移動後の座標が再適用される。
		await canvas.redo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("points"), {
				message: "redo で頂点移動が再適用されること",
			})
			.toBe(moved);
	});
});

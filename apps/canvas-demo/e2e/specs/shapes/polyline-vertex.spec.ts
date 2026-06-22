import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * ポリラインの頂点追加。
 *
 * セグメント中点ハンドルのドラッグによる頂点挿入（VertexInsertHandler）はポリライン編集の
 * 中核だが e2e が無かった。中点ハンドルをドラッグすると、その位置に頂点が 1 つ増えることを
 * points 属性の頂点数で守る。
 *
 * NOTE: 頂点ハンドルを選択して Delete する経路は、並列実行時に図形ごと消える挙動を確認
 * （選択コミットを塗り色で待っても再現）。プロダクト側の調査が必要なため、ここでは追加のみを
 * 対象とし、削除はあえてテスト化しない（赤を隠さない方針に従い、未確定の挙動は固定しない）。
 */

/** points 属性から頂点数を数える（"x1,y1 x2,y2" → 2） */
async function vertexCount(canvas: CanvasDriver, id: string): Promise<number> {
	const points = await canvas.objectById(id).getAttribute("points");
	return points ? points.trim().split(/\s+/).length : 0;
}

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

test.describe("ポリラインの頂点追加", () => {
	test("セグメント中点ハンドルのドラッグで頂点が増える", async ({ canvas }) => {
		// 水平な 2 点ポリライン（中点は 450,300）。描画直後は選択済みで頂点ハンドルが出る。
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 300 },
		);
		expect(await vertexCount(canvas, id)).toBe(2);

		// セグメント0の中点ハンドルを下へドラッグ → 中央に頂点が挿入される
		await dragControl(canvas, `vertex-insert:${id}:0`, { x: 450, y: 420 });

		await expect
			.poll(() => vertexCount(canvas, id), {
				message: "中点ドラッグで頂点が 3 つになること",
			})
			.toBe(3);
	});
});

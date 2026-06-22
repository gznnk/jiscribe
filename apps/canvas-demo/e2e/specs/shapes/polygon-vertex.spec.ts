import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * ポリゴン（閉じた図形）の頂点追加。
 *
 * polyline-vertex.spec は開いたポリラインの中点挿入を守る。ポリゴンは閉じているため
 * VertexInsertControls が「最後の頂点→最初の頂点」を結ぶ閉合セグメントにも中点ハンドルを
 * 出す（closed 経路）。閉じた図形でも中点ドラッグで頂点が 1 つ増えることを points 属性で守る。
 */

/** points 属性から頂点数を数える（"x1,y1 x2,y2 ..." の空白区切り） */
async function vertexCount(canvas: CanvasDriver, id: string): Promise<number> {
	const points = await canvas.objectById(id).getAttribute("points");
	return points ? points.trim().split(/\s+/).length : 0;
}

/** data-id を持つコントロールの中心から相対量だけドラッグする */
async function dragControlBy(
	canvas: CanvasDriver,
	dataId: string,
	delta: { dx: number; dy: number },
) {
	const control = canvas.page.locator(`[data-id="${dataId}"]`);
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`コントロール ${dataId} の位置が取得できない`);
	}
	const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
	await canvas.drag(from, { x: from.x + delta.dx, y: from.y + delta.dy }, 10);
}

test.describe("ポリゴンの頂点追加", () => {
	test("セグメント中点ハンドルのドラッグで閉じた図形の頂点が増える", async ({
		canvas,
	}) => {
		// 対角ドラッグでポリゴンを配置（描画直後は選択済みで頂点ハンドルが出る）
		const id = await canvas.drawShape(
			"Polygon",
			{ x: 400, y: 200 },
			{ x: 600, y: 360 },
		);
		const before = await vertexCount(canvas, id);
		expect(before).toBeGreaterThanOrEqual(3); // 閉じた図形は最低 3 頂点

		// セグメント0の中点ハンドルを外側へドラッグ → 頂点が 1 つ挿入される
		await dragControlBy(canvas, `vertex-insert:${id}:0`, { dx: 0, dy: 80 });

		await expect
			.poll(() => vertexCount(canvas, id), {
				message: "中点ドラッグで頂点が 1 つ増えること",
			})
			.toBe(before + 1);
		// ポリゴンのまま（閉じた図形であり続ける）
		const created = (await canvas.captureObjects()).find((o) => o.id === id);
		expect(created?.tag).toBe("polygon");
	});
});

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
	// box は画面座標。コンテンツ座標へ変換してから相対量を足す。
	const from = canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
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

	test("頂点ハンドルを選んで Delete すると頂点が 1 つ減り、undo で戻る", async ({
		canvas,
	}) => {
		// 既定のポリゴンは正五角形（5 頂点）。閉じた図形の最小頂点数は 3 なので 1 つは消せる。
		const id = await canvas.drawShape(
			"Polygon",
			{ x: 400, y: 200 },
			{ x: 600, y: 360 },
		);
		const before = await vertexCount(canvas, id);
		expect(before).toBe(5);

		// 頂点 0（真上）ハンドルをクリックして選択。選択中ハンドルの塗りは選択色になる。
		// この塗り変化（selectedVertex のコミット）を待ってから Delete する。
		const selectedFill = await canvas.normalizeColor("#0d99ff");
		await canvas.page.click(`[data-id="vertex-control:${id}:0"]`);
		await expect
			.poll(
				() =>
					canvas.page
						.locator(`[data-id="vertex-control:${id}:0"]`)
						.evaluate((el) => getComputedStyle(el).fill),
				{ message: "頂点が選択状態（塗りが選択色）になること" },
			)
			.toBe(selectedFill);
		await canvas.deleteSelection();

		// 頂点が 1 つ減り、閉じた図形（polygon）であり続ける。
		await expect
			.poll(() => vertexCount(canvas, id), {
				message: "頂点削除で 4 つになること",
			})
			.toBe(before - 1);
		const afterDelete = (await canvas.captureObjects()).find(
			(o) => o.id === id,
		);
		expect(afterDelete?.tag).toBe("polygon");

		// undo で頂点数が元へ戻る。
		await canvas.undo();
		await expect
			.poll(() => vertexCount(canvas, id), {
				message: "undo で頂点が 5 つへ戻ること",
			})
			.toBe(before);
	});
});

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * ポリラインの頂点編集（追加・削除）。
 *
 * 頂点挿入（VertexInsertHandler）と、頂点ハンドル選択 → Delete による削除
 * （VertexControlHandler.handleClick → DeleteCommand の selectedVertex 経路）を守る。
 * 中点ハンドルのドラッグで頂点が増え、中間頂点を選んで Delete で減ることを points 属性で検証する。
 *
 * 同期メモ: 頂点選択は塗りが選択色（#0d99ff）に変わることで確定する。Delete はこのコミットを
 * 待ってから押す。
 *
 * 検証メモ: 中間頂点を消すとポリラインは水平な直線（高さ 0）に戻る。高さ 0 の要素は
 * Playwright の toBeVisible() が hidden 扱いするため、存在確認は count（および頂点数）で行う。
 */

/** points 属性から頂点数を数える（"x1,y1 x2,y2" → 2） */
async function vertexCount(canvas: CanvasDriver, id: string): Promise<number> {
	const points = await canvas.objectById(id).getAttribute("points");
	return points ? points.trim().split(/\s+/).length : 0;
}

/** コントロール（CSS セレクタ）の中心からドラッグする */
async function dragControl(
	canvas: CanvasDriver,
	controlSelector: string,
	to: { x: number; y: number },
) {
	const control = canvas.page.locator(controlSelector);
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`コントロール ${controlSelector} の位置が取得できない`);
	}
	// box は画面座標。drag はコンテンツ座標を取るので toContent で揃える。
	await canvas.drag(
		canvas.toContent({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
		to,
		10,
	);
}

test.describe("ポリラインの頂点編集", () => {
	test("セグメント中点ハンドルのドラッグで頂点が増える", async ({ canvas }) => {
		// 水平な 2 点ポリライン（中点は 450,300）。描画直後は選択済みで頂点ハンドルが出る。
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 300 },
		);
		expect(await vertexCount(canvas, id)).toBe(2);

		// セグメント0の中点ハンドルを下へドラッグ → 中央に頂点が挿入される
		await dragControl(
			canvas,
			`[data-id="${id}"][data-part="vertex-insert:0"]`,
			{ x: 450, y: 420 },
		);

		await expect
			.poll(() => vertexCount(canvas, id), {
				message: "中点ドラッグで頂点が 3 つになること",
			})
			.toBe(3);
	});

	test("中間頂点ハンドルを選んで Delete すると頂点が減る", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 300 },
		);
		// まず中点をドラッグして 3 点にする（挿入頂点は index 1）
		await dragControl(
			canvas,
			`[data-id="${id}"][data-part="vertex-insert:0"]`,
			{ x: 450, y: 420 },
		);
		await expect.poll(() => vertexCount(canvas, id)).toBe(3);

		// 中間頂点ハンドルをクリックして選択。選択中ハンドルの塗りは選択色になる。
		// この塗り変化（＝selectedVertex のコミット）を待ってから Delete する。
		const selectedFill = await canvas.normalizeColor("#0d99ff");
		await canvas.page.click(`[data-id="${id}"][data-part="vertex:1"]`);
		await expect
			.poll(
				() =>
					canvas.page
						.locator(`[data-id="${id}"][data-part="vertex:1"]`)
						.evaluate((el) => getComputedStyle(el).fill),
				{ message: "頂点が選択状態（塗りが選択色）になること" },
			)
			.toBe(selectedFill);
		await canvas.deleteSelection();

		// 図形自体は残り（高さ 0 の直線になるため可視判定ではなく count で確認）、頂点だけが 1 つ減る
		await expect
			.poll(() => vertexCount(canvas, id), {
				message: "頂点削除で 2 つに戻ること",
			})
			.toBe(2);
		expect(await canvas.objectById(id).count()).toBe(1);
	});
});

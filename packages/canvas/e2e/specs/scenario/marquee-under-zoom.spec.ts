import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 非等倍 viewBox（ズーム中）でのマーキー範囲選択が、画面上で囲った矩形を正しく
 * world へ逆変換して包含判定することの検証（screen→world の選択ヒットテスト）。
 *
 * drag / resize / draw-under-zoom はいずれも図形の移動・リサイズ・作成という
 * トランスフォーム経路を守るが、選択（collectIdsInArea の包含判定）には触れない。
 * マーキー矩形を world へ変換し損ねると「画面で囲ったのと違う図形が選ばれる」
 * 体感バグになるが、zoom=1 では content==world で退行が隠れる。ここでは scale≠1 を
 * 作るためにズームアウト（scale>1）した状態で、画面上 A だけを囲えば A だけが
 * 選ばれることを「まとめナッジで動いたか」で確かめる。
 */

/** 図形の画面上 bbox をコンテンツ座標の left/top/right/bottom で返す */
async function contentBox(
	canvas: CanvasDriver,
	id: string,
): Promise<{ left: number; top: number; right: number; bottom: number }> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`図形 ${id} の boundingBox が取得できない`);
	}
	const topLeft = canvas.toContent({ x: box.x, y: box.y });
	return {
		left: topLeft.x,
		top: topLeft.y,
		right: topLeft.x + box.width,
		bottom: topLeft.y + box.height,
	};
}

test.describe("ズーム下でのマーキー選択", () => {
	test("ズームアウト後、画面上で A だけを囲うと A だけが選択される", async ({
		canvas,
	}) => {
		// A（左）と B（右）を離して置く。
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

		// 画面中央を基点にズームアウト（両図形が画面内に残り、scale>1 になる）。
		const initialViewBox = await canvas.getViewBox();
		await canvas.wheel({ x: 500, y: 300 }, { deltaY: 200, ctrl: true });
		await expect
			.poll(() => canvas.getViewBox(), {
				message: "ズームアウトで viewBox が変化すること",
			})
			.not.toBe(initialViewBox);

		// ズーム後の画面上の位置を測る。
		const aBox = await contentBox(canvas, a);
		const bBox = await contentBox(canvas, b);

		// A の右端と B の左端の中間をマーキーの右辺にすれば、A は完全包含・B は除外。
		const splitX = (aBox.right + bBox.left) / 2;
		// テストが意味を持つ前提（A は枠内・B は枠外）を先に固める。
		expect(aBox.right).toBeLessThan(splitX);
		expect(bBox.left).toBeGreaterThan(splitX);

		// 空白（A の左上外側）からドラッグして A だけを囲う。
		await canvas.drag(
			{ x: aBox.left - 15, y: aBox.top - 15 },
			{ x: splitX, y: aBox.bottom + 15 },
			12,
		);

		// 選択結果を「右へ 1px ナッジして動いたのはどちらか」で判定する。
		const aBefore = await canvas.objectById(a).getAttribute("transform");
		const bBefore = await canvas.objectById(b).getAttribute("transform");

		await canvas.nudge("right");

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "囲った A は動くこと",
			})
			.not.toBe(aBefore);
		// B は囲っていないので不動。
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(bBefore);
	});
});

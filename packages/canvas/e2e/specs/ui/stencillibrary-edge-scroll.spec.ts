import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * StencilLibrary（上端ツールバー）からの D&D 開始時にエッジスクロールが暴発しないこと、
 * かつ一度エッジゾーン外へ出れば本来のエッジスクロールが効くことを守る（arm-on-leave）。
 *
 * ツールバーは Canvas 上端に接しているため、ボタンを掴んでキャンバスへドラッグし始める
 * 時点でカーソルは必ず上端のエッジゾーン内（端から約 20px 以内）にいる。旧実装は
 * dragStart 直後からエッジスクロールを発火し、まだ内部へ入る前にキャンバスが勝手に
 * パンしていた。修正後は「ドラッグ中に一度エッジゾーン外へ出てから」武装するため、
 * 掴んだ直後の暴発だけが消える。
 *
 * 観測は SVG の viewBox（`minX minY w h`）の minY。上方向スクロールでこの値が動く。
 * 既定ビューポート（zoom=1・SVG はコンテナにほぼ 1:1 で描画）では上端ゾーンは画面で
 * 約 20px なので、端から数 px の点はゾーン内、200px 下は明確にゾーン外になる。
 */

/** viewBox の minY（world 座標。垂直スクロールでこの値が動く）。 */
async function viewBoxMinY(canvas: CanvasDriver): Promise<number> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	return Number(raw.trim().split(/\s+/)[1]);
}

/** Rectangle ツールボタンの画面中心（boundingBox は画面座標を返す）。 */
async function rectButtonCenter(
	canvas: CanvasDriver,
): Promise<{ x: number; y: number }> {
	const button = canvas.page.locator(selectors.toolButton("Rectangle"));
	const box = await button.boundingBox();
	if (!box) {
		throw new Error("Rectangle ボタンの位置が取得できない");
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe("StencilLibrary D&D のエッジスクロール（arm-on-leave）", () => {
	test("端から掴んで上端ゾーンに留まってもキャンバスはパンしない（暴発防止）", async ({
		canvas,
	}) => {
		const minYBefore = await viewBoxMinY(canvas);

		const from = await rectButtonCenter(canvas);
		// 上端から数 px だけ下のゾーン内。横は中央寄りで左右エッジを避ける。
		const holdX = canvas.toScreen({ x: 400, y: 0 }).x;
		const topZoneY = canvas.toScreen({ x: 0, y: 0 }).y + 4;

		await canvas.page.mouse.move(from.x, from.y);
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(holdX, topZoneY, { steps: 12 });

			// 暴発していれば自走スクロールで minY が数フレーム内に動く。
			// 「起きないこと」の検証のため、十分なフレーム数ぶん待ってから比較する。
			await canvas.page.waitForTimeout(400);

			expect(await viewBoxMinY(canvas)).toBe(minYBefore);
		} finally {
			await canvas.page.mouse.up();
		}
	});

	test("一度内部へ出てから上端へ戻ると上方向にエッジスクロールする（武装後は有効）", async ({
		canvas,
	}) => {
		const minYBefore = await viewBoxMinY(canvas);

		const from = await rectButtonCenter(canvas);
		const holdX = canvas.toScreen({ x: 400, y: 0 }).x;
		const topY = canvas.toScreen({ x: 0, y: 0 }).y;

		await canvas.page.mouse.move(from.x, from.y);
		await canvas.page.mouse.down();
		try {
			// 武装: 上端ゾーンの外（十分内部）まで下げる。
			await canvas.page.mouse.move(holdX, topY + 220, { steps: 12 });
			// 上端ゾーンへ戻して保持 → 武装済みなので上方向スクロールが始まる。
			await canvas.page.mouse.move(holdX, topY + 4, { steps: 10 });

			// 上方向スクロールで minY が減り続ける（自走）。状態待ちで同期する。
			await expect
				.poll(() => viewBoxMinY(canvas), {
					message: "武装後は上端でエッジスクロール（minY 減少）が発生すること",
				})
				.toBeLessThan(minYBefore - 1);
		} finally {
			await canvas.page.mouse.up();
		}
	});
});

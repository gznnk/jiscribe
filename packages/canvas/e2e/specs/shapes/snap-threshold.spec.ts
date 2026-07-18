import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * スナップ閾値（SNAP_THRESHOLD_PX = 8）の「範囲境界」を守る。
 *
 * snap.spec は閾値内（距離3）の吸着は手厚く見るが、「閾値の外まで離せば吸着しない」
 * という負側の境界は未検証だった。閾値が広がりすぎる退行（遠くの図形にまで吸い付く）は
 * 吸着テストだけでは捕まらない。ここでは同じ中央↔中央の構図で、距離5（閾値内→吸着）と
 * 距離12（閾値外→生の位置のまま）を対比して境界を固める。
 *
 * zoom=1・パンなしなので画面座標＝SVG 座標。A 中心X=500 を基準に B 中心を寄せる。
 * 幅差により B の left/right はどの候補にも当たらず、中央X のみが判定対象になる。
 */

// A: 幅200・高さ100、中心 (500,200)。centerX=500
const drawWideA = (canvas: CanvasDriver) =>
	canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });

/** B（幅100・高さ100、初期中心 (400,450)）を描く */
const drawSquareB = (canvas: CanvasDriver) =>
	canvas.drawShape("Rectangle", { x: 350, y: 400 }, { x: 450, y: 500 });

async function transformOf(
	canvas: CanvasDriver,
	id: string,
): Promise<string | null | undefined> {
	return (await canvas.captureObjects()).find((o) => o.id === id)?.transform;
}

test.describe("スナップ閾値の範囲境界", () => {
	test("中心X が閾値内（距離5）なら相手の中心へ吸着する", async ({
		canvas,
	}) => {
		await drawWideA(canvas);
		const bId = await drawSquareB(canvas);
		await canvas.deselect();

		// B 中心(400,450) → (505,450): 中心X 505 は A 中心X 500 から距離5（≤8）。
		await canvas.dragInspecting(
			{ x: 400, y: 450 },
			{ x: 505, y: 450 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(1);
				expect(await canvas.snapGuideCoordinates("x")).toEqual([500]);
			},
		);

		// 解放後: 中心Xが 500 へ吸着する。
		await expect
			.poll(() => transformOf(canvas, bId))
			.toBe("matrix(1, 0, 0, 1, 500, 450)");
	});

	test("中心X が閾値外（距離12）なら吸着せず生の位置に留まる", async ({
		canvas,
	}) => {
		await drawWideA(canvas);
		const bId = await drawSquareB(canvas);
		await canvas.deselect();

		// B 中心(400,450) → (512,450): 中心X 512 は A 中心X 500 から距離12（>8）。
		// 閾値外なのでガイドは出ず、吸着もしない。
		await canvas.dragInspecting(
			{ x: 400, y: 450 },
			{ x: 512, y: 450 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(0);
			},
		);

		// 解放後: 吸着せず生の中心X 512 のまま。
		await expect
			.poll(() => transformOf(canvas, bId))
			.toBe("matrix(1, 0, 0, 1, 512, 450)");
	});
});

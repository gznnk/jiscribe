import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 図形中央へのスナップ（hCenter / vCenter）の非回帰。
 *
 * 既定ビューポート（zoom=1・パンなし）では画面座標＝SVG 座標で、
 * スナップ閾値は 8（SNAP_THRESHOLD_PX）。
 * transform の e,f が図形の中心座標なので、整列結果は transform で直接検証できる。
 *
 * 中央↔中央 / 中央↔エッジ を隔離するため、相手図形 A と動かす図形 B の幅をあえて変える
 * （同幅だと left/right も同時に整列してしまい、中央スナップ単独の検証にならない）。
 */
test.describe("中央スナップ", () => {
	// A: 幅200・高さ100、中心 (500, 200)
	const drawWideA = (canvas: CanvasDriver) =>
		canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });

	test("中央↔中央: 動かす図形の中心が相手の中心Xへ吸着し、縦ガイドが出る", async ({
		canvas,
	}) => {
		await drawWideA(canvas);
		// B: 幅100・高さ100、中心 (400, 450)
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 350, y: 400 },
			{ x: 450, y: 500 },
		);
		await canvas.deselect();

		// B 中心(400,450) → (497,450): 中心X 497 は A 中心X 500 の閾値内（距離3）。
		// 幅が違うため B の left/right(447/547) はどの候補にも当たらず、中央のみ整列する。
		await canvas.dragInspecting(
			{ x: 400, y: 450 },
			{ x: 497, y: 450 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(1);
				await expect(canvas.snapGuides("y")).toHaveCount(0);
				expect(await canvas.snapGuideCoordinates("x")).toEqual([500]);
			},
		);

		// 解放後: B の中心Xが 500 へ吸着（Y は 450 のまま）
		await expect
			.poll(async () => {
				const b = (await canvas.captureObjects()).find((o) => o.id === bId);
				return b?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 500, 450)");
	});

	test("中央↔エッジ: 動かす図形の中心が相手の左辺へ吸着する", async ({
		canvas,
	}) => {
		await drawWideA(canvas); // A の left = 400
		// B: 幅100・高さ100、中心 (300, 450)
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 250, y: 400 },
			{ x: 350, y: 500 },
		);
		await canvas.deselect();

		// B 中心(300,450) → (403,450): 中心X 403 は A の left=400 の閾値内（距離3）。
		await canvas.dragInspecting(
			{ x: 300, y: 450 },
			{ x: 403, y: 450 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(1);
				expect(await canvas.snapGuideCoordinates("x")).toEqual([400]);
			},
		);

		await expect
			.poll(async () => {
				const b = (await canvas.captureObjects()).find((o) => o.id === bId);
				return b?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 400, 450)");
	});

	test("Ctrl 押下中はスナップしない（ガイドも出ず、位置も吸着しない）", async ({
		canvas,
	}) => {
		await drawWideA(canvas);
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 350, y: 400 },
			{ x: 450, y: 500 },
		);
		await canvas.deselect();

		// 中央↔中央 と同じ操作を Ctrl 押下で行う → 吸着せず生の位置(497)のまま
		await canvas.dragInspecting(
			{ x: 400, y: 450 },
			{ x: 497, y: 450 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(0);
			},
			{ ctrl: true },
		);

		await expect
			.poll(async () => {
				const b = (await canvas.captureObjects()).find((o) => o.id === bId);
				return b?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 497, 450)");
	});
});

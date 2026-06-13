import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * スナップ（吸着）の非回帰。
 *
 * 既定ビューポート（zoom=1・パンなし）では画面座標＝SVG 座標で、
 * スナップ閾値は 8（SNAP_THRESHOLD_PX）。
 * transform の e,f が図形の中心座標なので、整列結果は transform で直接検証できる。
 *
 * スナップ候補は各図形の left/right/hCenter（X軸）と top/bottom/vCenter（Y軸）。
 * 動かす図形側も left/center/right・top/center/bottom が比較され、
 * スナップ後にエッジが候補と一致した軸に青破線ガイド（snap-guide:x = 縦線 /
 * snap-guide:y = 横線）が出る。中央スナップ単独・エッジスナップ単独を隔離するため、
 * 相手図形と動かす図形の幅・高さをあえて変える（同寸だと別のエッジも同時に整列して
 * しまい、狙ったスナップ単独の検証にならない）。
 */

// A: 幅200・高さ100、中心 (500, 200)。left=400 right=600 top=150 bottom=250 centerX=500 centerY=200
const drawWideA = (canvas: CanvasDriver) =>
	canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });

test.describe("中央スナップ（X軸・縦ガイド）", () => {
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

test.describe("中央スナップ（Y軸・横ガイド）", () => {
	test("中央↔中央: 動かす図形の中心が相手の中心Yへ吸着し、横ガイドが出る", async ({
		canvas,
	}) => {
		await drawWideA(canvas); // A 中心Y = 200
		// B: 幅100・高さ50、中心 (200, 300)。X は A(400/500/600) から十分離す（横方向は当てない）
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 150, y: 275 },
			{ x: 250, y: 325 },
		);
		await canvas.deselect();

		// B 中心(200,300) → (200,203): 中心Y 203 は A 中心Y 200 の閾値内（距離3）。
		// 高さが違うため B の top/bottom(178/228) はどの候補にも当たらず、中央のみ整列する。
		await canvas.dragInspecting(
			{ x: 200, y: 300 },
			{ x: 200, y: 203 },
			async () => {
				await expect(canvas.snapGuides("y")).toHaveCount(1);
				await expect(canvas.snapGuides("x")).toHaveCount(0);
				expect(await canvas.snapGuideCoordinates("y")).toEqual([200]);
			},
		);

		// 解放後: B の中心Yが 200 へ吸着（X は 200 のまま）
		await expect
			.poll(async () => {
				const b = (await canvas.captureObjects()).find((o) => o.id === bId);
				return b?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 200, 200)");
	});

	test("中央↔エッジ: 動かす図形の中心が相手の上辺へ吸着する", async ({
		canvas,
	}) => {
		await drawWideA(canvas); // A の top = 150
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 150, y: 275 },
			{ x: 250, y: 325 },
		);
		await canvas.deselect();

		// B 中心(200,300) → (200,153): 中心Y 153 は A の top=150 の閾値内（距離3）。
		await canvas.dragInspecting(
			{ x: 200, y: 300 },
			{ x: 200, y: 153 },
			async () => {
				await expect(canvas.snapGuides("y")).toHaveCount(1);
				expect(await canvas.snapGuideCoordinates("y")).toEqual([150]);
			},
		);

		await expect
			.poll(async () => {
				const b = (await canvas.captureObjects()).find((o) => o.id === bId);
				return b?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 200, 150)");
	});
});

/**
 * 四隅（頂点）スナップ: 動かす図形の角が相手の角に吸着する。
 * 角は X エッジ（left/right）と Y エッジ（top/bottom）の同時スナップで成立し、
 * 縦ガイドと横ガイドが 1 本ずつ同時に出る。
 * 相手 A と動かす B の寸法を変え、狙った 1 エッジずつだけが当たるようにする。
 */
test.describe("四隅（頂点）スナップ", () => {
	test("B の左上の角が A の右下の角へ吸着し、縦横ガイドが 1 本ずつ出る", async ({
		canvas,
	}) => {
		// A: 幅200・高さ100、中心 (400,300)。right=500 bottom=350
		await canvas.drawShape("Rectangle", { x: 300, y: 250 }, { x: 500, y: 350 });
		// B: 幅100・高さ100、中心 (650,500)
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 600, y: 450 },
			{ x: 700, y: 550 },
		);
		await canvas.deselect();

		// B 中心(650,500) → (553,403): B left=503→A right=500、B top=353→A bottom=350（各距離3）。
		// 寸法差により他のエッジは候補に当たらない。
		await canvas.dragInspecting(
			{ x: 650, y: 500 },
			{ x: 553, y: 403 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(1);
				await expect(canvas.snapGuides("y")).toHaveCount(1);
				expect(await canvas.snapGuideCoordinates("x")).toEqual([500]);
				expect(await canvas.snapGuideCoordinates("y")).toEqual([350]);
			},
		);

		// 解放後: B の左上角(left,top)=(500,350) → 中心 (550,400)
		await expect
			.poll(async () => {
				const b = (await canvas.captureObjects()).find((o) => o.id === bId);
				return b?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 550, 400)");
	});

	test("B の右下の角が A の左上の角へ吸着し、縦横ガイドが 1 本ずつ出る", async ({
		canvas,
	}) => {
		// A: 幅200・高さ100、中心 (400,300)。left=300 top=250
		await canvas.drawShape("Rectangle", { x: 300, y: 250 }, { x: 500, y: 350 });
		// B: 幅100・高さ100、中心 (150,120)
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 100, y: 70 },
			{ x: 200, y: 170 },
		);
		await canvas.deselect();

		// B 中心(150,120) → (253,203): B right=303→A left=300、B bottom=253→A top=250（各距離3）。
		await canvas.dragInspecting(
			{ x: 150, y: 120 },
			{ x: 253, y: 203 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(1);
				await expect(canvas.snapGuides("y")).toHaveCount(1);
				expect(await canvas.snapGuideCoordinates("x")).toEqual([300]);
				expect(await canvas.snapGuideCoordinates("y")).toEqual([250]);
			},
		);

		// 解放後: B の右下角(right,bottom)=(300,250) → 中心 (250,200)
		await expect
			.poll(async () => {
				const b = (await canvas.captureObjects()).find((o) => o.id === bId);
				return b?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 250, 200)");
	});
});

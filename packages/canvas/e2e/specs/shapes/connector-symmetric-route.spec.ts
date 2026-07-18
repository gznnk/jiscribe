import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 向かい合う端点の「対称 S 字ルーティング」を幾何レベルで検証する spec。
 *
 * routeOrthogonalConnector は、端点同士が軸上で正面に向かい合う（例: source の bottomCenter が
 * 下向き、target の topCenter が上向き）配置で、両者を結ぶ折れ位置を「中点」に取る対称な
 * S/Z 字経路を SYMMETRY_BONUS で優先する。これにより横へずれた 2 図形でも、折れ線が中央で
 * 一度だけ水平に渡る整った形になる。
 *
 * 既存のコネクター spec はこの「対称な中点折れ」を検証していない（points の変化や端点追従の
 * み）。ここでは横にずらした上下 2 図形を bottomCenter → topCenter で結び、経路が 4 頂点の
 * S 字で、横棒（中間 2 点）がちょうど両辺の中点の高さに来ることを守る。座標オフセットには
 * 依存しない（図形の実描画から期待値を作る）。
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

const EPS = 1.5;

function parsePoints(attr: string | null): Vec[] {
	if (!attr) {
		throw new Error("points 属性が取得できない");
	}
	return attr
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
}

function distance(a: Vec, b: Vec): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

async function worldAABB(canvas: CanvasDriver, id: string): Promise<AABB> {
	return canvas.page.evaluate((targetId) => {
		const el = document.querySelector(`[data-id="${targetId}"]`);
		if (!(el instanceof SVGGraphicsElement)) {
			throw new Error(`図形 ${targetId} が SVGGraphicsElement でない`);
		}
		const bbox = el.getBBox();
		const ctm = el.getCTM();
		if (!ctm) {
			throw new Error(`図形 ${targetId} の CTM が取得できない`);
		}
		const corners = [
			{ x: bbox.x, y: bbox.y },
			{ x: bbox.x + bbox.width, y: bbox.y },
			{ x: bbox.x, y: bbox.y + bbox.height },
			{ x: bbox.x + bbox.width, y: bbox.y + bbox.height },
		].map((p) => ({
			x: p.x * ctm.a + p.y * ctm.c + ctm.e,
			y: p.x * ctm.b + p.y * ctm.d + ctm.f,
		}));
		const xs = corners.map((c) => c.x);
		const ys = corners.map((c) => c.y);
		return {
			minX: Math.min(...xs),
			maxX: Math.max(...xs),
			minY: Math.min(...ys),
			maxY: Math.max(...ys),
		};
	}, id);
}

const centerX = (box: AABB): number => (box.minX + box.maxX) / 2;

function assertOrthogonal(points: Vec[]) {
	for (let i = 1; i < points.length; i++) {
		const horizontal = Math.abs(points[i - 1].y - points[i].y) <= EPS;
		const vertical = Math.abs(points[i - 1].x - points[i].x) <= EPS;
		expect(
			horizontal !== vertical,
			`セグメント ${i - 1}->${i} が直角でない: ${JSON.stringify(points[i - 1])} -> ${JSON.stringify(points[i])}`,
		).toBe(true);
	}
}

test.describe("コネクターの対称ルーティング", () => {
	test("横にずれた上下の図形は中点で折れる対称 S 字になる", async ({
		canvas,
	}) => {
		// 上の source と、右へずらした下の target。bottomCenter（下向き）と topCenter（上向き）が
		// 正面に向かい合う配置。
		const sourceId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 150 },
			{ x: 600, y: 250 },
		);
		await canvas.deselect();
		const targetId = await canvas.drawShape(
			"Rectangle",
			{ x: 760, y: 450 },
			{ x: 960, y: 550 },
		);
		await canvas.deselect();

		// source の bottomCenter から target の上辺中央付近へドロップ → target は topCenter に接続。
		await canvas.selectAt({ x: 500, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 860,
			y: 458,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const sourceBox = await worldAABB(canvas, sourceId);
		const targetBox = await worldAABB(canvas, targetId);

		const sourceBottomCenter = { x: centerX(sourceBox), y: sourceBox.maxY };
		const targetTopCenter = { x: centerX(targetBox), y: targetBox.minY };

		// 対称 S 字は 4 頂点（2 回折れる）: source 辺 → 横棒の高さ → 横棒 → target 辺。
		expect(points.length, `経路頂点数: ${JSON.stringify(points)}`).toBe(4);

		// 端点はそれぞれの辺中央に乗る。
		expect(
			distance(points[0], sourceBottomCenter),
			`始点が source 下辺中央に乗ること`,
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(points[3], targetTopCenter),
			`終点が target 上辺中央に乗ること`,
		).toBeLessThanOrEqual(EPS);

		// 始点側は真下へ垂直に出て、終点側は真上から垂直に入る。
		expect(Math.abs(points[1].x - points[0].x)).toBeLessThanOrEqual(EPS);
		expect(Math.abs(points[2].x - points[3].x)).toBeLessThanOrEqual(EPS);

		// 中間 2 点は同じ高さ（横棒）。
		expect(
			Math.abs(points[1].y - points[2].y),
			"中間 2 点が同じ高さ（横棒）であること",
		).toBeLessThanOrEqual(EPS);

		// 対称性: 横棒は source 下辺と target 上辺のちょうど中点の高さに来る。
		const midY = (sourceBottomCenter.y + targetTopCenter.y) / 2;
		expect(
			Math.abs(points[1].y - midY),
			`横棒の高さ ${points[1].y} が両辺の中点 ${midY} に一致すること`,
		).toBeLessThanOrEqual(EPS);

		assertOrthogonal(points);
	});
});

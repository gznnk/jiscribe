import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 楕円への center アンカー「アウトライン吸着」を幾何レベルで検証する spec。
 *
 * center アンカーの輪郭吸着は図形ジオメトリ別に分岐する（adjustToOutline）。矩形は
 * calcOutlinePointTowardForRotatedFrame で AABB の辺へ、楕円は
 * calcOutlinePointTowardForRotatedEllipse で楕円の曲線境界へ吸着する。connector-center-anchor-
 * outline.spec は矩形（辺＝AABB 周上）を守るが、楕円の曲線境界吸着は別関数で未検証だった。
 *
 * ここでは source(矩形) から target(楕円) の中心へ接続し、終点が
 *   - 楕円の境界式 ((x-cx)/rx)^2 + ((y-cy)/ry)^2 = 1 を満たす（曲線上に乗る）
 *   - 斜め方向なので AABB の周上ではなく内側にある（矩形吸着との差）
 *   - 中心から source へ向かう半直線上にある（向き依存）
 * ことを守る。座標オフセットには依存しない（図形の実描画から期待値を作る）。
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

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

const center = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: (box.minY + box.maxY) / 2,
});

/** 点 p から直線 a→b までの垂直距離 */
function perpendicularDistance(p: Vec, a: Vec, b: Vec): number {
	const cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
	return Math.abs(cross) / Math.hypot(b.x - a.x, b.y - a.y);
}

test.describe("コネクターの楕円輪郭吸着", () => {
	test("中心へ接続した端点は楕円の曲線境界上に乗る", async ({ canvas }) => {
		// source は左上の矩形、target は右下の楕円。斜め配置にして輪郭点が AABB 周や
		// 辺中央と一致しないようにする。
		await canvas.drawShape("Rectangle", { x: 200, y: 150 }, { x: 360, y: 250 });
		await canvas.deselect();
		const ellipseId = await canvas.drawShape(
			"Ellipse",
			{ x: 700, y: 400 },
			{ x: 900, y: 520 },
		);
		await canvas.deselect();

		// source の rightCenter から楕円の「中心」へドロップ → 楕円は center アンカー接続。
		await canvas.selectAt({ x: 280, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 800,
			y: 460,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const box = await worldAABB(canvas, ellipseId);
		const c = center(box);
		const rx = (box.maxX - box.minX) / 2;
		const ry = (box.maxY - box.minY) / 2;

		const sourcePoint = points[0];
		const endpoint = points[points.length - 1];

		// 終点が楕円の境界式を満たす（曲線上に乗る）。
		const ellipseValue =
			((endpoint.x - c.x) / rx) ** 2 + ((endpoint.y - c.y) / ry) ** 2;
		expect(
			Math.abs(ellipseValue - 1),
			`終点 ${JSON.stringify(endpoint)} が楕円境界（=1）上に乗ること: 実測 ${ellipseValue.toFixed(3)}`,
		).toBeLessThanOrEqual(0.05);

		// 斜め方向なので AABB の周上ではなく内側にある（矩形の辺吸着との差）。
		const insideMargin = 5;
		expect(endpoint.x).toBeGreaterThan(box.minX + insideMargin);
		expect(endpoint.x).toBeLessThan(box.maxX - insideMargin);
		expect(endpoint.y).toBeGreaterThan(box.minY + insideMargin);
		expect(endpoint.y).toBeLessThan(box.maxY - insideMargin);

		// 向き依存: 終点は「中心 → source 端点」の半直線上にある。
		expect(
			perpendicularDistance(endpoint, c, sourcePoint),
			"終点が「中心→source」直線上にあること（向き依存の吸着）",
		).toBeLessThanOrEqual(2);
		const towardDot =
			(endpoint.x - c.x) * (sourcePoint.x - c.x) +
			(endpoint.y - c.y) * (sourcePoint.y - c.y);
		expect(towardDot, "終点が source 側へ押し出されていること").toBeGreaterThan(
			0,
		);

		// 中心に張り付いていない（輪郭まで押し出されている）。
		expect(distance(endpoint, c)).toBeGreaterThan(20);
	});
});

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * center アンカーの「アウトライン吸着」を幾何レベルで検証する spec。
 *
 * コネクター端点を図形の中心付近へドロップすると、その端点は center アンカー（kind="center"）
 * として接続される。center アンカーの座標は中心 (cx,cy) ではなく、resolveConnectorPoints が
 * adjustToOutline で「相手端点へ向かう向き」に図形の輪郭まで押し出した点になる
 * （calcOutlinePointTowardForRotatedFrame）。これにより線は図形の中心ではなく辺の縁で
 * 接続される。
 *
 * 既存のコネクター spec は辺中央（connectPoint）アンカーばかりで、この center→輪郭吸着は
 * 未検証だった。ここでは斜めに配置した source/target を使い、target を center アンカーで
 * 接続して、端点が
 *   - 図形中心ではなく輪郭（AABB の周）上に乗る
 *   - 中心から相手端点へ向かう半直線上にある（向き依存の吸着）
 *   - 辺中央とは別の点（＝固定の辺アンカーではない）
 * ことを守る。座標オフセットには依存しない（図形の実描画から期待値を作る）。
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

const center = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: (box.minY + box.maxY) / 2,
});

/** 点 p が box の周（いずれかの辺）に EPS 以内で乗っているか */
function onPerimeter(p: Vec, box: AABB): boolean {
	const onVerticalEdge =
		(Math.abs(p.x - box.minX) <= EPS || Math.abs(p.x - box.maxX) <= EPS) &&
		p.y >= box.minY - EPS &&
		p.y <= box.maxY + EPS;
	const onHorizontalEdge =
		(Math.abs(p.y - box.minY) <= EPS || Math.abs(p.y - box.maxY) <= EPS) &&
		p.x >= box.minX - EPS &&
		p.x <= box.maxX + EPS;
	return onVerticalEdge || onHorizontalEdge;
}

/** 点 p から直線 a→b までの垂直距離 */
function perpendicularDistance(p: Vec, a: Vec, b: Vec): number {
	const cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
	return Math.abs(cross) / Math.hypot(b.x - a.x, b.y - a.y);
}

test.describe("コネクターの center アンカー輪郭吸着", () => {
	test("中心へ接続した端点は輪郭上の、相手へ向かう点に乗る", async ({
		canvas,
	}) => {
		// source は左上、target は右下に斜め配置。target を center アンカーで接続するため、
		// 輪郭点は「target 中心 → source 端点」方向（斜め）で決まり、辺中央とは別の点になる。
		await canvas.drawShape("Rectangle", { x: 200, y: 150 }, { x: 360, y: 250 });
		await canvas.deselect();
		const targetId = await canvas.drawShape(
			"Rectangle",
			{ x: 700, y: 400 },
			{ x: 900, y: 520 },
		);
		await canvas.deselect();

		// source の rightCenter から target の「中心」へドロップ → target は center アンカー接続。
		await canvas.selectAt({ x: 280, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 800,
			y: 460,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const targetBox = await worldAABB(canvas, targetId);
		const targetCenter = center(targetBox);

		const sourcePoint = points[0];
		const targetEndpoint = points[points.length - 1];

		// 端点は図形の中心ではなく輪郭（AABB の周）上に乗る。
		expect(
			onPerimeter(targetEndpoint, targetBox),
			`終点 ${JSON.stringify(targetEndpoint)} が target の周上に乗ること`,
		).toBe(true);
		expect(
			distance(targetEndpoint, targetCenter),
			"終点が中心に張り付いていない（輪郭まで押し出されている）こと",
		).toBeGreaterThan(20);

		// 向き依存: 端点は「中心 → source 端点」の半直線上にある（輪郭吸着の向き）。
		expect(
			perpendicularDistance(targetEndpoint, targetCenter, sourcePoint),
			`終点が「中心→source」直線上にあること（向き依存の輪郭吸着）`,
		).toBeLessThanOrEqual(2);
		// 中心から見て source 側へ押し出されている（中心と source の間）。
		const towardDot =
			(targetEndpoint.x - targetCenter.x) * (sourcePoint.x - targetCenter.x) +
			(targetEndpoint.y - targetCenter.y) * (sourcePoint.y - targetCenter.y);
		expect(towardDot, "終点が source 側へ押し出されていること").toBeGreaterThan(
			0,
		);
		expect(distance(targetEndpoint, targetCenter)).toBeLessThan(
			distance(sourcePoint, targetCenter),
		);

		// 斜め方向なので、輪郭点は辺の中央（leftCenter / topCenter 等）とは明確に異なる。
		// 4 辺の中央いずれからも一定以上離れていることで「固定の辺アンカーではない」ことを守る。
		const edgeMidpoints: Vec[] = [
			{ x: targetCenter.x, y: targetBox.minY }, // topCenter
			{ x: targetCenter.x, y: targetBox.maxY }, // bottomCenter
			{ x: targetBox.minX, y: targetCenter.y }, // leftCenter
			{ x: targetBox.maxX, y: targetCenter.y }, // rightCenter
		];
		const nearestEdgeMid = Math.min(
			...edgeMidpoints.map((m) => distance(targetEndpoint, m)),
		);
		expect(
			nearestEdgeMid,
			"輪郭点が辺中央とは別の点であること（向き依存の吸着が効いている）",
		).toBeGreaterThan(10);
	});
});

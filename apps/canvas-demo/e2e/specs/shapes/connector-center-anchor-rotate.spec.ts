import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * center アンカーの輪郭点が、接続図形の「回転」に追従して回転後の輪郭で再計算されることを
 * 検証する spec。
 *
 * center アンカーの端点は中心ではなく相手へ向かう輪郭点へ吸着する（adjustToOutline →
 * calcOutlinePointTowardForRotatedFrame）。図形を回転すると輪郭（4 辺）も回るため、輪郭点は
 * 回転後の辺の上の点になる。connector-rotated-anchor は辺アンカー×回転、
 * connector-center-anchor-outline は静止図形での center 輪郭吸着、connector-center-anchor-resize は
 * center×リサイズを守るが、「center アンカー × 回転」は未検証だった。
 *
 * A（左）→ B（右・center 接続）を水平に結び、B を回転して、終点が
 *   - 「B 中心 → A」の半直線上にある（向き依存の吸着）
 *   - 回転後の B（4 隅から作る回転矩形）の辺上にある
 *   - 中心ではない／回転前の位置から動いている
 * ことを守る。座標は zoom=1 でワールド＝コンテンツ。
 */

type Vec = { x: number; y: number };

const EPS = 2;

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

/** 図形のワールド 4 隅（TL,TR,BR,BL の順、回転込み）を返す */
async function worldCorners(canvas: CanvasDriver, id: string): Promise<Vec[]> {
	return canvas.page.evaluate((targetId) => {
		const el = document.querySelector(`[data-id="${targetId}"]`);
		if (!(el instanceof SVGGraphicsElement)) {
			throw new Error(`図形 ${targetId} が SVGGraphicsElement でない`);
		}
		const b = el.getBBox();
		const ctm = el.getCTM();
		if (!ctm) {
			throw new Error(`図形 ${targetId} の CTM が取得できない`);
		}
		return [
			{ x: b.x, y: b.y },
			{ x: b.x + b.width, y: b.y },
			{ x: b.x + b.width, y: b.y + b.height },
			{ x: b.x, y: b.y + b.height },
		].map((p) => ({
			x: p.x * ctm.a + p.y * ctm.c + ctm.e,
			y: p.x * ctm.b + p.y * ctm.d + ctm.f,
		}));
	}, id);
}

const centroid = (pts: Vec[]): Vec => ({
	x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
	y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});

/** 点 p から線分 a-b までの距離 */
function distToSegment(p: Vec, a: Vec, b: Vec): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const len2 = dx * dx + dy * dy;
	if (len2 === 0) {
		return distance(p, a);
	}
	let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
	t = Math.max(0, Math.min(1, t));
	return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** 点 p が多角形の周（いずれかの辺）に tol 以内で乗っているか */
function onPolygonBoundary(p: Vec, corners: Vec[], tol: number): boolean {
	for (let i = 0; i < corners.length; i++) {
		const a = corners[i];
		const b = corners[(i + 1) % corners.length];
		if (distToSegment(p, a, b) <= tol) {
			return true;
		}
	}
	return false;
}

/** 点 p から直線 a→b までの垂直距離 */
function perpendicularDistance(p: Vec, a: Vec, b: Vec): number {
	const cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
	return Math.abs(cross) / Math.hypot(b.x - a.x, b.y - a.y);
}

async function endPoint(canvas: CanvasDriver, id: string): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(id).getAttribute("points"),
	);
	return points[points.length - 1];
}
async function startPoint(canvas: CanvasDriver, id: string): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(id).getAttribute("points"),
	);
	return points[0];
}

test.describe("center アンカーの回転追従", () => {
	test("接続図形を回転すると center 輪郭点が回転後の辺上へ移る", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 200, y: 300 }, { x: 360, y: 400 });
		await canvas.deselect();
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 700, y: 300 },
			{ x: 900, y: 400 },
		);
		await canvas.deselect();

		// A.rightCenter → B.center（B 中心へドロップ）。水平なので輪郭点は B 左辺中央。
		await canvas.selectAt({ x: 280, y: 350 });
		const id = await canvas.createConnector("rightCenter", { x: 800, y: 350 });
		await canvas.deselect();

		const endBefore = await endPoint(canvas, id);

		// B を中心 (800,350) 基点に大きく回転する（回転ハンドルを下方へ振り ~60°）。
		await canvas.selectAt({ x: 800, y: 350 });
		await canvas.dragTransformHandle("rotation", { x: 980, y: 480 });
		await canvas.deselect();

		// 回転で終点が（回転後の辺へ）大きく動いたこと。
		await expect
			.poll(async () => distance(await endPoint(canvas, id), endBefore), {
				message: "回転で center 輪郭点が動くこと",
			})
			.toBeGreaterThan(10);

		const corners = await worldCorners(canvas, bId);
		const center = centroid(corners);
		const src = await startPoint(canvas, id);
		const endAfter = await endPoint(canvas, id);

		// 終点は「B 中心 → A（source）」の半直線上にある（向き依存の吸着）。
		expect(
			perpendicularDistance(endAfter, center, src),
			"終点が「中心→source」直線上にあること",
		).toBeLessThanOrEqual(2);
		// 終点は回転後の B（回転矩形）の辺上にある。
		expect(
			onPolygonBoundary(endAfter, corners, EPS),
			`終点 ${JSON.stringify(endAfter)} が回転後の B の辺上に乗ること`,
		).toBe(true);
		// 中心に張り付いていない。
		expect(distance(endAfter, center)).toBeGreaterThan(20);
	});
});

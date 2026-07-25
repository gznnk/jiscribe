import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 回転した接続元の「辺アンカー追従」を幾何レベルで検証する spec。
 *
 * connectPoint アンカー（辺の中央）は calcConnectPoint で回転込みに解決されるため、図形を
 * 回転するとコネクター端点は「回転後の辺の中点」へ移る。これは AABB（軸並行バウンディング
 * ボックス）の辺中央とは別の点で、回転した辺の中点は AABB の内側に入る。
 *
 * connector-follow-rotate.spec は「回転で points が変わる／回転後も追従する」までしか見て
 * おらず、端点が回転後の辺アンカーに *正確に* 乗るかは未検証だった。ここでは図形のローカル
 * bbox を CTM（回転込み）で変換した辺中点と、コネクター端点を突き合わせて守る。座標オフセット
 * には依存しない（図形の実描画から期待値を作る）。
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

const EPS = 1.5;

/** "x1,y1 x2,y2 ..." を座標配列へパースする */
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

/**
 * 図形（data-id）の「下辺の中点」をワールド座標で返す。ローカル bbox の下辺中点
 * (x + w/2, y + h) を CTM（回転込み）で変換するため、回転した図形では回転後の辺中点になる。
 */
async function worldBottomCenter(
	canvas: CanvasDriver,
	id: string,
): Promise<Vec> {
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
		const local = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height };
		return {
			x: local.x * ctm.a + local.y * ctm.c + ctm.e,
			y: local.x * ctm.b + local.y * ctm.d + ctm.f,
		};
	}, id);
}

/** 図形（data-id）のワールド AABB（ローカル bbox 4 隅を CTM 変換した min/max）。 */
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

/** 上下 2 矩形を bottomCenter → 下の矩形で結び、source / connector の id を返す。 */
async function buildPair(
	canvas: CanvasDriver,
): Promise<{ sourceId: string; connectorId: string }> {
	const sourceId = await canvas.drawShape(
		"Rectangle",
		{ x: 400, y: 150 },
		{ x: 600, y: 250 },
	);
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
	await canvas.deselect();

	await canvas.selectAt({ x: 500, y: 200 });
	const connectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 450,
	});
	await canvas.deselect();
	return { sourceId, connectorId };
}

test.describe("回転した接続元のアンカー追従", () => {
	test("回転後の下辺の中点にコネクター始点が正確に乗る", async ({ canvas }) => {
		const { sourceId, connectorId } = await buildPair(canvas);

		const pointsAttr = () =>
			canvas.objectById(connectorId).getAttribute("points");
		const before = await pointsAttr();

		// 回転前: bottomCenter は軸並行なので AABB 下辺中央と一致する。
		const startBefore = parsePoints(before)[0];
		const aabbBefore = await worldAABB(canvas, sourceId);
		expect(
			distance(startBefore, { x: centerX(aabbBefore), y: aabbBefore.maxY }),
			"回転前は始点が AABB 下辺中央に乗ること",
		).toBeLessThanOrEqual(EPS);

		// 接続元（中心 500,200）を回転する。回転ハンドルを横へ振って明確に傾ける。
		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.dragTransformHandle("rotation", { x: 640, y: 150 });
		await canvas.deselect();

		// 回転が反映され points が変わるまで待つ。
		await expect
			.poll(pointsAttr, { message: "回転でコネクターが追従すること" })
			.not.toBe(before);

		const startAfter = parsePoints(await pointsAttr())[0];
		const rotatedBottomCenter = await worldBottomCenter(canvas, sourceId);
		const aabbAfter = await worldAABB(canvas, sourceId);

		// 端点は「回転後の下辺の中点」にぴたりと乗る（回転込みのアンカー解決）。
		expect(
			distance(startAfter, rotatedBottomCenter),
			`始点 ${JSON.stringify(startAfter)} が回転後の下辺中点 ${JSON.stringify(rotatedBottomCenter)} に乗ること`,
		).toBeLessThanOrEqual(EPS);

		// 回転が実際に効いていることの判別: 回転後の辺中点は AABB 下辺中央とは別物で、
		// AABB の内側（下辺より上）に来る。これにより「回転を無視して AABB 辺で解決して
		// しまう退行」をこのテストが確実に検出できる。
		const aabbBottomCenterAfter = { x: centerX(aabbAfter), y: aabbAfter.maxY };
		expect(
			distance(rotatedBottomCenter, aabbBottomCenterAfter),
			"回転後の辺中点は AABB 下辺中央から十分離れていること（回転が効いている）",
		).toBeGreaterThan(8);
		expect(
			startAfter.y,
			"回転後の始点は AABB の内側（下辺より上）にあること",
		).toBeLessThan(aabbAfter.maxY - EPS);
	});
});

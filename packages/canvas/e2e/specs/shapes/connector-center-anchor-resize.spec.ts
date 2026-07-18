import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * center アンカーの輪郭点が、接続図形のリサイズに追従して再計算されることを検証する spec。
 *
 * center アンカーの端点は図形中心ではなく、相手へ向かう輪郭点へ吸着する（adjustToOutline）。
 * 図形をリサイズすると中心・辺位置が変わるため、輪郭点も新しい辺へ移るべき。
 * connector-resize-anchor.spec は辺（connectPoint）アンカーのリサイズ追従を守り、
 * connector-center-anchor-outline.spec は静止図形での輪郭吸着を守るが、「center アンカー × リサイズ」
 * の組み合わせは未検証だった。
 *
 * A（左）→ B（右・center 接続）を水平に結び、B の左辺を外側へリサイズすると、輪郭点が新しい
 * 左辺中央へ移ることを、図形の実ジオメトリと突き合わせて守る。
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

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
		const xs = corners.map((corner) => corner.x);
		const ys = corners.map((corner) => corner.y);
		return {
			minX: Math.min(...xs),
			maxX: Math.max(...xs),
			minY: Math.min(...ys),
			maxY: Math.max(...ys),
		};
	}, id);
}

const leftCenter = (box: AABB): Vec => ({
	x: box.minX,
	y: (box.minY + box.maxY) / 2,
});

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

async function endPoint(canvas: CanvasDriver, id: string): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(id).getAttribute("points"),
	);
	return points[points.length - 1];
}

test.describe("center アンカーのリサイズ追従", () => {
	test("接続図形をリサイズすると center 輪郭点が新しい辺へ移る", async ({
		canvas,
	}) => {
		// A（左）と B（右）を同じ高さに置く。A.rightCenter → B.center で水平に結ぶと、
		// 輪郭点は B 中心→A 方向（左）＝ B の左辺中央になる。
		await canvas.drawShape("Rectangle", { x: 200, y: 300 }, { x: 360, y: 400 });
		await canvas.deselect();
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 700, y: 300 },
			{ x: 900, y: 400 },
		);
		await canvas.deselect();

		await canvas.selectAt({ x: 280, y: 350 });
		const id = await canvas.createConnector("rightCenter", { x: 800, y: 350 });
		await canvas.deselect();

		// 初期: 輪郭点は B の左辺中央。
		const bBefore = await worldAABB(canvas, bId);
		const endBefore = await endPoint(canvas, id);
		expect(
			distance(endBefore, leftCenter(bBefore)),
			"初期の終点が B 左辺中央に乗ること",
		).toBeLessThanOrEqual(EPS);

		// B を選択して左辺を外側（左）へリサイズする。中心 (800,350) を掴む（終点 700,350 と被らない）。
		await canvas.selectAt({ x: 800, y: 350 });
		await canvas.dragTransformHandle(
			"leftCenter",
			{ x: 600, y: 350 },
			{ ctrl: true },
		);
		await canvas.deselect();

		const bAfter = await worldAABB(canvas, bId);
		// 左辺が実際に外側へ広がっている。
		expect(bAfter.minX, "左辺が左へ広がっていること").toBeLessThan(
			bBefore.minX - 20,
		);

		// center 輪郭点はリサイズ後の新しい左辺中央へ移る。
		const endAfter = await endPoint(canvas, id);
		expect(
			distance(endAfter, leftCenter(bAfter)),
			`終点 ${JSON.stringify(endAfter)} が新しい B 左辺中央 ${JSON.stringify(leftCenter(bAfter))} へ移ること`,
		).toBeLessThanOrEqual(EPS);
		expect(
			onPerimeter(endAfter, bAfter),
			"終点が（リサイズ後の）B の輪郭上にあること",
		).toBe(true);
		// 旧左辺位置からは左へ動いている。
		expect(
			endBefore.x - endAfter.x,
			"終点が左（外側）へ移動していること",
		).toBeGreaterThan(20);
	});
});

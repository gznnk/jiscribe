import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 1 つの図形に複数のコネクターが繋がっているときの、独立した追従とアンカー解決を検証する spec。
 *
 * 既存のコネクター追従 spec はいずれも「1 図形 = 1 コネクター」で、ハブ図形に複数本が
 * 別アンカー（topCenter / bottomCenter）で繋がる構成は未検証だった。実図では 1 つの図形に
 * 何本も繋がるのが普通で、ハブを動かすと全コネクターがそれぞれ自分のアンカーから追従し、
 * 片方の相手だけを動かすともう片方は影響を受けない、という独立性が要る。
 *
 * ここでは上(T1) / ハブ / 下(T2) を topCenter / bottomCenter の 2 本で結び、
 *   - 2 本の始点がハブの別々の辺中央に正確に乗る
 *   - ハブを動かすと両方が新しい辺中央へ追従する
 *   - T1 だけを動かすと c1 のみ変化し c2 は不変
 * を守る。座標オフセットには依存しない（図形の実描画から期待値を作る）。
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

const topCenter = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: box.minY,
});
const bottomCenter = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: box.maxY,
});

async function startPoint(canvas: CanvasDriver, id: string): Promise<Vec> {
	return parsePoints(await canvas.objectById(id).getAttribute("points"))[0];
}

test.describe("ハブ図形の複数コネクター", () => {
	test("ハブを動かすと両コネクターが各アンカーから追従し、片方の相手移動は他方に影響しない", async ({
		canvas,
	}) => {
		// 上(T1) / ハブ / 下(T2) を縦に並べる。
		await canvas.drawShape("Rectangle", { x: 400, y: 100 }, { x: 600, y: 180 });
		await canvas.deselect();
		const hubId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 330 },
			{ x: 600, y: 430 },
		);
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 560 }, { x: 600, y: 640 });
		await canvas.deselect();

		// c1: ハブ topCenter → T1。c2: ハブ bottomCenter → T2。
		await canvas.selectAt({ x: 500, y: 380 });
		const c1 = await canvas.createConnector("topCenter", { x: 500, y: 175 });
		await canvas.deselect();
		await canvas.selectAt({ x: 500, y: 380 });
		const c2 = await canvas.createConnector("bottomCenter", { x: 500, y: 565 });
		await canvas.deselect();

		// 2 本の始点がハブの別々の辺中央に正確に乗る。
		const hub0 = await worldAABB(canvas, hubId);
		expect(
			distance(await startPoint(canvas, c1), topCenter(hub0)),
			"c1 の始点がハブ上辺中央に乗ること",
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(await startPoint(canvas, c2), bottomCenter(hub0)),
			"c2 の始点がハブ下辺中央に乗ること",
		).toBeLessThanOrEqual(EPS);

		// ── ハブを右へ動かす: 両方が新しい辺中央へ追従 ──
		await canvas.drag({ x: 500, y: 380 }, { x: 760, y: 380 });
		await expect
			.poll(async () => (await startPoint(canvas, c1)).x, {
				message: "ハブ移動で c1 始点が追従すること",
			})
			.toBeGreaterThan(topCenter(hub0).x + 100);

		const hub1 = await worldAABB(canvas, hubId);
		expect(
			distance(await startPoint(canvas, c1), topCenter(hub1)),
			"c1 始点が移動後のハブ上辺中央に乗ること",
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(await startPoint(canvas, c2), bottomCenter(hub1)),
			"c2 始点が移動後のハブ下辺中央に乗ること",
		).toBeLessThanOrEqual(EPS);

		// ── T1 だけを動かす: c1 のみ変化、c2 は不変 ──
		const c1Before = await canvas.objectById(c1).getAttribute("points");
		const c2Before = await canvas.objectById(c2).getAttribute("points");
		await canvas.drag({ x: 500, y: 140 }, { x: 800, y: 140 });
		await expect
			.poll(() => canvas.objectById(c1).getAttribute("points"), {
				message: "T1 移動で c1 が変化すること",
			})
			.not.toBe(c1Before);
		// c2 は T1 の移動に影響されない。
		expect(
			await canvas.objectById(c2).getAttribute("points"),
			"T1 移動は c2 に影響しないこと",
		).toBe(c2Before);
	});
});

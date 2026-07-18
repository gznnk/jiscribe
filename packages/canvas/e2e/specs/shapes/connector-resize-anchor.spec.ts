import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 接続図形を「リサイズ」したときのコネクター端点追従を幾何レベルで検証する spec。
 *
 * コネクターの端点は接続図形の辺アンカー（bottomCenter 等）に解決されるため、図形をリサイズ
 * して辺が動けば端点もその新しい辺中央へ移る。connector-follow-resize.spec は「リサイズで
 * points が変わる」までしか見ておらず、端点が *リサイズ後の* 辺中央に正確に乗るかは未検証
 * だった。
 *
 * ここでは bottomCenter で接続した端点について、
 *   - 下辺を下へ伸ばすと端点 y がリサイズ後の下辺中央に正確に追従する
 *   - 右辺を右へ伸ばすと（中心 x がずれて）端点 x もリサイズ後の下辺中央に正確に追従する
 * ことを、リサイズ後の図形ジオメトリから期待値を作って守る。座標オフセットには依存しない。
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

const bottomCenter = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: box.maxY,
});

test.describe("リサイズ時のコネクター端点追従", () => {
	test("接続元をリサイズすると端点が新しい下辺中央へ正確に追従する", async ({
		canvas,
	}) => {
		// 上の source（中心 500,200）と下の target。source の bottomCenter で接続する。
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

		const startPoint = () =>
			canvas
				.objectById(connectorId)
				.getAttribute("points")
				.then((attr) => parsePoints(attr)[0]);
		const pointsAttr = () =>
			canvas.objectById(connectorId).getAttribute("points");

		// 初期: 端点は source の下辺中央に乗る。
		const initialBox = await worldAABB(canvas, sourceId);
		const initialBottomCenter = bottomCenter(initialBox);
		expect(
			distance(await startPoint(), initialBottomCenter),
			"初期は端点が下辺中央に乗ること",
		).toBeLessThanOrEqual(EPS);

		// ── 下辺を下へ伸ばす（垂直方向の追従）──
		const beforeResize1 = await pointsAttr();
		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.dragTransformHandle(
			"bottomCenter",
			{ x: 500, y: 340 },
			{ ctrl: true },
		);
		await expect
			.poll(pointsAttr, { message: "下辺リサイズで端点が追従すること" })
			.not.toBe(beforeResize1);

		const box1 = await worldAABB(canvas, sourceId);
		const bottomCenter1 = bottomCenter(box1);
		// 下辺が実際に下がっている（追従が空振りでない）。
		expect(bottomCenter1.y, "下辺が下へ伸びていること").toBeGreaterThan(
			initialBottomCenter.y + 20,
		);
		// 端点はリサイズ後の下辺中央に正確に乗る。
		expect(
			distance(await startPoint(), bottomCenter1),
			`端点 ${JSON.stringify(await startPoint())} が新しい下辺中央 ${JSON.stringify(bottomCenter1)} に乗ること`,
		).toBeLessThanOrEqual(EPS);

		// ── 右辺を右へ伸ばす（中心 x がずれ、水平方向の追従）──
		const beforeResize2 = await pointsAttr();
		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: 740, y: box1.minY + (box1.maxY - box1.minY) / 2 },
			{ ctrl: true },
		);
		await expect
			.poll(pointsAttr, { message: "右辺リサイズで端点が追従すること" })
			.not.toBe(beforeResize2);

		const box2 = await worldAABB(canvas, sourceId);
		const bottomCenter2 = bottomCenter(box2);
		// 中心 x が右へ動いている。
		expect(
			bottomCenter2.x,
			"右辺リサイズで下辺中央の x が右へ動くこと",
		).toBeGreaterThan(bottomCenter1.x + 20);
		// 端点はリサイズ後の下辺中央（x が動いた位置）に正確に乗る。
		expect(
			distance(await startPoint(), bottomCenter2),
			`端点 ${JSON.stringify(await startPoint())} が新しい下辺中央 ${JSON.stringify(bottomCenter2)} に乗ること`,
		).toBeLessThanOrEqual(EPS);
	});
});

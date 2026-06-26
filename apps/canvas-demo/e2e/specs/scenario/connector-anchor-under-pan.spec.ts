import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * パン（viewBox 原点の移動）中にコネクターを「作成」したとき、端点が正しいワールド座標
 * （図形の辺）に解決されることを検証する spec。
 *
 * connector-anchor-under-zoom.spec は viewBox の *スケール*（ズーム）下での作成を守るが、
 * viewBox の *原点移動*（パン）下での作成は別経路だった。パンの平行移動が screen→world 変換に
 * 正しく入らないと、パン後に作ったコネクターの端点が辺からずれる。
 *
 * 図形との対話は「現在の画面 boundingBox → toContent」で行い（パンでも実画面位置に当たる）、
 * 端点の期待値は要素の transform 属性（モデル変換＝パン不変）由来のワールド AABB から作る。
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

/**
 * 図形のワールド AABB を要素の transform 属性（local→world のモデル変換）で算出する。
 * getCTM は viewBox（パン/ズーム）を畳み込むためビューポート操作下ではワールド座標とずれる。
 */
async function worldAABB(canvas: CanvasDriver, id: string): Promise<AABB> {
	return canvas.page.evaluate((targetId) => {
		const el = document.querySelector(`[data-id="${targetId}"]`);
		if (!(el instanceof SVGGraphicsElement)) {
			throw new Error(`図形 ${targetId} が SVGGraphicsElement でない`);
		}
		const bbox = el.getBBox();
		const matched = (el.getAttribute("transform") ?? "").match(
			/matrix\(([^)]+)\)/,
		);
		const [a, b, c, d, e, f] = matched
			? matched[1].split(",").map(Number)
			: [1, 0, 0, 1, 0, 0];
		const corners = [
			{ x: bbox.x, y: bbox.y },
			{ x: bbox.x + bbox.width, y: bbox.y },
			{ x: bbox.x, y: bbox.y + bbox.height },
			{ x: bbox.x + bbox.width, y: bbox.y + bbox.height },
		].map((p) => ({
			x: p.x * a + p.y * c + e,
			y: p.x * b + p.y * d + f,
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

const centerX = (box: AABB): number => (box.minX + box.maxX) / 2;

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

/** 図形の中心コンテンツ座標（画面 boundingBox を toContent で変換。パンでも実画面に当たる） */
async function contentCenter(canvas: CanvasDriver, id: string): Promise<Vec> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`図形 ${id} の boundingBox が取得できない`);
	}
	return canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
}

/** viewBox の原点（x,y）を返す */
async function viewBoxOrigin(canvas: CanvasDriver): Promise<Vec> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	const [x, y] = raw.trim().split(/\s+/).map(Number);
	return { x, y };
}

test.describe("パン下でのコネクター作成", () => {
	test("パン後に作成しても端点が図形の辺に正確に解決される", async ({
		canvas,
	}) => {
		const sourceId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 300 },
		);
		await canvas.deselect();
		const targetId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 450 },
			{ x: 600, y: 550 },
		);
		await canvas.deselect();

		// 右ボタンドラッグでビューポートをパンする。
		const originBefore = await viewBoxOrigin(canvas);
		await canvas.rightDrag({ x: 650, y: 400 }, { x: 740, y: 480 });
		await expect
			.poll(
				async () => {
					const o = await viewBoxOrigin(canvas);
					return distance(o, originBefore);
				},
				{ message: "パンで viewBox 原点が移動すること" },
			)
			.toBeGreaterThan(20);

		// パン後の現在の画面位置で source を選択し、bottomCenter から target へドラッグ。
		await canvas.selectAt(await contentCenter(canvas, sourceId));
		const connectorId = await canvas.createConnector(
			"bottomCenter",
			await contentCenter(canvas, targetId),
		);
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const sourceBox = await worldAABB(canvas, sourceId);
		const targetBox = await worldAABB(canvas, targetId);

		// 始点は source 下辺中央にワールド座標で正確に乗る（パンの平行移動が変換に正しく入る）。
		expect(
			distance(points[0], { x: centerX(sourceBox), y: sourceBox.maxY }),
			`始点 ${JSON.stringify(points[0])} が source 下辺中央に乗ること（パン下）`,
		).toBeLessThanOrEqual(EPS);

		// 終点は target の輪郭（周）上に乗る。
		expect(
			onPerimeter(points[points.length - 1], targetBox),
			`終点 ${JSON.stringify(points[points.length - 1])} が target の周上に乗ること（パン下）`,
		).toBe(true);

		// 全セグメントが直角。
		for (let i = 1; i < points.length; i++) {
			const horizontal = Math.abs(points[i - 1].y - points[i].y) <= EPS;
			const vertical = Math.abs(points[i - 1].x - points[i].x) <= EPS;
			expect(
				horizontal !== vertical,
				`セグメント ${i - 1}->${i} が直角であること`,
			).toBe(true);
		}
	});
});

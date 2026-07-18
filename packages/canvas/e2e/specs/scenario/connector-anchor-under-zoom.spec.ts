import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * ズームイン中にコネクターを「作成」したとき、端点が正しいワールド座標（図形の辺）に
 * 解決されることを検証する spec。
 *
 * コネクター作成のドラッグは画面座標で行われ、ハンドラ側で現在の viewBox に応じて
 * screen→world 変換される。zoom=1 では screen≒world で退行が隠れるが、ズーム中は変換が
 * 壊れると端点が辺からずれる。既存のコネクター spec は全て zoom=1 で作成しており、ズーム下の
 * アンカー解決は隙間だった。
 *
 * 図形との対話は「現在の画面 boundingBox → toContent」で行い（ズームでも実画面位置に当たる）、
 * 端点の期待値は要素の transform 属性（モデル変換＝ズーム不変）由来のワールド AABB から作る。
 * getCTM は viewBox スケールを畳み込むためズーム下ではワールド座標とずれる点に注意。
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
 * 図形のワールド AABB を、要素の `transform` 属性（モデル変換 local→world）で算出する。
 * getCTM は viewBox（ズーム）スケールを畳み込むため、ズーム中はワールド座標と一致しない。
 * コネクターの points が使うのと同じワールド空間で比較するため、ズーム不変な transform 属性
 * （matrix(...)）でローカル bbox を変換する。
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

/** 図形の中心コンテンツ座標（画面 boundingBox を toContent で変換。ズームでも実画面に当たる） */
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

/** 図形の画面上の幅（ズーム適用待ちのシグナル） */
async function screenWidth(canvas: CanvasDriver, id: string): Promise<number> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`図形 ${id} の boundingBox が取得できない`);
	}
	return box.width;
}

/** 画面 1px が表すワールド長＝ viewBox 幅 ÷ SVG 画面幅。zoom=1 で 1、ズームインで < 1。 */
async function worldPerScreenPixel(canvas: CanvasDriver): Promise<number> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	const vbWidth = Number(raw.trim().split(/\s+/)[2]);
	const svgScreenWidth = await canvas.page.evaluate(() => {
		const svgs = [...document.querySelectorAll("svg")];
		let best = 0;
		let width = 0;
		for (const svg of svgs) {
			const rect = svg.getBoundingClientRect();
			const area = rect.width * rect.height;
			if (area > best) {
				best = area;
				width = rect.width;
			}
		}
		return width;
	});
	return vbWidth / svgScreenWidth;
}

test.describe("ズーム下でのコネクター作成", () => {
	test("ズームイン中に作成しても端点が図形の辺に正確に解決される", async ({
		canvas,
	}) => {
		// 近接した上下 2 図形（ズームインしても両方が画面に収まるよう中央寄りに置く）。
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

		// 2 図形の中間を基点にズームインする。
		const widthBefore = await screenWidth(canvas, sourceId);
		await canvas.wheel({ x: 500, y: 375 }, { deltaY: -150, ctrl: true });
		await expect
			.poll(() => screenWidth(canvas, sourceId), {
				message: "ズームインで図形が画面上で拡大すること",
			})
			.toBeGreaterThan(widthBefore + 1);

		const scale = await worldPerScreenPixel(canvas);
		// ズームインしていること（zoom=1 と区別できないと無意味）。
		expect(scale).toBeLessThan(1);

		// ズーム中の現在の画面位置を使って source を選択し、bottomCenter から target へドラッグ。
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

		// 始点は source 下辺中央にワールド座標で正確に乗る（screen→world 変換が正しい）。
		expect(
			distance(points[0], { x: centerX(sourceBox), y: sourceBox.maxY }),
			`始点 ${JSON.stringify(points[0])} が source 下辺中央に乗ること（ズーム下）`,
		).toBeLessThanOrEqual(EPS);

		// 終点は target の輪郭（周）上に乗る（中心へドロップ→輪郭吸着でも周上）。
		expect(
			onPerimeter(points[points.length - 1], targetBox),
			`終点 ${JSON.stringify(points[points.length - 1])} が target の周上に乗ること（ズーム下）`,
		).toBe(true);

		// 全セグメントが直角（経路もワールド空間で正しく計算されている）。
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

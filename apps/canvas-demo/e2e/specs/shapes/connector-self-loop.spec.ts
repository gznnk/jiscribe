import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 同一図形へ接続する「自己ループ」コネクターを検証する spec。
 *
 * 自己ループ（feat: コネクターの自己ループ対応）は、作成アンカーから同じ図形の本体へ
 * ドロップすると、固定側と別の辺へ接続するループを作る。描画は routeSelfLoop により
 * AABB+margin のリング外周を回る矩形ループ（直交専用）になる。既存のコネクター spec は
 * すべて「異なる 2 図形」を結ぶケースしか見ておらず、自己ループは未検証だった。
 *
 * ここでは 1 つの矩形に対して自己ループを作り、(1) 両端が同じ図形の別々の辺に乗ること、
 * (2) 全セグメントが直角であること、(3) 図形を貫通せずに外周を回ること、(4) 自己ループは
 * orthogonal 専用のため RoutingMenu（routing 切替）が出ないこと、を守る。
 * アサーションはすべて図形の実描画 AABB から組み立て、座標オフセットに依存しない。
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

/** 点が box のどの辺に乗っているか（複数辺=角の場合もあるので配列で返す） */
function edgesOf(
	p: Vec,
	box: AABB,
): Array<"left" | "right" | "top" | "bottom"> {
	const edges: Array<"left" | "right" | "top" | "bottom"> = [];
	const withinY = p.y >= box.minY - EPS && p.y <= box.maxY + EPS;
	const withinX = p.x >= box.minX - EPS && p.x <= box.maxX + EPS;
	if (Math.abs(p.x - box.minX) <= EPS && withinY) {
		edges.push("left");
	}
	if (Math.abs(p.x - box.maxX) <= EPS && withinY) {
		edges.push("right");
	}
	if (Math.abs(p.y - box.minY) <= EPS && withinX) {
		edges.push("top");
	}
	if (Math.abs(p.y - box.maxY) <= EPS && withinX) {
		edges.push("bottom");
	}
	return edges;
}

/** 軸並行セグメント (a→b) が box の内部を通るか（辺ぴったりは貫通としない） */
function penetratesInterior(a: Vec, b: Vec, box: AABB): boolean {
	const inner = {
		minX: box.minX + EPS,
		maxX: box.maxX - EPS,
		minY: box.minY + EPS,
		maxY: box.maxY - EPS,
	};
	const segMinX = Math.min(a.x, b.x);
	const segMaxX = Math.max(a.x, b.x);
	const segMinY = Math.min(a.y, b.y);
	const segMaxY = Math.max(a.y, b.y);
	return (
		segMaxX > inner.minX &&
		segMinX < inner.maxX &&
		segMaxY > inner.minY &&
		segMinY < inner.maxY
	);
}

function assertOrthogonalSegments(points: Vec[]) {
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const cur = points[i];
		const horizontal = Math.abs(prev.y - cur.y) <= EPS;
		const vertical = Math.abs(prev.x - cur.x) <= EPS;
		expect(
			horizontal !== vertical,
			`セグメント ${i - 1}->${i} が直角でない（重複点 or 斜め）: ${JSON.stringify(prev)} -> ${JSON.stringify(cur)}`,
		).toBe(true);
	}
}

test.describe("コネクターの自己ループ（同一図形への接続）", () => {
	test("作成アンカーから同じ図形へドロップすると、別の辺へ接続するループができる", async ({
		canvas,
	}) => {
		// 自己ループの周回が見えるよう、十分大きい単一矩形を 1 つ置く。
		const shapeId = await canvas.drawShape(
			"Rectangle",
			{ x: 450, y: 300 },
			{ x: 650, y: 460 },
		);

		// topCenter の作成アンカーから、同じ図形の本体（右辺寄りの内側）へドロップ。
		// 固定側（topCenter）を除いた最近傍アンカー = rightCenter へ接続するので、別の辺になる。
		const connectorId = await canvas.createConnector("topCenter", {
			x: 640,
			y: 380,
		});
		await canvas.deselect();

		// コネクターが 1 本だけ増えていること（=自己ループが作成された）。
		const connectorCount = (await canvas.captureObjects()).filter(
			(o) => o.tag === "polyline",
		).length;
		expect(connectorCount, "自己ループのコネクターが 1 本作成されること").toBe(
			1,
		);

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const box = await worldAABB(canvas, shapeId);

		// 端点はどちらも同じ図形の周上に乗る。
		const startEdges = edgesOf(points[0], box);
		const endEdges = edgesOf(points[points.length - 1], box);
		expect(
			startEdges.length,
			`始点 ${JSON.stringify(points[0])} が図形の周上に乗ること`,
		).toBeGreaterThan(0);
		expect(
			endEdges.length,
			`終点 ${JSON.stringify(points[points.length - 1])} が図形の周上に乗ること`,
		).toBeGreaterThan(0);

		// 両端は「別々の辺」に接続する（自己ループは固定側と同じアンカーを避ける）。
		const sharesEdge = startEdges.some((e) => endEdges.includes(e));
		expect(
			sharesEdge,
			`両端が別の辺に接続すること: start=${startEdges} end=${endEdges}`,
		).toBe(false);

		// ループなので折れ点を含み、最低 3 頂点ある。
		expect(
			points.length,
			`ループは折れ点を含むこと: ${JSON.stringify(points)}`,
		).toBeGreaterThanOrEqual(3);

		// 全セグメントが直角（自己ループは routing 指定に関わらず直交ルート）。
		assertOrthogonalSegments(points);

		// どのセグメントも図形内部を貫通しない（外周を回る）。
		for (let i = 1; i < points.length; i++) {
			expect(
				penetratesInterior(points[i - 1], points[i], box),
				`セグメント ${i - 1}->${i} が図形を貫通しないこと`,
			).toBe(false);
		}

		// 端点以外の中継頂点は図形 AABB の外側にある（リング外周を回る）。
		const interiorVertex = points
			.slice(1, -1)
			.find(
				(p) =>
					p.x > box.minX + EPS &&
					p.x < box.maxX - EPS &&
					p.y > box.minY + EPS &&
					p.y < box.maxY - EPS,
			);
		expect(
			interiorVertex,
			`中継頂点が図形内部に入らないこと: ${JSON.stringify(points)}`,
		).toBeUndefined();
	});

	test("自己ループは orthogonal 専用のため routing 切替メニューが出ない", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 450, y: 300 }, { x: 650, y: 460 });
		const connectorId = await canvas.createConnector("topCenter", {
			x: 640,
			y: 380,
		});
		await canvas.deselect();

		// 自己ループの線上を選択する（最長セグメントの中点をクリック）。
		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		let best = { mid: points[0], length: -1 };
		for (let i = 1; i < points.length; i++) {
			const a = points[i - 1];
			const b = points[i];
			const length = Math.hypot(b.x - a.x, b.y - a.y);
			if (length > best.length) {
				best = { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, length };
			}
		}
		await canvas.clickAt(best.mid);

		// コネクター用 ObjectMenu は出る（線色トグルで確認）が、routing 切替は隠れる。
		await expect(
			canvas.page.locator('[data-part="toggle:line-color"]'),
			"コネクターの ObjectMenu が表示されること",
		).toBeVisible();
		await expect(
			canvas.page.locator('[data-part="toggle:connector-routing"]'),
			"自己ループでは routing 切替メニューが出ないこと",
		).toHaveCount(0);
	});
});

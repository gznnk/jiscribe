import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * コネクターの直交ルーティングを「幾何」レベルで検証する spec。
 *
 * 既存のコネクター spec 群（connector / connector-follow-* / connector-reconnect 等）は
 * points 属性の「変化／非変化」までしか見ておらず、実際に描かれる経路が幾何的に正しいか
 * ——端点が接続図形の辺に正確に乗るか、全セグメントが直角か、図形を貫通しないか、
 * 直線経路を塞ぐと回り込んで折れ点が増えるか——は未検証だった。
 *
 * routeOrthogonalConnector（packages/canvas）の出力が DOM の polyline points に
 * そのまま反映されることを、座標オフセットに依存しない不変条件で守る。アサーションは
 * すべて「図形のワールド AABB を実行時に読み取り、それと points を突き合わせる」形にして
 * いるため、content 座標とワールド座標のマッピングに依存しない。
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

// ルーティングの丸め（中点の Math.round 等）を吸収する許容誤差（px）。
const EPS = 1.5;

/** polyline の points 属性 "x1,y1 x2,y2 ..." を座標配列へパースする */
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

/**
 * 図形（data-id）のワールド座標系での軸並行バウンディングボックスを返す。
 * コネクターの points と同じ SVG ユーザー座標系で比較するため、ローカル bbox の
 * 4 隅を getCTM で変換して min/max を取る（回転していなければ厳密な AABB になる）。
 */
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
const centerY = (box: AABB): number => (box.minY + box.maxY) / 2;

/** 2 点がほぼ一致するか（EPS 以内） */
function near(a: Vec, b: Vec): boolean {
	return Math.abs(a.x - b.x) <= EPS && Math.abs(a.y - b.y) <= EPS;
}

/** 点が box の周（いずれかの辺上）に EPS 以内で乗っているか */
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

/**
 * 軸並行セグメント (a→b) が box の「内部」を通るか。
 * 辺ぴったり（端点が辺に乗る・margin 外を平行に走る）は貫通としないよう、box を EPS 縮めて
 * セグメントの AABB と重なるかで判定する（直交経路前提）。
 */
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

/** 隣り合う頂点ごとに、水平 or 垂直のどちらか一方だけが動く（=直角・退化なし）ことを検査する */
function assertOrthogonalSegments(points: Vec[]) {
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const cur = points[i];
		const horizontal = Math.abs(prev.y - cur.y) <= EPS;
		const vertical = Math.abs(prev.x - cur.x) <= EPS;
		// 直角: 「水平のみ」か「垂直のみ」。両方一致（重複点）も、どちらも不一致（斜め）も不可。
		expect(
			horizontal !== vertical,
			`セグメント ${i - 1}->${i} が直角でない（重複点 or 斜め）: ${JSON.stringify(prev)} -> ${JSON.stringify(cur)}`,
		).toBe(true);
		const length = horizontal
			? Math.abs(cur.x - prev.x)
			: Math.abs(cur.y - prev.y);
		expect(
			length,
			`セグメント ${i - 1}->${i} の長さが 0（退化点）`,
		).toBeGreaterThan(EPS);
	}
}

test.describe("コネクターのルーティング幾何", () => {
	test("縦並びの図形を結ぶと端点が上下の辺中央に正確に乗る", async ({
		canvas,
	}) => {
		// 中心 x を揃えた上下 2 矩形。bottomCenter → topCenter の素直な縦接続になる。
		const sourceId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 150 },
			{ x: 600, y: 250 },
		);
		await canvas.deselect();
		const targetId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 450 },
			{ x: 600, y: 550 },
		);
		await canvas.deselect();

		await canvas.selectAt({ x: 500, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 500,
			y: 450,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const sourceBox = await worldAABB(canvas, sourceId);
		const targetBox = await worldAABB(canvas, targetId);

		// 始点は source の下辺中央、終点は target の上辺中央にぴたりと乗る。
		const sourceBottomCenter = { x: centerX(sourceBox), y: sourceBox.maxY };
		const targetTopCenter = { x: centerX(targetBox), y: targetBox.minY };
		expect(
			near(points[0], sourceBottomCenter),
			`始点 ${JSON.stringify(points[0])} が source 下辺中央 ${JSON.stringify(sourceBottomCenter)} に乗ること`,
		).toBe(true);
		expect(
			near(points[points.length - 1], targetTopCenter),
			`終点 ${JSON.stringify(points[points.length - 1])} が target 上辺中央 ${JSON.stringify(targetTopCenter)} に乗ること`,
		).toBe(true);

		// 中心が揃っているので一直線の縦コネクター: 全頂点が同じ x、上から下へ。
		for (const p of points) {
			expect(Math.abs(p.x - centerX(sourceBox))).toBeLessThanOrEqual(EPS);
		}
		expect(points[0].y).toBeLessThan(points[points.length - 1].y);
		assertOrthogonalSegments(points);
	});

	test("斜めに配置した図形では全セグメントが直角で端点が辺に乗り図形を貫通しない", async ({
		canvas,
	}) => {
		// 左上の source と右下の target。直線では結べず必ずエルボ（折れ）が要る配置。
		const sourceId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 180 },
			{ x: 460, y: 280 },
		);
		await canvas.deselect();
		const targetId = await canvas.drawShape(
			"Rectangle",
			{ x: 820, y: 440 },
			{ x: 980, y: 540 },
		);
		await canvas.deselect();

		// source の右辺アンカーから target の内部へドラッグして接続する。
		await canvas.selectAt({ x: 380, y: 230 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 900,
			y: 490,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const sourceBox = await worldAABB(canvas, sourceId);
		const targetBox = await worldAABB(canvas, targetId);

		// エルボが要る配置なので 3 頂点以上（=最低 1 回は折れる）。
		expect(points.length).toBeGreaterThanOrEqual(3);

		// 始点は source の右辺中央に乗り、最初のセグメントは右向きに水平に出る（退出方向）。
		const sourceRightCenter = { x: sourceBox.maxX, y: centerY(sourceBox) };
		expect(
			near(points[0], sourceRightCenter),
			`始点 ${JSON.stringify(points[0])} が source 右辺中央 ${JSON.stringify(sourceRightCenter)} に乗ること`,
		).toBe(true);
		expect(Math.abs(points[1].y - points[0].y)).toBeLessThanOrEqual(EPS);
		expect(points[1].x).toBeGreaterThan(points[0].x + EPS);

		// 終点は target のいずれかの辺上に乗る（どの辺に接続されても周上にあること）。
		expect(
			onPerimeter(points[points.length - 1], targetBox),
			`終点 ${JSON.stringify(points[points.length - 1])} が target の周上に乗ること`,
		).toBe(true);

		// 全セグメントが直角・退化なし。
		assertOrthogonalSegments(points);

		// どのセグメントも source / target の内部を貫通しない。
		for (let i = 1; i < points.length; i++) {
			const a = points[i - 1];
			const b = points[i];
			expect(
				penetratesInterior(a, b, sourceBox),
				`セグメント ${i - 1}->${i} が source を貫通しないこと`,
			).toBe(false);
			expect(
				penetratesInterior(a, b, targetBox),
				`セグメント ${i - 1}->${i} が target を貫通しないこと`,
			).toBe(false);
		}
	});

	test("直線経路を塞ぐ位置へ図形を動かすと回り込んで折れ点が増え、貫通しない", async ({
		canvas,
	}) => {
		// 同じ y で左右に並べる。右辺→左辺が正面で向かい合い、初期は一直線（2 頂点）になる。
		const sourceId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 320 },
			{ x: 460, y: 420 },
		);
		await canvas.deselect();
		const targetId = await canvas.drawShape(
			"Rectangle",
			{ x: 760, y: 320 },
			{ x: 920, y: 420 },
		);
		await canvas.deselect();

		await canvas.selectAt({ x: 380, y: 370 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 840,
			y: 370,
		});
		await canvas.deselect();

		const beforePoints = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		// 正面で向かい合うので初期は一直線（=2 頂点・折れなし）。
		expect(beforePoints.length).toBe(2);
		assertOrthogonalSegments(beforePoints);

		// target を source の左側へ動かす。source は右へ退出するため、線は source を
		// 回り込んで左の target に届く必要があり、折れ点が増える。
		await canvas.drag({ x: 840, y: 370 }, { x: 180, y: 370 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "target 移動でコネクターが再ルーティングされること",
			})
			.not.toBe(beforePoints.map((p) => `${p.x},${p.y}`).join(" "));

		const afterPoints = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const sourceBox = await worldAABB(canvas, sourceId);
		const targetBox = await worldAABB(canvas, targetId);

		// 回り込みで頂点が増える（直線 2 点 → 折れる）。U ターンには最低 4 頂点必要。
		expect(afterPoints.length).toBeGreaterThan(beforePoints.length);
		expect(afterPoints.length).toBeGreaterThanOrEqual(4);

		// 再ルーティング後も全セグメントが直角で、どの図形も貫通しない。
		assertOrthogonalSegments(afterPoints);
		for (let i = 1; i < afterPoints.length; i++) {
			const a = afterPoints[i - 1];
			const b = afterPoints[i];
			expect(
				penetratesInterior(a, b, sourceBox),
				`回り込み後: セグメント ${i - 1}->${i} が source を貫通しないこと`,
			).toBe(false);
			expect(
				penetratesInterior(a, b, targetBox),
				`回り込み後: セグメント ${i - 1}->${i} が target を貫通しないこと`,
			).toBe(false);
		}
	});
});

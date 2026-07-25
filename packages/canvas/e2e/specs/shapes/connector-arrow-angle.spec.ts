import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * 矢印の「向き（回転角）」が端セグメントの方向に一致することを幾何レベルで検証する spec。
 *
 * 矢印は端点を先端として、隣接点へ向かう端セグメントに沿って回転して描かれる
 * （Connector.tsx の startAngleRadians / endAngleRadians = calcVectorAngleRad(...)）。矢印 polygon は
 * matrix(sx·cosθ, sx·sinθ, …, x, y) で配置されるため、行列から θ=atan2(b,a)（回転角）と
 * (e,f)（先端＝端点）が読める。connector-arrow-head.spec は矢印の有無・形状・入れ替えは守るが、
 * この「向きが端セグメントに沿う」幾何は未検証だった。
 *
 * ここでは L 字（始端は真下へ出て上向き矢印、終端は水平に入って右向き矢印）になる配置を作り、
 * 始端・終端それぞれの矢印が
 *   - 先端が端点に一致する
 *   - 回転角が実際の端セグメント方向（外向き）に一致する
 * ことを守る。始端と終端で向きの軸が異なるため、取り違え（始端＝終端の角を使う等）も検出できる。
 */

type Vec = { x: number; y: number };
type ArrowMatrix = { a: number; b: number; tip: Vec };

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

/** 2 角の差を [-π, π] に正規化した絶対値（ラジアン） */
function angleDiff(a: number, b: number): number {
	let d = a - b;
	while (d > Math.PI) {
		d -= 2 * Math.PI;
	}
	while (d < -Math.PI) {
		d += 2 * Math.PI;
	}
	return Math.abs(d);
}

/** コネクターの矢印 polygon すべての matrix（a,b と先端 e,f）を読む */
async function readArrows(
	canvas: CanvasDriver,
	id: string,
): Promise<ArrowMatrix[]> {
	return canvas.page.evaluate((cid) => {
		return [
			...document.querySelectorAll(
				`polygon[data-kind="connector"][data-id="${cid}"]`,
			),
		].map((poly) => {
			const matched = (poly.getAttribute("transform") ?? "").match(
				/matrix\(([^)]+)\)/,
			);
			const nums = matched ? matched[1].split(",").map(Number) : [];
			return { a: nums[0], b: nums[1], tip: { x: nums[4], y: nums[5] } };
		});
	}, id);
}

/** endpoint に最も近い矢印を返す */
function arrowNearest(arrows: ArrowMatrix[], endpoint: Vec): ArrowMatrix {
	let best = arrows[0];
	let bestDist = Infinity;
	for (const arrow of arrows) {
		const d = distance(arrow.tip, endpoint);
		if (d < bestDist) {
			bestDist = d;
			best = arrow;
		}
	}
	return best;
}

/** 線の中点付近をクリックしてコネクターを選択し、矢印メニューの表示を待つ */
async function selectConnector(canvas: CanvasDriver, at: Vec) {
	await canvas.clickAt(at);
	await expect(
		canvas.page.locator(selectors.objectMenuToggle("arrow-head-end")),
	).toBeVisible();
}

test.describe("コネクターの矢印の向き", () => {
	test("矢印の回転角が端セグメントの方向（外向き）に一致する", async ({
		canvas,
	}) => {
		// source は左上、target は右下。source bottomCenter（下へ出る）→ target leftCenter
		// （左から水平に入る）で L 字経路になる。
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 400 }, { x: 900, y: 500 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 715,
			y: 450,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		expect(points.length).toBeGreaterThanOrEqual(2);

		const start = points[0];
		const end = points[points.length - 1];
		const afterStart = points[1];
		const beforeEnd = points[points.length - 2];

		// 既定では終端のみ矢印。終端矢印の向きを検証する。
		const endArrow = arrowNearest(await readArrows(canvas, connectorId), end);
		// 先端は終端の端点に一致する。
		expect(
			distance(endArrow.tip, end),
			"終端矢印の先端が終点に一致すること",
		).toBeLessThanOrEqual(1.5);
		// 回転角は「beforeEnd → end」（外向き＝端点へ向かう向き）に一致する。
		const endArrowAngle = Math.atan2(endArrow.b, endArrow.a);
		const endSegmentAngle = Math.atan2(
			end.y - beforeEnd.y,
			end.x - beforeEnd.x,
		);
		expect(
			angleDiff(endArrowAngle, endSegmentAngle),
			`終端矢印の角 ${endArrowAngle.toFixed(3)} が端セグメント方向 ${endSegmentAngle.toFixed(3)} に一致すること`,
		).toBeLessThanOrEqual(0.05);

		// 始端にも矢印を付けて、別方向（外向き）に沿うことを検証する。
		await selectConnector(canvas, {
			x: start.x,
			y: (start.y + afterStart.y) / 2,
		});
		await canvas.openObjectMenu("arrow-head-start");
		await canvas.page.click(
			selectors.objectMenuSet("startArrow", "FilledTriangle"),
		);
		await canvas.deselect();

		const startArrow = arrowNearest(
			await readArrows(canvas, connectorId),
			start,
		);
		// 先端は始端の端点に一致する。
		expect(
			distance(startArrow.tip, start),
			"始端矢印の先端が始点に一致すること",
		).toBeLessThanOrEqual(1.5);
		// 回転角は「afterStart → start」（外向き＝始点側へ向かう向き）に一致する。
		const startArrowAngle = Math.atan2(startArrow.b, startArrow.a);
		const startSegmentAngle = Math.atan2(
			start.y - afterStart.y,
			start.x - afterStart.x,
		);
		expect(
			angleDiff(startArrowAngle, startSegmentAngle),
			`始端矢印の角 ${startArrowAngle.toFixed(3)} が端セグメント方向 ${startSegmentAngle.toFixed(3)} に一致すること`,
		).toBeLessThanOrEqual(0.05);

		// L 字なので始端（垂直）と終端（水平）で向きの軸が異なることも確認（取り違え検出）。
		expect(
			angleDiff(startArrowAngle, endArrowAngle),
			"始端と終端の矢印は別方向を向くこと（L 字配置）",
		).toBeGreaterThan(1.0);
	});
});

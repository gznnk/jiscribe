import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * コネクターの「矢印インセット幾何」を検証する spec。
 *
 * コネクターは 2 本の polyline で描かれる:
 *   - 当たり判定線（ConnectorHitArea, data-kind=connector・data-id 付き）: 端点まで全長
 *   - 視覚線（ConnectorElement, data 属性なし）: 矢印の根元で手前に終端（inset）
 * 中空/塗り矢印が線を貫通して見えたり線幅ぶんはみ出すのを防ぐため、矢印のある端だけ
 * 視覚線を inset する（insetPolylineEnds）。connector-arrow-head.spec は矢印 polygon の
 * 増減・入れ替えは守るが、この「視覚線が端点より手前で終わる／当たり判定線は全長を保つ」
 * という幾何は未検証だった。
 *
 * ここでは始端・終端それぞれの inset が矢印の有無に応じて独立に効くことを、当たり判定線と
 * 視覚線の端点差分で守る。座標オフセットには依存しない（2 本の線の相対差だけを見る）。
 */

type Vec = { x: number; y: number };

// inset の丸め・端点一致の許容誤差（px）。既定の終端矢印 ConcaveTriangle の inset は
// 8.1 * strokeWidth(2) ≈ 16px なので、「inset あり」は十分この閾値を超える。
const EPS = 1.5;
// 「明確に inset されている」とみなす最小距離（px）。strokeWidth より十分大きく取る。
const MIN_INSET = 6;

/** "x1,y1 x2,y2 ..." を座標配列へパースする */
function parsePoints(attr: string): Vec[] {
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
 * 単一コネクターの当たり判定線（全長）と視覚線（inset 済み）の座標列を読む。
 * 当たり判定線（ConnectorHitArea）と視覚線（ConnectorElement）は同じ fragment の兄弟として
 * 同一の親要素配下に描かれるため、視覚線は「当たり判定線の親の中で data-kind / data-id を
 * 持たない polyline」として特定する（ツールバーアイコン等の無関係な polyline を除外する）。
 */
async function readLines(
	canvas: CanvasDriver,
	id: string,
): Promise<{ hit: Vec[]; visual: Vec[] }> {
	const data = await canvas.page.evaluate((cid) => {
		const hitEl = document.querySelector(
			`polyline[data-kind="connector"][data-id="${cid}"]`,
		);
		const parent = hitEl?.parentElement ?? null;
		const visualEl = parent
			? [...parent.querySelectorAll("polyline")].find(
					(el) => !el.hasAttribute("data-kind") && !el.hasAttribute("data-id"),
				)
			: null;
		return {
			hit: hitEl?.getAttribute("points") ?? null,
			visual: visualEl?.getAttribute("points") ?? null,
		};
	}, id);
	if (!data.hit || !data.visual) {
		throw new Error("当たり判定線／視覚線の points が取得できない");
	}
	return { hit: parsePoints(data.hit), visual: parsePoints(data.visual) };
}

/**
 * 左右に並べた 2 矩形を rightCenter → leftCenter で水平に結ぶ。正面で向かい合うので
 * 経路は一直線（2 頂点）になり、端の inset が端セグメント上で素直に観測できる。
 * 既定の新規コネクターは終端のみ ConcaveTriangle を持つ。
 */
async function buildHorizontalConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 300, y: 320 }, { x: 460, y: 420 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 760, y: 320 }, { x: 920, y: 420 });
	await canvas.deselect();

	await canvas.selectAt({ x: 380, y: 370 });
	const id = await canvas.createConnector("rightCenter", { x: 840, y: 370 });
	await canvas.deselect();
	return id;
}

/** 線の中点をクリックしてコネクターを選択し、矢印メニューの表示を待つ */
async function selectConnectorLine(canvas: CanvasDriver) {
	await canvas.clickAt({ x: 610, y: 370 });
	await expect(
		canvas.page.locator(selectors.objectMenuToggle("arrow-head-end")),
	).toBeVisible();
}

test.describe("コネクターの矢印インセット", () => {
	test("終端の矢印に合わせて視覚線が手前で終端し、当たり判定線は端点まで伸びる", async ({
		canvas,
	}) => {
		const id = await buildHorizontalConnector(canvas);

		const { hit, visual } = await readLines(canvas, id);

		// 一直線（2 頂点）。視覚線も同じ頂点数。
		expect(hit.length).toBe(2);
		expect(visual.length).toBe(2);

		const hitStart = hit[0];
		const hitEnd = hit[hit.length - 1];
		const visualStart = visual[0];
		const visualEnd = visual[visual.length - 1];

		// 始端には矢印が無い → 視覚線の始点は当たり判定線の始点と一致（inset なし）。
		expect(
			distance(visualStart, hitStart),
			`始端は inset されない: visual ${JSON.stringify(visualStart)} ≒ hit ${JSON.stringify(hitStart)}`,
		).toBeLessThanOrEqual(EPS);

		// 終端には既定矢印（ConcaveTriangle）→ 視覚線の終点は端点より手前で終わる。
		expect(
			distance(visualEnd, hitEnd),
			`終端は矢印ぶん手前で終わる: visual ${JSON.stringify(visualEnd)} と hit ${JSON.stringify(hitEnd)} の差`,
		).toBeGreaterThan(MIN_INSET);

		// inset は端セグメント上（同じ y）で、始点側へ引き戻される（x が端点より小さい）。
		expect(Math.abs(visualEnd.y - hitEnd.y)).toBeLessThanOrEqual(EPS);
		expect(visualEnd.x).toBeLessThan(hitEnd.x - MIN_INSET);
		expect(visualEnd.x).toBeGreaterThan(hitStart.x);

		// 当たり判定線は全長を保つ（視覚線より長い）。
		expect(distance(hitStart, hitEnd)).toBeGreaterThan(
			distance(visualStart, visualEnd),
		);
	});

	test("始端に矢印を付けると始端も inset され、終端を None にすると終端の inset が消える", async ({
		canvas,
	}) => {
		const id = await buildHorizontalConnector(canvas);

		// 始端に矢印（FilledTriangle）を追加する。
		await selectConnectorLine(canvas);
		await canvas.openObjectMenu("arrow-head-start");
		await canvas.page.click(
			selectors.objectMenuSet("startArrow", "FilledTriangle"),
		);
		await canvas.deselect();

		const afterStart = await readLines(canvas, id);
		const startHitS = afterStart.hit[0];
		const startHitE = afterStart.hit[afterStart.hit.length - 1];
		const startVisS = afterStart.visual[0];
		const startVisE = afterStart.visual[afterStart.visual.length - 1];

		// 始端も終端も矢印があるので、両端とも inset される。
		expect(
			distance(startVisS, startHitS),
			"始端に矢印を付けたら始端も inset される",
		).toBeGreaterThan(MIN_INSET);
		expect(
			distance(startVisE, startHitE),
			"終端の inset は維持される",
		).toBeGreaterThan(MIN_INSET);
		// 始端 inset は終点側（x が増える向き）へ引き戻される。
		expect(startVisS.x).toBeGreaterThan(startHitS.x + MIN_INSET);

		// 終端の矢印を None にする。
		await selectConnectorLine(canvas);
		await canvas.openObjectMenu("arrow-head-end");
		await canvas.page.click(selectors.objectMenuSet("endArrow", "None"));
		await canvas.deselect();

		const afterEndNone = await readLines(canvas, id);
		const noneHitS = afterEndNone.hit[0];
		const noneHitE = afterEndNone.hit[afterEndNone.hit.length - 1];
		const noneVisS = afterEndNone.visual[0];
		const noneVisE = afterEndNone.visual[afterEndNone.visual.length - 1];

		// 終端の矢印が無くなったので終端の inset は消える（端点に一致）。
		expect(
			distance(noneVisE, noneHitE),
			"終端を None にしたら終端の inset が消える",
		).toBeLessThanOrEqual(EPS);
		// 始端の矢印は残っているので始端の inset は維持される。
		expect(
			distance(noneVisS, noneHitS),
			"始端の矢印は残るので始端の inset は維持される",
		).toBeGreaterThan(MIN_INSET);
	});
});

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * コネクターの strokeWidth と「矢印スケール・線インセット」の連動を検証する spec。
 *
 * 矢印は scale=strokeWidth で描かれ（matrix の (a,b) の長さ＝strokeWidth）、視覚線の端は
 * 矢印 inset = 定数 × strokeWidth だけ手前で終端する。つまり線を太くすると矢印も inset も
 * 比例して大きくなる。connector-style.spec は線色・線種を、connector-arrow-inset.spec は
 * strokeWidth=2 固定での inset を守るが、strokeWidth を変えたときの「比例スケール」連動は
 * 未検証だった。
 *
 * ここでは line-style メニューの数値入力で strokeWidth を 2→6 に変え、矢印行列のスケールと
 * 視覚線の inset がともに約 3 倍になることを守る。
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

/**
 * 当たり判定線（全長）と視覚線（inset 済み）の座標列を読む。視覚線は当たり判定線の親配下の
 * data 属性なし polyline。
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

/** 終端矢印のスケール（matrix の (a,b) の長さ＝strokeWidth）と inset を測る */
async function measure(
	canvas: CanvasDriver,
	id: string,
): Promise<{ arrowScale: number; inset: number }> {
	const { hit, visual } = await readLines(canvas, id);
	const end = hit[hit.length - 1];
	const arrow = arrowNearest(await readArrows(canvas, id), end);
	return {
		arrowScale: Math.hypot(arrow.a, arrow.b),
		inset: distance(visual[visual.length - 1], end),
	};
}

/** 左右の 2 矩形を rightCenter → leftCenter で結ぶ水平な直線コネクター（既定 end 矢印あり）。 */
async function buildHorizontalConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 460, y: 300 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 760, y: 200 }, { x: 920, y: 300 });
	await canvas.deselect();

	await canvas.selectAt({ x: 380, y: 250 });
	const id = await canvas.createConnector("rightCenter", { x: 840, y: 250 });
	await canvas.deselect();
	return id;
}

test.describe("コネクターの線幅と矢印・インセットの連動", () => {
	test("strokeWidth を太くすると矢印スケールと線インセットが比例して拡大する", async ({
		canvas,
	}) => {
		const connectorId = await buildHorizontalConnector(canvas);

		// 既定 strokeWidth=2。矢印スケール≈2、inset>0。
		const before = await measure(canvas, connectorId);
		expect(
			before.arrowScale,
			`既定の矢印スケールが strokeWidth(2) に一致すること: ${before.arrowScale.toFixed(2)}`,
		).toBeGreaterThan(1.5);
		expect(before.arrowScale).toBeLessThan(2.5);
		expect(before.inset, "既定でも終端は inset されていること").toBeGreaterThan(
			6,
		);

		// line-style メニューを開いて strokeWidth を 6 に変更。
		await canvas.clickAt({ x: 610, y: 250 });
		await expect(
			canvas.page.locator('[data-part="toggle:line-style"]'),
		).toBeVisible();
		await canvas.openObjectMenu("line-style");
		await canvas.setNumberInput("strokeWidth", 6);
		await canvas.deselect();

		// strokeWidth=6。矢印スケール≈6、inset も約 3 倍。
		const after = await measure(canvas, connectorId);
		expect(
			after.arrowScale,
			`変更後の矢印スケールが strokeWidth(6) に一致すること: ${after.arrowScale.toFixed(2)}`,
		).toBeGreaterThan(5.4);
		expect(after.arrowScale).toBeLessThan(6.6);

		// 比例連動: スケールも inset も strokeWidth 比（6/2=3）でほぼ 3 倍になる。
		expect(
			after.arrowScale / before.arrowScale,
			"矢印スケールが strokeWidth 比（≈3）で拡大すること",
		).toBeGreaterThan(2.6);
		expect(after.arrowScale / before.arrowScale).toBeLessThan(3.4);
		expect(
			after.inset / before.inset,
			`線インセットが strokeWidth 比（≈3）で拡大すること: ${(after.inset / before.inset).toFixed(2)}`,
		).toBeGreaterThan(2.6);
		expect(after.inset / before.inset).toBeLessThan(3.4);
	});
});

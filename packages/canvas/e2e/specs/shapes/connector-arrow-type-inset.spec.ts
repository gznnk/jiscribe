import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * 矢印「種別ごと」の線インセット差を検証する spec。
 *
 * 視覚線を矢印の根元で止める inset は矢印種別で異なる（getArrowLineInset / ARROW_LINE_INSETS）。
 * OpenArrow は body を持たず端点で線と繋がるため inset=0、ConcaveTriangle は ARROW_SIZE*0.9、
 * FilledTriangle は ARROW_SIZE と、種別で線の止まり位置が変わる。connector-arrow-inset.spec は
 * 既定（ConcaveTriangle）固定で start/end の有無を守るが、種別による inset 差は未検証だった。
 *
 * 終端矢印の種別を切り替え、視覚線の終点が当たり判定線の終点からどれだけ手前で止まるか
 * （inset）が種別に応じて変わることを守る:
 *   - OpenArrow      → inset ≈ 0（矢印はあるが線は端点まで届く）
 *   - ConcaveTriangle→ inset > 0
 *   - FilledTriangle → inset が ConcaveTriangle より大きい
 */

type Vec = { x: number; y: number };

const EPS = 1.5;

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

/** 終端の inset（当たり判定線の終点と視覚線の終点の距離）を測る */
async function endInset(canvas: CanvasDriver, id: string): Promise<number> {
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
	const hit = parsePoints(data.hit);
	const visual = parsePoints(data.visual);
	return distance(visual[visual.length - 1], hit[hit.length - 1]);
}

/** 線を選択し、終端矢印の種別を設定して選択解除する */
async function applyEndArrow(canvas: CanvasDriver, type: string) {
	await canvas.clickAt({ x: 610, y: 250 });
	await expect(
		canvas.page.locator(selectors.objectMenuToggle("arrow-head-end")),
	).toBeVisible();
	await canvas.openObjectMenu("arrow-head-end");
	await canvas.page.click(selectors.objectMenuSet("endArrow", type));
	await canvas.deselect();
}

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

test.describe("コネクターの矢印種別ごとの線インセット", () => {
	test("矢印種別で視覚線の止まり位置（inset）が変わる", async ({ canvas }) => {
		const connectorId = await buildHorizontalConnector(canvas);

		// 既定は ConcaveTriangle。inset > 0。
		const insetConcave = await endInset(canvas, connectorId);
		expect(
			insetConcave,
			`ConcaveTriangle は inset > 0: ${insetConcave.toFixed(2)}`,
		).toBeGreaterThan(6);

		// OpenArrow → inset ≈ 0（矢印はあるが線は端点まで届く）。
		await applyEndArrow(canvas, "OpenArrow");
		const insetOpen = await endInset(canvas, connectorId);
		expect(
			insetOpen,
			`OpenArrow は inset ≈ 0: ${insetOpen.toFixed(2)}`,
		).toBeLessThanOrEqual(EPS);

		// FilledTriangle → ConcaveTriangle より大きい inset（ARROW_SIZE > ARROW_SIZE*0.9）。
		await applyEndArrow(canvas, "FilledTriangle");
		const insetFilled = await endInset(canvas, connectorId);
		expect(
			insetFilled,
			`FilledTriangle は ConcaveTriangle より inset が大きい: filled ${insetFilled.toFixed(2)} > concave ${insetConcave.toFixed(2)}`,
		).toBeGreaterThan(insetConcave + 1);
	});
});

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * コネクターの破線パターンが strokeWidth に比例してスケールすることを検証する spec。
 *
 * 破線の dasharray は getStrokeDasharray で線幅から算出される（dashed = 「4·sw 4·sw」）。
 * connector-style.spec は「dashed/dotted を選ぶと dasharray が付く」ことは守るが、その
 * パターン長が strokeWidth に比例して伸びることは未検証だった。線を太くしたとき破線の
 * 目盛りが一緒に大きくならないと、太線で破線が詰まって見えるなどの崩れになる。
 *
 * line-style メニューで dashed を選び、strokeWidth を 2→6 に変えて dasharray の各値が
 * 4·sw（8→24）に一致＝約 3 倍になることを守る。
 */

/** 視覚線（ConnectorElement, data 属性なし polyline）の dasharray 数値列を読む */
async function readDashNumbers(
	canvas: CanvasDriver,
	id: string,
): Promise<number[]> {
	const raw = await canvas.page.evaluate((cid) => {
		const hitEl = document.querySelector(
			`polyline[data-kind="connector"][data-id="${cid}"]`,
		);
		const parent = hitEl?.parentElement ?? null;
		const visualEl = parent
			? [...parent.querySelectorAll("polyline")].find(
					(el) => !el.hasAttribute("data-kind") && !el.hasAttribute("data-id"),
				)
			: null;
		if (!visualEl) {
			return null;
		}
		// 属性（"8 8"）優先、無ければ computed style（"8px 8px"）。
		const attr = visualEl.getAttribute("stroke-dasharray");
		return attr ?? getComputedStyle(visualEl).strokeDasharray;
	}, id);
	if (!raw || raw === "none") {
		return [];
	}
	return [...raw.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

/** 左右の 2 矩形を rightCenter → leftCenter で結ぶ水平な直線コネクター。 */
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

test.describe("コネクターの破線スケール", () => {
	test("strokeWidth を太くすると破線パターンが比例して伸びる", async ({
		canvas,
	}) => {
		const connectorId = await buildHorizontalConnector(canvas);

		// 線を選択して破線（dashed）にする。
		await canvas.clickAt({ x: 610, y: 250 });
		await expect(
			canvas.page.locator('[data-part="toggle:line-style"]'),
		).toBeVisible();
		await canvas.setStrokeDashType("line-style", "dashed");

		// 既定 strokeWidth=2 → dashed は "8 8"（4·sw）。
		await expect
			.poll(() => readDashNumbers(canvas, connectorId), {
				message: "dashed で dasharray が付くこと",
			})
			.not.toEqual([]);
		const dashAt2 = await readDashNumbers(canvas, connectorId);
		expect(dashAt2.length).toBeGreaterThanOrEqual(2);
		for (const value of dashAt2) {
			expect(
				Math.abs(value - 8),
				`strokeWidth=2 の dash 値が 4·sw=8 に一致すること: ${JSON.stringify(dashAt2)}`,
			).toBeLessThanOrEqual(0.5);
		}

		// strokeWidth を 6 に変更（line-style セクションは開いたまま）。
		await canvas.setNumberInput("strokeWidth", 6);

		// strokeWidth=6 → dashed は "24 24"（4·sw）。各値が約 3 倍。
		await expect
			.poll(async () => (await readDashNumbers(canvas, connectorId))[0], {
				message: "strokeWidth 変更で dash 値がスケールすること",
			})
			.toBeGreaterThan(8 + 1);
		const dashAt6 = await readDashNumbers(canvas, connectorId);
		for (const value of dashAt6) {
			expect(
				Math.abs(value - 24),
				`strokeWidth=6 の dash 値が 4·sw=24 に一致すること: ${JSON.stringify(dashAt6)}`,
			).toBeLessThanOrEqual(0.5);
		}

		// 比例連動: 各 dash 値が strokeWidth 比（6/2=3）でスケールする。
		expect(dashAt6[0] / dashAt2[0]).toBeGreaterThan(2.6);
		expect(dashAt6[0] / dashAt2[0]).toBeLessThan(3.4);
	});
});

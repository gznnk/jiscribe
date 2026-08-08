import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Checks that a connector's dash pattern scales with strokeWidth.
 *
 * The dasharray is derived from the stroke width by getStrokeDasharray (dashed = "4·sw 4·sw").
 * If the dashes do not grow with the line, a thick line ends up with dashes crowded together.
 *
 * Picks dashed in the line-style menu, changes strokeWidth from 2 to 6, and guards that every
 * dasharray value matches 4·sw (8 → 24), roughly tripling.
 */

/** Reads the dasharray numbers of the visual line (ConnectorElement, the polyline with no data attributes) */
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
		// Prefer the attribute ("8 8"), falling back to computed style ("8px 8px").
		const attr = visualEl.getAttribute("stroke-dasharray");
		return attr ?? getComputedStyle(visualEl).strokeDasharray;
	}, id);
	if (!raw || raw === "none") {
		return [];
	}
	return [...raw.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

/** A horizontal straight connector joining two side-by-side rectangles, rightCenter → leftCenter. */
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

test.describe("connector dash scaling", () => {
	test("stretches the dash pattern proportionally when strokeWidth grows", async ({
		canvas,
	}) => {
		const connectorId = await buildHorizontalConnector(canvas);

		await canvas.clickAt({ x: 610, y: 250 });
		await expect(
			canvas.page.locator('[data-part="toggle:line-style"]'),
		).toBeVisible();
		await canvas.setStrokeDashType("line-style", "dashed");

		// At the default strokeWidth=2, dashed gives "8 8" (4·sw).
		await expect
			.poll(() => readDashNumbers(canvas, connectorId), {
				message: "dashed gives the line a dasharray",
			})
			.not.toEqual([]);
		const dashAt2 = await readDashNumbers(canvas, connectorId);
		expect(dashAt2.length).toBeGreaterThanOrEqual(2);
		for (const value of dashAt2) {
			expect(
				Math.abs(value - 8),
				`dash values at strokeWidth=2 match 4·sw=8: ${JSON.stringify(dashAt2)}`,
			).toBeLessThanOrEqual(0.5);
		}

		// The line-style section stays open.
		await canvas.setNumberInput("strokeWidth", 6);

		// At strokeWidth=6, dashed gives "24 24" (4·sw), roughly tripling each value.
		await expect
			.poll(async () => (await readDashNumbers(canvas, connectorId))[0], {
				message: "the dash values scale when strokeWidth changes",
			})
			.toBeGreaterThan(8 + 1);
		const dashAt6 = await readDashNumbers(canvas, connectorId);
		for (const value of dashAt6) {
			expect(
				Math.abs(value - 24),
				`dash values at strokeWidth=6 match 4·sw=24: ${JSON.stringify(dashAt6)}`,
			).toBeLessThanOrEqual(0.5);
		}

		// Each dash value scales by the strokeWidth ratio (6/2=3).
		expect(dashAt6[0] / dashAt2[0]).toBeGreaterThan(2.6);
		expect(dashAt6[0] / dashAt2[0]).toBeLessThan(3.4);
	});
});

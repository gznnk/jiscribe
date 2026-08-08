import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec verifying that the arrow scale and the line inset of a connector track its strokeWidth.
 *
 * An arrow is drawn with scale=strokeWidth (the length of (a,b) in its matrix equals strokeWidth),
 * and the visual line ends short by an arrow inset of a constant times strokeWidth. So thickening
 * the line grows both the arrow and the inset proportionally. connector-style.spec covers line
 * color and dash type, connector-arrow-inset.spec covers the inset at a fixed strokeWidth=2, but
 * the proportional scaling when strokeWidth changes was untested.
 *
 * strokeWidth is changed from 2 to 6 through the number input of the line-style menu, guarding that
 * both the arrow matrix scale and the visual line inset grow about threefold.
 */

type Vec = { x: number; y: number };
type ArrowMatrix = { a: number; b: number; tip: Vec };

function parsePoints(attr: string | null): Vec[] {
	if (!attr) {
		throw new Error("points attribute is missing");
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

/** Reads the matrix of every arrow polygon of the connector: a,b and the tip e,f. */
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
 * Reads the coordinates of the hit line (full length) and the visual line (inset applied). The
 * visual line is the polyline without data attributes under the parent of the hit line.
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
		throw new Error("points of the hit line / visual line are not available");
	}
	return { hit: parsePoints(data.hit), visual: parsePoints(data.visual) };
}

/** Measures the scale of the end arrow (the length of (a,b) in its matrix, equal to strokeWidth) and the inset. */
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

/** A horizontal straight connector joining two side-by-side rectangles from rightCenter to leftCenter (with the default end arrow). */
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

test.describe("connector stroke width driving the arrow and the inset", () => {
	test("grows the arrow scale and the line inset proportionally when strokeWidth is increased", async ({
		canvas,
	}) => {
		const connectorId = await buildHorizontalConnector(canvas);

		// Default strokeWidth=2, so the arrow scale is about 2 and the inset is above 0.
		const before = await measure(canvas, connectorId);
		expect(
			before.arrowScale,
			`default arrow scale matches strokeWidth(2): ${before.arrowScale.toFixed(2)}`,
		).toBeGreaterThan(1.5);
		expect(before.arrowScale).toBeLessThan(2.5);
		expect(
			before.inset,
			"the end is inset even with the default width",
		).toBeGreaterThan(6);

		// Open the line-style menu and change strokeWidth to 6.
		await canvas.clickAt({ x: 610, y: 250 });
		await expect(
			canvas.page.locator('[data-part="toggle:line-style"]'),
		).toBeVisible();
		await canvas.openObjectMenu("line-style");
		await canvas.setNumberInput("strokeWidth", 6);
		await canvas.deselect();

		// strokeWidth=6, so the arrow scale is about 6 and the inset about three times as large.
		const after = await measure(canvas, connectorId);
		expect(
			after.arrowScale,
			`arrow scale after the change matches strokeWidth(6): ${after.arrowScale.toFixed(2)}`,
		).toBeGreaterThan(5.4);
		expect(after.arrowScale).toBeLessThan(6.6);

		// Both the scale and the inset grow by the strokeWidth ratio (6/2=3).
		expect(
			after.arrowScale / before.arrowScale,
			"arrow scale grows by the strokeWidth ratio (about 3)",
		).toBeGreaterThan(2.6);
		expect(after.arrowScale / before.arrowScale).toBeLessThan(3.4);
		expect(
			after.inset / before.inset,
			`line inset grows by the strokeWidth ratio (about 3): ${(after.inset / before.inset).toFixed(2)}`,
		).toBeGreaterThan(2.6);
		expect(after.inset / before.inset).toBeLessThan(3.4);
	});
});

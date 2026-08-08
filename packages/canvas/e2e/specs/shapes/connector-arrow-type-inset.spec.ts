import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Checks how the line inset differs per arrow type.
 *
 * The inset that stops the visual line at the base of the arrow depends on the arrow type
 * (getArrowLineInset / ARROW_LINE_INSETS). OpenArrow has no body and meets the line at the
 * endpoint, so its inset is 0; ConcaveTriangle uses ARROW_SIZE*0.9 and FilledTriangle uses
 * ARROW_SIZE.
 *
 * Switches the end arrow type and guards that the inset — how far short of the hit-area line's
 * end the visual line stops — changes with the type:
 *   - OpenArrow      → inset ≈ 0 (there is an arrow, but the line reaches the endpoint)
 *   - ConcaveTriangle→ inset > 0
 *   - FilledTriangle → inset larger than ConcaveTriangle's
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

/** Measures the end inset: the distance between the hit-area line's end and the visual line's end */
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
		throw new Error("cannot read the points of the hit-area / visual line");
	}
	const hit = parsePoints(data.hit);
	const visual = parsePoints(data.visual);
	return distance(visual[visual.length - 1], hit[hit.length - 1]);
}

/** Selects the line, sets the end arrow type, then deselects */
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

test.describe("connector line inset per arrow type", () => {
	test("moves where the visual line stops when the arrow type changes", async ({
		canvas,
	}) => {
		const connectorId = await buildHorizontalConnector(canvas);

		// The default is ConcaveTriangle.
		const insetConcave = await endInset(canvas, connectorId);
		expect(
			insetConcave,
			`ConcaveTriangle has inset > 0: ${insetConcave.toFixed(2)}`,
		).toBeGreaterThan(6);

		await applyEndArrow(canvas, "OpenArrow");
		const insetOpen = await endInset(canvas, connectorId);
		expect(
			insetOpen,
			`OpenArrow has inset ≈ 0: ${insetOpen.toFixed(2)}`,
		).toBeLessThanOrEqual(EPS);

		// ARROW_SIZE > ARROW_SIZE*0.9.
		await applyEndArrow(canvas, "FilledTriangle");
		const insetFilled = await endInset(canvas, connectorId);
		expect(
			insetFilled,
			`FilledTriangle has a larger inset than ConcaveTriangle: filled ${insetFilled.toFixed(2)} > concave ${insetConcave.toFixed(2)}`,
		).toBeGreaterThan(insetConcave + 1);
	});
});

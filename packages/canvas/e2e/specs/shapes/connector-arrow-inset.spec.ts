import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Checks the arrow inset geometry of a connector.
 *
 * A connector is drawn as two polylines:
 *   - the hit-area line (ConnectorHitArea, carries data-kind=connector and data-id): full
 *     length, up to the endpoints
 *   - the visual line (ConnectorElement, no data attributes): stops short at the base of the
 *     arrow (inset)
 * Only the ends that carry an arrow inset the visual line (insetPolylineEnds), which keeps a
 * hollow or filled arrow from showing the line through it or sticking out by the stroke width.
 *
 * Guards that the start and end insets take effect independently, following each end's arrow,
 * measured as the endpoint difference between the hit-area line and the visual line. This does
 * not depend on the coordinate offset (only the relative difference of the two lines).
 */

type Vec = { x: number; y: number };

// Tolerance (px) for inset rounding and endpoint coincidence. The default end arrow
// ConcaveTriangle insets by 8.1 * strokeWidth(2) ≈ 16px, well clear of this threshold.
const EPS = 1.5;
// Minimum distance (px) counted as "clearly inset". Kept well above strokeWidth.
const MIN_INSET = 6;

/** Parses "x1,y1 x2,y2 ..." into an array of coordinates */
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
 * Reads the coordinates of one connector's hit-area line (full length) and visual line (inset).
 * Both lines are siblings of the same fragment under one parent element, so the visual line is
 * identified as the polyline under the hit-area line's parent that carries neither data-kind nor
 * data-id (which excludes unrelated polylines such as toolbar icons).
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
		throw new Error("cannot read the points of the hit-area / visual line");
	}
	return { hit: parsePoints(data.hit), visual: parsePoints(data.visual) };
}

/**
 * Joins two side-by-side rectangles horizontally, rightCenter → leftCenter. They face each other
 * head on, so the route is a straight line (2 vertices) and the end insets can be read directly
 * off the end segment. A new connector carries a ConcaveTriangle on its end only.
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

/** Selects the connector by clicking the line midpoint and waits for the arrow menu */
async function selectConnectorLine(canvas: CanvasDriver) {
	await canvas.clickAt({ x: 610, y: 370 });
	await expect(
		canvas.page.locator(selectors.objectMenuToggle("arrow-head-end")),
	).toBeVisible();
}

test.describe("connector arrow inset", () => {
	test("stops the visual line short for the end arrow while the hit-area line runs to the endpoint", async ({
		canvas,
	}) => {
		const id = await buildHorizontalConnector(canvas);

		const { hit, visual } = await readLines(canvas, id);

		// Straight line (2 vertices), and the visual line has the same vertex count.
		expect(hit.length).toBe(2);
		expect(visual.length).toBe(2);

		const hitStart = hit[0];
		const hitEnd = hit[hit.length - 1];
		const visualStart = visual[0];
		const visualEnd = visual[visual.length - 1];

		// The start has no arrow, so its visual point coincides with the hit-area point.
		expect(
			distance(visualStart, hitStart),
			`the start is not inset: visual ${JSON.stringify(visualStart)} ≒ hit ${JSON.stringify(hitStart)}`,
		).toBeLessThanOrEqual(EPS);

		// The end carries the default arrow (ConcaveTriangle), so the visual line stops short.
		expect(
			distance(visualEnd, hitEnd),
			`the end stops short by the arrow: gap between visual ${JSON.stringify(visualEnd)} and hit ${JSON.stringify(hitEnd)}`,
		).toBeGreaterThan(MIN_INSET);

		// The inset stays on the end segment (same y) and is pulled back toward the start.
		expect(Math.abs(visualEnd.y - hitEnd.y)).toBeLessThanOrEqual(EPS);
		expect(visualEnd.x).toBeLessThan(hitEnd.x - MIN_INSET);
		expect(visualEnd.x).toBeGreaterThan(hitStart.x);

		// The hit-area line keeps its full length, longer than the visual line.
		expect(distance(hitStart, hitEnd)).toBeGreaterThan(
			distance(visualStart, visualEnd),
		);
	});

	test("insets the start once it has an arrow and drops the end inset when the end is set to None", async ({
		canvas,
	}) => {
		const id = await buildHorizontalConnector(canvas);

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

		// Both ends now carry an arrow, so both are inset.
		expect(
			distance(startVisS, startHitS),
			"the start is inset once it has an arrow",
		).toBeGreaterThan(MIN_INSET);
		expect(
			distance(startVisE, startHitE),
			"the end inset is kept",
		).toBeGreaterThan(MIN_INSET);
		// The start inset is pulled back toward the end (increasing x).
		expect(startVisS.x).toBeGreaterThan(startHitS.x + MIN_INSET);

		await selectConnectorLine(canvas);
		await canvas.openObjectMenu("arrow-head-end");
		await canvas.page.click(selectors.objectMenuSet("endArrow", "None"));
		await canvas.deselect();

		const afterEndNone = await readLines(canvas, id);
		const noneHitS = afterEndNone.hit[0];
		const noneHitE = afterEndNone.hit[afterEndNone.hit.length - 1];
		const noneVisS = afterEndNone.visual[0];
		const noneVisE = afterEndNone.visual[afterEndNone.visual.length - 1];

		expect(
			distance(noneVisE, noneHitE),
			"the end inset disappears once the end is set to None",
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(noneVisS, noneHitS),
			"the start inset is kept because the start still has an arrow",
		).toBeGreaterThan(MIN_INSET);
	});
});

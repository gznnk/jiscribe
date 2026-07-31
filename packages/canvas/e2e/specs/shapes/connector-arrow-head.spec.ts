import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Applying and persisting connector arrow head settings.
 *
 * Each end's arrow is drawn as a `[data-kind=connector][data-id=<id>]` element, and nothing is
 * drawn at all when the type is "None". Triangles and diamonds are a single `polygon`, while
 * crow's foot types are made of several elements so data-kind sits on a `g` (`arrowCount`
 * counts only the former). A new connector carries a ConcaveTriangle on its end only. Guards
 * that menu operations add, remove and swap the drawn elements.
 */

/** Joins two stacked rectangles with a vertical connector and returns its ID (left deselected) */
async function buildConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
	await canvas.deselect();

	await canvas.selectAt({ x: 500, y: 200 });
	const connectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 450,
	});
	await canvas.deselect();
	return connectorId;
}

/** Selects the connector by clicking on the line and waits for the arrow menu */
async function selectConnector(canvas: CanvasDriver) {
	await canvas.clickAt({ x: 500, y: 350 });
	await expect(
		canvas.page.locator(selectors.objectMenuToggle("arrow-head-end")),
	).toBeVisible();
}

/** Number of arrow polygons on the given connector */
async function arrowCount(canvas: CanvasDriver, id: string): Promise<number> {
	return canvas.page.evaluate(
		(cid) =>
			document.querySelectorAll(
				`polygon[data-kind="connector"][data-id="${cid}"]`,
			).length,
		id,
	);
}

/**
 * Returns the points string (a fingerprint of the arrow shape) of the arrow polygon nearest to
 * the start and to the end. The endpoints come from the ends of the hit-area polyline (the one
 * carrying data-id) and are matched by distance to each arrow's matrix(e,f). An end with no
 * arrow yields null.
 */
async function arrowShapesByEnd(
	canvas: CanvasDriver,
	id: string,
): Promise<{ source: string | null; target: string | null }> {
	return canvas.page.evaluate((cid) => {
		const els = [...document.querySelectorAll(`[data-id="${cid}"]`)];
		const hit = els.find((el) => el.tagName.toLowerCase() === "polyline");
		const coords = (hit?.getAttribute("points") ?? "")
			.trim()
			.split(/\s+/)
			.map((pair) => pair.split(",").map(Number));
		const source = { x: coords[0]?.[0], y: coords[0]?.[1] };
		const last = coords[coords.length - 1] ?? [];
		const target = { x: last[0], y: last[1] };

		const arrows = [
			...document.querySelectorAll(
				`polygon[data-kind="connector"][data-id="${cid}"]`,
			),
		].map((poly) => {
			const matched = (poly.getAttribute("transform") ?? "").match(
				/matrix\(([^)]+)\)/,
			);
			const nums = matched ? matched[1].split(",").map(Number) : [];
			return { points: poly.getAttribute("points"), x: nums[4], y: nums[5] };
		});

		const nearest = (point: { x?: number; y?: number }) => {
			let best: string | null = null;
			let bestDist = Infinity;
			for (const arrow of arrows) {
				const dx = arrow.x - (point.x ?? 0);
				const dy = arrow.y - (point.y ?? 0);
				const dist = dx * dx + dy * dy;
				if (dist < bestDist) {
					bestDist = dist;
					best = arrow.points;
				}
			}
			return best;
		};

		return { source: nearest(source), target: nearest(target) };
	}, id);
}

test.describe("connector arrows", () => {
	test("draws an arrow on the end only by default and removes it when endArrow is set to None", async ({
		canvas,
	}) => {
		const id = await buildConnector(canvas);
		expect(await arrowCount(canvas, id)).toBe(1);

		await selectConnector(canvas);
		await canvas.openObjectMenu("arrow-head-end");
		await canvas.page.click(selectors.objectMenuSet("endArrow", "None"));

		await expect.poll(() => arrowCount(canvas, id)).toBe(0);
	});

	test("shows arrows on both ends (2) when startArrow is set", async ({
		canvas,
	}) => {
		const id = await buildConnector(canvas);
		expect(await arrowCount(canvas, id)).toBe(1);

		await selectConnector(canvas);
		await canvas.openObjectMenu("arrow-head-start");
		await canvas.page.click(
			selectors.objectMenuSet("startArrow", "FilledTriangle"),
		);

		await expect.poll(() => arrowCount(canvas, id)).toBe(2);
	});

	test("swaps the start and end arrow shapes on swapArrows", async ({
		canvas,
	}) => {
		const id = await buildConnector(canvas);

		// Give the two ends different shapes so they can be told apart (end defaults to
		// ConcaveTriangle).
		await selectConnector(canvas);
		await canvas.openObjectMenu("arrow-head-start");
		await canvas.page.click(
			selectors.objectMenuSet("startArrow", "FilledTriangle"),
		);
		await expect.poll(() => arrowCount(canvas, id)).toBe(2);

		const before = await arrowShapesByEnd(canvas, id);
		expect(before.source).toBeTruthy();
		expect(before.target).toBeTruthy();
		expect(before.source).not.toBe(before.target);

		await canvas.page.click(selectors.objectMenuCommand("swapArrows"));

		await expect
			.poll(async () => (await arrowShapesByEnd(canvas, id)).source)
			.toBe(before.target);
		expect((await arrowShapesByEnd(canvas, id)).target).toBe(before.source);
	});

	test("draws a crow's foot arrow as a composite of path + circle", async ({
		canvas,
	}) => {
		const id = await buildConnector(canvas);

		await selectConnector(canvas);
		await canvas.openObjectMenu("arrow-head-end");
		await canvas.page.click(
			selectors.objectMenuSet("endArrow", "CrowFootZeroMany"),
		);

		// Unlike the triangles, several elements make up one arrow, so data-kind sits on the <g>.
		// Pinning the element breakdown also covers hit testing reaching it from a child.
		await expect
			.poll(() =>
				canvas.page.evaluate((cid) => {
					const group = document.querySelector(
						`g[data-kind="connector"][data-id="${cid}"]`,
					);
					return {
						paths: group?.querySelectorAll("path").length ?? 0,
						circles: group?.querySelectorAll("circle").length ?? 0,
					};
				}, id),
			)
			.toEqual({ paths: 1, circles: 1 });

		expect(await arrowCount(canvas, id)).toBe(0);
	});

	test("reverts setting endArrow to None on undo and reapplies it on redo", async ({
		canvas,
	}) => {
		const id = await buildConnector(canvas);
		expect(await arrowCount(canvas, id)).toBe(1);

		await selectConnector(canvas);
		await canvas.openObjectMenu("arrow-head-end");
		await canvas.page.click(selectors.objectMenuSet("endArrow", "None"));
		await expect.poll(() => arrowCount(canvas, id)).toBe(0);

		await canvas.undo();
		await expect.poll(() => arrowCount(canvas, id)).toBe(1);

		await canvas.redo();
		await expect.poll(() => arrowCount(canvas, id)).toBe(0);
	});
});

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Checks the outline snapping of a center anchor and of an edge anchor on an ellipse at the
 * geometry level.
 *
 * Outline snapping branches on the shape geometry: a rectangle snaps to an AABB edge, an
 * ellipse to the curved boundary — through calcOutlinePointTowardForRotatedEllipse for a center
 * anchor (adjustToOutline) and calcOutlinePointAlongLocalRayForRotatedEllipse for an edge anchor
 * (calcEdgeAnchorPoint). See connector-center-anchor-outline.spec for the rectangle case and
 * connector-edge-anchor.spec for the edge anchor itself.
 *
 * Connects a rectangular source to an elliptical target, once at its center and once at a free
 * position on its edge, and guards that the end point
 *   - satisfies the ellipse equation ((x-cx)/rx)^2 + ((y-cy)/ry)^2 = 1, i.e. lies on the curve
 *   - lies inside the AABB rather than on its perimeter, since the layout is diagonal
 *   - lies on the ray from the center toward the source (center anchor) or where the connector
 *     was dropped (edge anchor)
 * This does not depend on the coordinate offset (expectations come from the drawn shapes).
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

function parsePoints(attr: string | null): Vec[] {
	if (!attr) {
		throw new Error("cannot read the points attribute");
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

async function worldAABB(canvas: CanvasDriver, id: string): Promise<AABB> {
	return canvas.page.evaluate((targetId) => {
		const el = document.querySelector(`[data-id="${targetId}"]`);
		if (!(el instanceof SVGGraphicsElement)) {
			throw new Error(`shape ${targetId} is not an SVGGraphicsElement`);
		}
		const bbox = el.getBBox();
		const ctm = el.getCTM();
		if (!ctm) {
			throw new Error(`cannot read the CTM of shape ${targetId}`);
		}
		const corners = [
			{ x: bbox.x, y: bbox.y },
			{ x: bbox.x + bbox.width, y: bbox.y },
			{ x: bbox.x, y: bbox.y + bbox.height },
			{ x: bbox.x + bbox.width, y: bbox.y + bbox.height },
		].map((p) => ({
			x: p.x * ctm.a + p.y * ctm.c + ctm.e,
			y: p.x * ctm.b + p.y * ctm.d + ctm.f,
		}));
		const xs = corners.map((c) => c.x);
		const ys = corners.map((c) => c.y);
		return {
			minX: Math.min(...xs),
			maxX: Math.max(...xs),
			minY: Math.min(...ys),
			maxY: Math.max(...ys),
		};
	}, id);
}

const center = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: (box.minY + box.maxY) / 2,
});

/** Perpendicular distance from point p to the line a→b */
function perpendicularDistance(p: Vec, a: Vec, b: Vec): number {
	const cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
	return Math.abs(cross) / Math.hypot(b.x - a.x, b.y - a.y);
}

test.describe("connector ellipse outline snapping", () => {
	test("places an endpoint connected to the center on the ellipse's curved boundary", async ({
		canvas,
	}) => {
		// The rectangular source is top-left and the elliptical target bottom-right. The diagonal
		// layout keeps the outline point off the AABB perimeter and off the edge midpoints.
		await canvas.drawShape("Rectangle", { x: 200, y: 150 }, { x: 360, y: 250 });
		await canvas.deselect();
		const ellipseId = await canvas.drawShape(
			"Ellipse",
			{ x: 700, y: 400 },
			{ x: 900, y: 520 },
		);
		await canvas.deselect();

		// Dropping from source rightCenter onto the ellipse's center gives it a center anchor.
		await canvas.selectAt({ x: 280, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 800,
			y: 460,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const box = await worldAABB(canvas, ellipseId);
		const c = center(box);
		const rx = (box.maxX - box.minX) / 2;
		const ry = (box.maxY - box.minY) / 2;

		const sourcePoint = points[0];
		const endpoint = points[points.length - 1];

		const ellipseValue =
			((endpoint.x - c.x) / rx) ** 2 + ((endpoint.y - c.y) / ry) ** 2;
		expect(
			Math.abs(ellipseValue - 1),
			`the end point ${JSON.stringify(endpoint)} lies on the ellipse boundary (=1): measured ${ellipseValue.toFixed(3)}`,
		).toBeLessThanOrEqual(0.05);

		// The diagonal layout puts it inside the AABB rather than on its perimeter.
		const insideMargin = 5;
		expect(endpoint.x).toBeGreaterThan(box.minX + insideMargin);
		expect(endpoint.x).toBeLessThan(box.maxX - insideMargin);
		expect(endpoint.y).toBeGreaterThan(box.minY + insideMargin);
		expect(endpoint.y).toBeLessThan(box.maxY - insideMargin);

		expect(
			perpendicularDistance(endpoint, c, sourcePoint),
			"the end point lies on the center→source line (direction-dependent snapping)",
		).toBeLessThanOrEqual(2);
		const towardDot =
			(endpoint.x - c.x) * (sourcePoint.x - c.x) +
			(endpoint.y - c.y) * (sourcePoint.y - c.y);
		expect(
			towardDot,
			"the end point is pushed out toward the source side",
		).toBeGreaterThan(0);

		// Pushed out to the outline, not stuck at the center.
		expect(distance(endpoint, c)).toBeGreaterThan(20);
	});

	test("places an endpoint dropped on the ellipse's edge on the curved boundary, where it was dropped", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 200, y: 150 }, { x: 360, y: 250 });
		await canvas.deselect();
		const ellipseId = await canvas.drawShape(
			"Ellipse",
			{ x: 700, y: 400 },
			{ x: 900, y: 520 },
		);
		await canvas.deselect();

		const box = await worldAABB(canvas, ellipseId);
		const c = center(box);
		const rx = (box.maxX - box.minX) / 2;
		const ry = (box.maxY - box.minY) / 2;

		// Drop just inside the arc at 45° up-right of the center: clear of the named anchors
		// (the nearest, topCenter and rightCenter, are over 50px away), and shallow enough under
		// the drawn edge to read as an edge position rather than the center. On the AABB the
		// same spot is well inside the top edge, which is what distinguishes the two.
		const dropPoint = {
			x: c.x + rx * Math.SQRT1_2 * 0.97,
			y: c.y - ry * Math.SQRT1_2 * 0.97,
		};
		await canvas.selectAt({ x: 280, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", dropPoint);
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const endpoint = points[points.length - 1];

		const ellipseValue =
			((endpoint.x - c.x) / rx) ** 2 + ((endpoint.y - c.y) / ry) ** 2;
		expect(
			Math.abs(ellipseValue - 1),
			`the end point ${JSON.stringify(endpoint)} lies on the ellipse boundary (=1): measured ${ellipseValue.toFixed(3)}`,
		).toBeLessThanOrEqual(0.05);

		// On the arc, not pushed out to the AABB's top edge above it.
		const insideMargin = 5;
		expect(endpoint.y).toBeGreaterThan(box.minY + insideMargin);

		// Lands where it was dropped, not at an edge midpoint.
		expect(
			distance(endpoint, dropPoint),
			"the end point stays by the drop point",
		).toBeLessThanOrEqual(5);
	});
});

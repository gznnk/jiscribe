import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Checks the outline snapping of a center anchor at the geometry level.
 *
 * Dropping a connector endpoint near the center of a shape connects it as a center anchor
 * (kind="center"). Such an endpoint does not sit at the center (cx,cy): resolveConnectorPoints
 * pushes it out to the shape's outline in the direction of the other endpoint through
 * adjustToOutline (see calcOutlinePointTowardForRotatedFrame), so the line meets the shape at
 * the edge rather than at its center.
 *
 * Uses a diagonally placed source and target with the target connected by a center anchor, and
 * guards that the endpoint
 *   - lies on the outline (the AABB perimeter), not at the shape center
 *   - lies on the ray from the center toward the other endpoint (direction-dependent snapping)
 *   - is distinct from the edge midpoints, so it is not a fixed edge anchor
 * This does not depend on the coordinate offset (expectations come from the drawn shapes).
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

const EPS = 1.5;

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

/** Whether point p lies within EPS of the box perimeter (any of its edges) */
function onPerimeter(p: Vec, box: AABB): boolean {
	const onVerticalEdge =
		(Math.abs(p.x - box.minX) <= EPS || Math.abs(p.x - box.maxX) <= EPS) &&
		p.y >= box.minY - EPS &&
		p.y <= box.maxY + EPS;
	const onHorizontalEdge =
		(Math.abs(p.y - box.minY) <= EPS || Math.abs(p.y - box.maxY) <= EPS) &&
		p.x >= box.minX - EPS &&
		p.x <= box.maxX + EPS;
	return onVerticalEdge || onHorizontalEdge;
}

/** Perpendicular distance from point p to the line a→b */
function perpendicularDistance(p: Vec, a: Vec, b: Vec): number {
	const cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
	return Math.abs(cross) / Math.hypot(b.x - a.x, b.y - a.y);
}

test.describe("connector center anchor outline snapping", () => {
	test("places an endpoint connected to the center on the outline, facing the other end", async ({
		canvas,
	}) => {
		// source top-left, target bottom-right. With the target on a center anchor, the outline
		// point is decided by the diagonal from the target center toward the source endpoint, so it
		// lands away from any edge midpoint.
		await canvas.drawShape("Rectangle", { x: 200, y: 150 }, { x: 360, y: 250 });
		await canvas.deselect();
		const targetId = await canvas.drawShape(
			"Rectangle",
			{ x: 700, y: 400 },
			{ x: 900, y: 520 },
		);
		await canvas.deselect();

		// Dropping from source rightCenter onto the target center gives the target a center anchor.
		await canvas.selectAt({ x: 280, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 800,
			y: 460,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const targetBox = await worldAABB(canvas, targetId);
		const targetCenter = center(targetBox);

		const sourcePoint = points[0];
		const targetEndpoint = points[points.length - 1];

		expect(
			onPerimeter(targetEndpoint, targetBox),
			`the end point ${JSON.stringify(targetEndpoint)} lies on the target perimeter`,
		).toBe(true);
		expect(
			distance(targetEndpoint, targetCenter),
			"the end point is pushed out to the outline, not stuck at the center",
		).toBeGreaterThan(20);

		expect(
			perpendicularDistance(targetEndpoint, targetCenter, sourcePoint),
			`the end point lies on the center→source line (direction-dependent snapping)`,
		).toBeLessThanOrEqual(2);
		// Pushed out toward the source side, i.e. between the center and the source.
		const towardDot =
			(targetEndpoint.x - targetCenter.x) * (sourcePoint.x - targetCenter.x) +
			(targetEndpoint.y - targetCenter.y) * (sourcePoint.y - targetCenter.y);
		expect(
			towardDot,
			"the end point is pushed out toward the source side",
		).toBeGreaterThan(0);
		expect(distance(targetEndpoint, targetCenter)).toBeLessThan(
			distance(sourcePoint, targetCenter),
		);

		// The diagonal keeps the outline point clear of every edge midpoint (leftCenter,
		// topCenter, …), which is what rules out a fixed edge anchor.
		const edgeMidpoints: Vec[] = [
			{ x: targetCenter.x, y: targetBox.minY }, // topCenter
			{ x: targetCenter.x, y: targetBox.maxY }, // bottomCenter
			{ x: targetBox.minX, y: targetCenter.y }, // leftCenter
			{ x: targetBox.maxX, y: targetCenter.y }, // rightCenter
		];
		const nearestEdgeMid = Math.min(
			...edgeMidpoints.map((m) => distance(targetEndpoint, m)),
		);
		expect(
			nearestEdgeMid,
			"the outline point differs from the edge midpoints (direction-dependent snapping is in effect)",
		).toBeGreaterThan(10);
	});
});

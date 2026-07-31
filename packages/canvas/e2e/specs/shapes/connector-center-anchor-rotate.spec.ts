import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Checks that a center anchor's outline point is recomputed against the rotated outline when the
 * connected shape is rotated.
 *
 * A center anchor's endpoint snaps not to the center but to the outline point facing the other
 * end (adjustToOutline → calcOutlinePointTowardForRotatedFrame). Rotating the shape turns its
 * four edges with it, so the outline point has to land on a rotated edge.
 *
 * Joins A (left) to B (right, connected at its center) horizontally, rotates B, and guards that
 * the end point
 *   - lies on the ray from B's center toward A (direction-dependent snapping)
 *   - lies on an edge of the rotated B (the rotated rectangle built from its 4 corners)
 *   - is not at the center and has moved from its pre-rotation position
 * At zoom=1 world coordinates equal content coordinates.
 */

type Vec = { x: number; y: number };

const EPS = 2;

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

/** Returns the shape's 4 world corners in TL, TR, BR, BL order, rotation included */
async function worldCorners(canvas: CanvasDriver, id: string): Promise<Vec[]> {
	return canvas.page.evaluate((targetId) => {
		const el = document.querySelector(`[data-id="${targetId}"]`);
		if (!(el instanceof SVGGraphicsElement)) {
			throw new Error(`shape ${targetId} is not an SVGGraphicsElement`);
		}
		const b = el.getBBox();
		const ctm = el.getCTM();
		if (!ctm) {
			throw new Error(`cannot read the CTM of shape ${targetId}`);
		}
		return [
			{ x: b.x, y: b.y },
			{ x: b.x + b.width, y: b.y },
			{ x: b.x + b.width, y: b.y + b.height },
			{ x: b.x, y: b.y + b.height },
		].map((p) => ({
			x: p.x * ctm.a + p.y * ctm.c + ctm.e,
			y: p.x * ctm.b + p.y * ctm.d + ctm.f,
		}));
	}, id);
}

const centroid = (pts: Vec[]): Vec => ({
	x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
	y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});

/** Distance from point p to the segment a-b */
function distToSegment(p: Vec, a: Vec, b: Vec): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const len2 = dx * dx + dy * dy;
	if (len2 === 0) {
		return distance(p, a);
	}
	let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
	t = Math.max(0, Math.min(1, t));
	return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Whether point p lies within tol of the polygon boundary (any of its edges) */
function onPolygonBoundary(p: Vec, corners: Vec[], tol: number): boolean {
	for (let i = 0; i < corners.length; i++) {
		const a = corners[i];
		const b = corners[(i + 1) % corners.length];
		if (distToSegment(p, a, b) <= tol) {
			return true;
		}
	}
	return false;
}

/** Perpendicular distance from point p to the line a→b */
function perpendicularDistance(p: Vec, a: Vec, b: Vec): number {
	const cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
	return Math.abs(cross) / Math.hypot(b.x - a.x, b.y - a.y);
}

async function endPoint(canvas: CanvasDriver, id: string): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(id).getAttribute("points"),
	);
	return points[points.length - 1];
}
async function startPoint(canvas: CanvasDriver, id: string): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(id).getAttribute("points"),
	);
	return points[0];
}

test.describe("center anchor following a rotation", () => {
	test("moves the center outline point onto a rotated edge when the connected shape is rotated", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 200, y: 300 }, { x: 360, y: 400 });
		await canvas.deselect();
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 700, y: 300 },
			{ x: 900, y: 400 },
		);
		await canvas.deselect();

		// A.rightCenter → B.center (dropped on B's center). The layout is horizontal, so the
		// outline point is B's left edge center.
		await canvas.selectAt({ x: 280, y: 350 });
		const id = await canvas.createConnector("rightCenter", { x: 800, y: 350 });
		await canvas.deselect();

		const endBefore = await endPoint(canvas, id);

		// Rotate B far around its center (800,350) by swinging the rotation handle down, ~60°.
		await canvas.selectAt({ x: 800, y: 350 });
		await canvas.dragTransformHandle("rotation", { x: 980, y: 480 });
		await canvas.deselect();

		await expect
			.poll(async () => distance(await endPoint(canvas, id), endBefore), {
				message: "the center outline point moves on rotation",
			})
			.toBeGreaterThan(10);

		const corners = await worldCorners(canvas, bId);
		const center = centroid(corners);
		const src = await startPoint(canvas, id);
		const endAfter = await endPoint(canvas, id);

		expect(
			perpendicularDistance(endAfter, center, src),
			"the end point lies on the center→source line",
		).toBeLessThanOrEqual(2);
		expect(
			onPolygonBoundary(endAfter, corners, EPS),
			`the end point ${JSON.stringify(endAfter)} lies on an edge of the rotated B`,
		).toBe(true);
		// Not stuck at the center.
		expect(distance(endAfter, center)).toBeGreaterThan(20);
	});
});

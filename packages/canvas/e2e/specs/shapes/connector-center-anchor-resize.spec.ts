import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Checks that a center anchor's outline point is recomputed when the connected shape is resized.
 *
 * A center anchor's endpoint snaps not to the shape center but to the outline point facing the
 * other end (adjustToOutline). Resizing moves the center and the edges, so the outline point has
 * to move onto the new edge.
 *
 * Joins A (left) to B (right, connected at its center) horizontally, resizes B's left edge
 * outward, and guards against the shape's real geometry that the outline point moves to the new
 * left edge center.
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

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
		const xs = corners.map((corner) => corner.x);
		const ys = corners.map((corner) => corner.y);
		return {
			minX: Math.min(...xs),
			maxX: Math.max(...xs),
			minY: Math.min(...ys),
			maxY: Math.max(...ys),
		};
	}, id);
}

const leftCenter = (box: AABB): Vec => ({
	x: box.minX,
	y: (box.minY + box.maxY) / 2,
});

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

async function endPoint(canvas: CanvasDriver, id: string): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(id).getAttribute("points"),
	);
	return points[points.length - 1];
}

test.describe("center anchor following a resize", () => {
	test("moves the center outline point onto the new edge when the connected shape is resized", async ({
		canvas,
	}) => {
		// A (left) and B (right) at the same height. Joining A.rightCenter → B.center horizontally
		// puts the outline point in the direction from B's center toward A, i.e. B's left edge
		// center.
		await canvas.drawShape("Rectangle", { x: 200, y: 300 }, { x: 360, y: 400 });
		await canvas.deselect();
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 700, y: 300 },
			{ x: 900, y: 400 },
		);
		await canvas.deselect();

		await canvas.selectAt({ x: 280, y: 350 });
		const id = await canvas.createConnector("rightCenter", { x: 800, y: 350 });
		await canvas.deselect();

		const bBefore = await worldAABB(canvas, bId);
		const endBefore = await endPoint(canvas, id);
		expect(
			distance(endBefore, leftCenter(bBefore)),
			"the initial end point lies on B's left edge center",
		).toBeLessThanOrEqual(EPS);

		// Grab B at its center (800,350), which does not overlap the end point (700,350).
		await canvas.selectAt({ x: 800, y: 350 });
		await canvas.dragTransformHandle(
			"leftCenter",
			{ x: 600, y: 350 },
			{ ctrl: true },
		);
		await canvas.deselect();

		const bAfter = await worldAABB(canvas, bId);
		expect(bAfter.minX, "the left edge really widened leftward").toBeLessThan(
			bBefore.minX - 20,
		);

		const endAfter = await endPoint(canvas, id);
		expect(
			distance(endAfter, leftCenter(bAfter)),
			`the end point ${JSON.stringify(endAfter)} moves to B's new left edge center ${JSON.stringify(leftCenter(bAfter))}`,
		).toBeLessThanOrEqual(EPS);
		expect(
			onPerimeter(endAfter, bAfter),
			"the end point lies on the resized B's outline",
		).toBe(true);
		expect(
			endBefore.x - endAfter.x,
			"the end point moved left (outward) from the old edge position",
		).toBeGreaterThan(20);
	});
});

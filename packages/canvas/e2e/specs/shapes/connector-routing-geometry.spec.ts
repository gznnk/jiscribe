import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec verifying orthogonal connector routing at the *geometry* level.
 *
 * The existing connector specs (connector / connector-follow-* / connector-reconnect and so on)
 * only check whether the points attribute changes; whether the rendered route is geometrically
 * correct was untested — endpoints landing exactly on the edges of the connected shapes, every
 * segment being at right angles, no penetration through shapes, and extra bends appearing when the
 * straight route is blocked.
 *
 * Guards that the output of routeOrthogonalConnector (packages/canvas) reaches the polyline points
 * in the DOM unchanged, using invariants that do not depend on coordinate offsets. Every assertion
 * reads the world AABB of the shapes at runtime and compares it against points, so it does not
 * depend on the mapping between content and world coordinates.
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

// Tolerance (px) absorbing the rounding in routing (Math.round on midpoints and the like).
const EPS = 1.5;

/** Parses the polyline points attribute "x1,y1 x2,y2 ..." into an array of coordinates. */
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

/**
 * Returns the axis-aligned bounding box of a shape (data-id) in world coordinates. To compare in
 * the same SVG user coordinate system as the connector points, the four local bbox corners are
 * transformed with getCTM and reduced to min/max (an exact AABB as long as the shape is not
 * rotated).
 */
async function worldAABB(canvas: CanvasDriver, id: string): Promise<AABB> {
	return canvas.page.evaluate((targetId) => {
		const el = document.querySelector(`[data-id="${targetId}"]`);
		if (!(el instanceof SVGGraphicsElement)) {
			throw new Error(`shape ${targetId} is not an SVGGraphicsElement`);
		}
		const bbox = el.getBBox();
		const ctm = el.getCTM();
		if (!ctm) {
			throw new Error(`CTM of shape ${targetId} is not available`);
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

const centerX = (box: AABB): number => (box.minX + box.maxX) / 2;
const centerY = (box: AABB): number => (box.minY + box.maxY) / 2;

/** Whether two points nearly coincide (within EPS). */
function near(a: Vec, b: Vec): boolean {
	return Math.abs(a.x - b.x) <= EPS && Math.abs(a.y - b.y) <= EPS;
}

/** Whether a point lies within EPS of the perimeter of box (on any of its edges). */
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

/**
 * Whether the axis-aligned segment (a->b) passes through the *interior* of box. So that running
 * exactly along an edge (an endpoint on the edge, or a parallel run outside the margin) does not
 * count as penetration, box is shrunk by EPS and tested for overlap with the segment AABB
 * (assuming an orthogonal route).
 */
function penetratesInterior(a: Vec, b: Vec, box: AABB): boolean {
	const inner = {
		minX: box.minX + EPS,
		maxX: box.maxX - EPS,
		minY: box.minY + EPS,
		maxY: box.maxY - EPS,
	};
	const segMinX = Math.min(a.x, b.x);
	const segMaxX = Math.max(a.x, b.x);
	const segMinY = Math.min(a.y, b.y);
	const segMaxY = Math.max(a.y, b.y);
	return (
		segMaxX > inner.minX &&
		segMinX < inner.maxX &&
		segMaxY > inner.minY &&
		segMinY < inner.maxY
	);
}

/** Checks that between adjacent vertices only one of x or y moves (right angles, no degenerate segments). */
function assertOrthogonalSegments(points: Vec[]) {
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const cur = points[i];
		const horizontal = Math.abs(prev.y - cur.y) <= EPS;
		const vertical = Math.abs(prev.x - cur.x) <= EPS;
		// Right angle: horizontal only or vertical only. Both matching (a duplicated point) and
		// neither matching (a diagonal) are rejected.
		expect(
			horizontal !== vertical,
			`segment ${i - 1}->${i} is not at a right angle (duplicated point or diagonal): ${JSON.stringify(prev)} -> ${JSON.stringify(cur)}`,
		).toBe(true);
		const length = horizontal
			? Math.abs(cur.x - prev.x)
			: Math.abs(cur.y - prev.y);
		expect(
			length,
			`segment ${i - 1}->${i} has length 0 (degenerate point)`,
		).toBeGreaterThan(EPS);
	}
}

test.describe("connector routing geometry", () => {
	test("endpoints sit exactly on the top and bottom edge centers when stacked shapes are joined", async ({
		canvas,
	}) => {
		// Two stacked rectangles sharing a center x, giving a plain bottomCenter -> topCenter link.
		const sourceId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 150 },
			{ x: 600, y: 250 },
		);
		await canvas.deselect();
		const targetId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 450 },
			{ x: 600, y: 550 },
		);
		await canvas.deselect();

		await canvas.selectAt({ x: 500, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 500,
			y: 450,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const sourceBox = await worldAABB(canvas, sourceId);
		const targetBox = await worldAABB(canvas, targetId);

		const sourceBottomCenter = { x: centerX(sourceBox), y: sourceBox.maxY };
		const targetTopCenter = { x: centerX(targetBox), y: targetBox.minY };
		expect(
			near(points[0], sourceBottomCenter),
			`start point ${JSON.stringify(points[0])} sits on the source bottom edge center ${JSON.stringify(sourceBottomCenter)}`,
		).toBe(true);
		expect(
			near(points[points.length - 1], targetTopCenter),
			`end point ${JSON.stringify(points[points.length - 1])} sits on the target top edge center ${JSON.stringify(targetTopCenter)}`,
		).toBe(true);

		// The centers are aligned, so the connector is a straight vertical line: every vertex
		// shares the same x, running top to bottom.
		for (const p of points) {
			expect(Math.abs(p.x - centerX(sourceBox))).toBeLessThanOrEqual(EPS);
		}
		expect(points[0].y).toBeLessThan(points[points.length - 1].y);
		assertOrthogonalSegments(points);
	});

	test("keeps every segment at a right angle, endpoints on the edges and no penetration for diagonally placed shapes", async ({
		canvas,
	}) => {
		// A source at the top left and a target at the bottom right: a layout that cannot be joined
		// by a straight line and always needs an elbow.
		const sourceId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 180 },
			{ x: 460, y: 280 },
		);
		await canvas.deselect();
		const targetId = await canvas.drawShape(
			"Rectangle",
			{ x: 820, y: 440 },
			{ x: 980, y: 540 },
		);
		await canvas.deselect();

		// Connect from the right edge anchor of the source to the left edge center of the target.
		// Both ends are edge anchors, so the default is orthogonal (dropping on the center would
		// give a center anchor, whose default is straight).
		await canvas.selectAt({ x: 380, y: 230 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 820,
			y: 490,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const sourceBox = await worldAABB(canvas, sourceId);
		const targetBox = await worldAABB(canvas, targetId);

		// The layout needs an elbow, so there are at least 3 vertices (it bends at least once).
		expect(points.length).toBeGreaterThanOrEqual(3);

		// The start point sits on the right edge center of the source, and the first segment leaves
		// horizontally to the right (the exit direction).
		const sourceRightCenter = { x: sourceBox.maxX, y: centerY(sourceBox) };
		expect(
			near(points[0], sourceRightCenter),
			`start point ${JSON.stringify(points[0])} sits on the source right edge center ${JSON.stringify(sourceRightCenter)}`,
		).toBe(true);
		expect(Math.abs(points[1].y - points[0].y)).toBeLessThanOrEqual(EPS);
		expect(points[1].x).toBeGreaterThan(points[0].x + EPS);

		// The end point sits on one of the target edges, whichever edge it connects to.
		expect(
			onPerimeter(points[points.length - 1], targetBox),
			`end point ${JSON.stringify(points[points.length - 1])} sits on the target perimeter`,
		).toBe(true);

		assertOrthogonalSegments(points);

		// No segment penetrates the interior of the source or the target.
		for (let i = 1; i < points.length; i++) {
			const a = points[i - 1];
			const b = points[i];
			expect(
				penetratesInterior(a, b, sourceBox),
				`segment ${i - 1}->${i} does not penetrate the source`,
			).toBe(false);
			expect(
				penetratesInterior(a, b, targetBox),
				`segment ${i - 1}->${i} does not penetrate the target`,
			).toBe(false);
		}
	});

	test("routes around with extra bends and no penetration when a shape is moved to block the straight route", async ({
		canvas,
	}) => {
		// Placed side by side at the same y. The right edge and the left edge face each other, so
		// the route is initially a straight line with 2 vertices.
		const sourceId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 320 },
			{ x: 460, y: 420 },
		);
		await canvas.deselect();
		const targetId = await canvas.drawShape(
			"Rectangle",
			{ x: 760, y: 320 },
			{ x: 920, y: 420 },
		);
		await canvas.deselect();

		// Connect to the left edge center of the target (760, 370) -> a leftCenter anchor. Both ends
		// being edge anchors, the default is orthogonal, which is what lets the obstacle-avoiding
		// bends be verified (dropping on the center (840,370) would give a center anchor whose
		// default is straight, and the line would penetrate instead of bending when moved).
		await canvas.selectAt({ x: 380, y: 370 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 760,
			y: 370,
		});
		await canvas.deselect();

		const beforePoints = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		// Facing each other head on, the initial route is a straight line (2 vertices, no bends).
		expect(beforePoints.length).toBe(2);
		assertOrthogonalSegments(beforePoints);

		// Move the target to the left of the source. The source exits to the right, so the line has
		// to route around the source to reach the target on the left, adding bends.
		await canvas.drag({ x: 840, y: 370 }, { x: 180, y: 370 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "connector is re-routed when the target moves",
			})
			.not.toBe(beforePoints.map((p) => `${p.x},${p.y}`).join(" "));

		const afterPoints = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const sourceBox = await worldAABB(canvas, sourceId);
		const targetBox = await worldAABB(canvas, targetId);

		// Routing around adds vertices; a U-turn needs at least 4 of them.
		expect(afterPoints.length).toBeGreaterThan(beforePoints.length);
		expect(afterPoints.length).toBeGreaterThanOrEqual(4);

		// After re-routing every segment is still at a right angle and no shape is penetrated.
		assertOrthogonalSegments(afterPoints);
		for (let i = 1; i < afterPoints.length; i++) {
			const a = afterPoints[i - 1];
			const b = afterPoints[i];
			expect(
				penetratesInterior(a, b, sourceBox),
				`after routing around: segment ${i - 1}->${i} does not penetrate the source`,
			).toBe(false);
			expect(
				penetratesInterior(a, b, targetBox),
				`after routing around: segment ${i - 1}->${i} does not penetrate the target`,
			).toBe(false);
		}
	});
});

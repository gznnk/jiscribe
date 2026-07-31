import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec for a self-loop connector, one that connects a shape to itself.
 *
 * Dropping from a creation anchor onto the body of the same shape creates a loop that connects to
 * an edge other than the fixed one. It is drawn by routeSelfLoop as a rectangular loop running
 * around the AABB+margin ring (orthogonal only). The existing connector specs only cover joining
 * two *different* shapes, leaving self-loops untested.
 *
 * A self-loop is created on a single rectangle, guarding that (1) both ends sit on separate edges
 * of the same shape, (2) every segment is at a right angle, (3) the route goes around the outside
 * without penetrating the shape, and (4) the RoutingMenu (routing switch) does not appear, because
 * a self-loop is orthogonal only.
 * Every assertion is built from the rendered AABB of the shape, so it does not depend on coordinate
 * offsets.
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

const EPS = 1.5;

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

/** Which edges of box a point lies on; an array, since a corner lies on two edges. */
function edgesOf(
	p: Vec,
	box: AABB,
): Array<"left" | "right" | "top" | "bottom"> {
	const edges: Array<"left" | "right" | "top" | "bottom"> = [];
	const withinY = p.y >= box.minY - EPS && p.y <= box.maxY + EPS;
	const withinX = p.x >= box.minX - EPS && p.x <= box.maxX + EPS;
	if (Math.abs(p.x - box.minX) <= EPS && withinY) {
		edges.push("left");
	}
	if (Math.abs(p.x - box.maxX) <= EPS && withinY) {
		edges.push("right");
	}
	if (Math.abs(p.y - box.minY) <= EPS && withinX) {
		edges.push("top");
	}
	if (Math.abs(p.y - box.maxY) <= EPS && withinX) {
		edges.push("bottom");
	}
	return edges;
}

/** Whether the axis-aligned segment (a->b) passes through the interior of box; running exactly along an edge does not count. */
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

function assertOrthogonalSegments(points: Vec[]) {
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const cur = points[i];
		const horizontal = Math.abs(prev.y - cur.y) <= EPS;
		const vertical = Math.abs(prev.x - cur.x) <= EPS;
		expect(
			horizontal !== vertical,
			`segment ${i - 1}->${i} is not at a right angle (duplicated point or diagonal): ${JSON.stringify(prev)} -> ${JSON.stringify(cur)}`,
		).toBe(true);
	}
}

test.describe("self-loop connector (connecting a shape to itself)", () => {
	test("creates a loop connected to another edge when dropped from a creation anchor onto the same shape", async ({
		canvas,
	}) => {
		// Place a single rectangle large enough for the loop around it to be visible.
		const shapeId = await canvas.drawShape(
			"Rectangle",
			{ x: 450, y: 300 },
			{ x: 650, y: 460 },
		);

		// Drop from the topCenter creation anchor onto the body of the same shape, inside and near
		// its right edge. The nearest anchor excluding the fixed one (topCenter) is rightCenter, so
		// the connection lands on a different edge.
		const connectorId = await canvas.createConnector("topCenter", {
			x: 640,
			y: 380,
		});
		await canvas.deselect();

		const connectorCount = (await canvas.captureObjects()).filter(
			(o) => o.tag === "polyline",
		).length;
		expect(connectorCount, "exactly one self-loop connector is created").toBe(
			1,
		);

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const box = await worldAABB(canvas, shapeId);

		// Both endpoints sit on the perimeter of the same shape.
		const startEdges = edgesOf(points[0], box);
		const endEdges = edgesOf(points[points.length - 1], box);
		expect(
			startEdges.length,
			`start point ${JSON.stringify(points[0])} sits on the shape perimeter`,
		).toBeGreaterThan(0);
		expect(
			endEdges.length,
			`end point ${JSON.stringify(points[points.length - 1])} sits on the shape perimeter`,
		).toBeGreaterThan(0);

		// The two ends connect to *separate* edges: a self-loop avoids the anchor of the fixed end.
		const sharesEdge = startEdges.some((e) => endEdges.includes(e));
		expect(
			sharesEdge,
			`the two ends connect to different edges: start=${startEdges} end=${endEdges}`,
		).toBe(false);

		// Being a loop, it has bends and at least 3 vertices.
		expect(
			points.length,
			`the loop has bends: ${JSON.stringify(points)}`,
		).toBeGreaterThanOrEqual(3);

		// Every segment is at a right angle (a self-loop is orthogonal whatever routing is set).
		assertOrthogonalSegments(points);

		// No segment penetrates the interior of the shape; the route goes around the outside.
		for (let i = 1; i < points.length; i++) {
			expect(
				penetratesInterior(points[i - 1], points[i], box),
				`segment ${i - 1}->${i} does not penetrate the shape`,
			).toBe(false);
		}

		// The intermediate vertices lie outside the shape AABB, running around the ring.
		const interiorVertex = points
			.slice(1, -1)
			.find(
				(p) =>
					p.x > box.minX + EPS &&
					p.x < box.maxX - EPS &&
					p.y > box.minY + EPS &&
					p.y < box.maxY - EPS,
			);
		expect(
			interiorVertex,
			`no intermediate vertex falls inside the shape: ${JSON.stringify(points)}`,
		).toBeUndefined();
	});

	test("shows no routing switch menu, since a self-loop is orthogonal only", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 450, y: 300 }, { x: 650, y: 460 });
		const connectorId = await canvas.createConnector("topCenter", {
			x: 640,
			y: 380,
		});
		await canvas.deselect();

		// Select the self-loop by clicking the midpoint of its longest segment.
		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		let best = { mid: points[0], length: -1 };
		for (let i = 1; i < points.length; i++) {
			const a = points[i - 1];
			const b = points[i];
			const length = Math.hypot(b.x - a.x, b.y - a.y);
			if (length > best.length) {
				best = { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, length };
			}
		}
		await canvas.clickAt(best.mid);

		// The connector ObjectMenu appears (checked through the line color toggle), but the routing
		// switch is hidden.
		await expect(
			canvas.page.locator('[data-part="toggle:line-color"]'),
			"the connector ObjectMenu is shown",
		).toBeVisible();
		await expect(
			canvas.page.locator('[data-part="toggle:connector-routing"]'),
			"no routing switch menu appears for a self-loop",
		).toHaveCount(0);
	});
});

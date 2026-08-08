import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec verifying symmetric S-shaped routing between facing endpoints at the geometry level.
 *
 * When the endpoints face each other head on along an axis (for example the source bottomCenter
 * pointing down and the target topCenter pointing up), routeOrthogonalConnector prefers, via
 * SYMMETRY_BONUS, a symmetric S/Z route that bends at the *midpoint* between them. That gives two
 * shapes offset sideways a tidy route crossing horizontally exactly once, in the middle.
 *
 * The existing connector specs do not check this symmetric midpoint bend; they only check point
 * changes and endpoint following. Here two stacked shapes offset sideways are joined from
 * bottomCenter to topCenter, guarding that the route is a 4-vertex S whose crossbar (the two middle
 * points) sits exactly at the midpoint height between the two edges. Expected values are built from
 * the rendered shapes, so this does not depend on coordinate offsets.
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

function assertOrthogonal(points: Vec[]) {
	for (let i = 1; i < points.length; i++) {
		const horizontal = Math.abs(points[i - 1].y - points[i].y) <= EPS;
		const vertical = Math.abs(points[i - 1].x - points[i].x) <= EPS;
		expect(
			horizontal !== vertical,
			`segment ${i - 1}->${i} is not at a right angle: ${JSON.stringify(points[i - 1])} -> ${JSON.stringify(points[i])}`,
		).toBe(true);
	}
}

test.describe("symmetric connector routing", () => {
	test("routes stacked shapes offset sideways as a symmetric S bending at the midpoint", async ({
		canvas,
	}) => {
		// A source above and a target below offset to the right, so bottomCenter (pointing down)
		// and topCenter (pointing up) face each other head on.
		const sourceId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 150 },
			{ x: 600, y: 250 },
		);
		await canvas.deselect();
		const targetId = await canvas.drawShape(
			"Rectangle",
			{ x: 760, y: 450 },
			{ x: 960, y: 550 },
		);
		await canvas.deselect();

		// Drop from the source bottomCenter near the top edge center of the target -> the target end
		// connects at topCenter.
		await canvas.selectAt({ x: 500, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 860,
			y: 458,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const sourceBox = await worldAABB(canvas, sourceId);
		const targetBox = await worldAABB(canvas, targetId);

		const sourceBottomCenter = { x: centerX(sourceBox), y: sourceBox.maxY };
		const targetTopCenter = { x: centerX(targetBox), y: targetBox.minY };

		// A symmetric S has 4 vertices (two bends): source edge -> crossbar height -> crossbar ->
		// target edge.
		expect(points.length, `route vertices: ${JSON.stringify(points)}`).toBe(4);

		expect(
			distance(points[0], sourceBottomCenter),
			`start point sits on the source bottom edge center`,
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(points[3], targetTopCenter),
			`end point sits on the target top edge center`,
		).toBeLessThanOrEqual(EPS);

		// The start side leaves straight down and the end side enters straight from above.
		expect(Math.abs(points[1].x - points[0].x)).toBeLessThanOrEqual(EPS);
		expect(Math.abs(points[2].x - points[3].x)).toBeLessThanOrEqual(EPS);

		expect(
			Math.abs(points[1].y - points[2].y),
			"the two middle points share a height (the crossbar)",
		).toBeLessThanOrEqual(EPS);

		// Symmetry: the crossbar sits exactly at the midpoint height between the two edges.
		const midY = (sourceBottomCenter.y + targetTopCenter.y) / 2;
		expect(
			Math.abs(points[1].y - midY),
			`crossbar height ${points[1].y} matches the midpoint of the two edges ${midY}`,
		).toBeLessThanOrEqual(EPS);

		assertOrthogonal(points);
	});
});

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Pins the vertex geometry of the default polygon (a regular polygon).
 *
 * polygon-vertex.spec goes as far as the vertex count (5). The implementation
 * (PolygonObjectFactory.buildPolygonPoints) builds a regular pentagon inscribed
 * in the circumscribing ellipse of the drawn bbox with
 *   angle_i = 2pi*i/5 - pi/2, vertex = (cx + rx*cos(theta), cy + ry*sin(theta)).
 * Matching the DOM points array against that formula point by point, for the
 * cx,cy,rx,ry the drawn rect determines, pins the even spacing, the first vertex
 * pointing straight up and the inscription at once. Distorted, rotated or
 * miscounted points all fail here.
 *
 * A Polygon element has no transform and its points are absolute world
 * coordinates (zoom=1), so they compare directly.
 */

const SIDES = 5;
const TOLERANCE_PX = 0.5;

/** Vertices of the regular polygon inscribed in the ellipse (cx,cy,rx,ry), by the factory's formula. */
function expectedPolygon(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
): { x: number; y: number }[] {
	return Array.from({ length: SIDES }, (_, i) => {
		const angle = (2 * Math.PI * i) / SIDES - Math.PI / 2;
		return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
	});
}

async function readVertices(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }[]> {
	const points = await canvas.objectById(id).getAttribute("points");
	if (!points) {
		throw new Error("the polygon has no points attribute");
	}
	return points
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
}

test.describe("regular polygon geometry of the default polygon", () => {
	test("inscribes the drawn pentagon in the ellipse at even 72 degree spacing with the first vertex straight up", async ({
		canvas,
	}) => {
		// (400,200)-(600,360): center (500,280), rx=100, ry=80.
		const id = await canvas.drawShape(
			"Polygon",
			{ x: 400, y: 200 },
			{ x: 600, y: 360 },
		);

		const vertices = await readVertices(canvas, id);
		expect(vertices).toHaveLength(SIDES);

		const expected = expectedPolygon(500, 280, 100, 80);
		// The first vertex points straight up: no rx offset, ry above the center, so (500,200).
		expect(Math.abs(vertices[0].x - 500)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(vertices[0].y - 200)).toBeLessThanOrEqual(TOLERANCE_PX);

		// Every vertex sits where the formula puts it, checking spacing and inscription point by point.
		for (let i = 0; i < SIDES; i++) {
			expect(
				Math.abs(vertices[i].x - expected[i].x),
				`x of vertex ${i}`,
			).toBeLessThanOrEqual(TOLERANCE_PX);
			expect(
				Math.abs(vertices[i].y - expected[i].y),
				`y of vertex ${i}`,
			).toBeLessThanOrEqual(TOLERANCE_PX);
		}
	});
});

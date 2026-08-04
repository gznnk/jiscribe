import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Connecting to a free position along a shape's edge.
 *
 * Dropping a connector clear of every named anchor stores an edge anchor — a side plus a ratio
 * along it — instead of rounding to the nearest edge midpoint. Two things have to hold for that
 * to be worth anything: the endpoint has to land where it was dropped rather than at the
 * midpoint, and, because the ratio is what is stored, it has to keep its share of the edge when
 * the shape is resized. Both are checked here at the geometry level.
 *
 * connector.spec covers the named-anchor drop and connector-follow-resize covers following a
 * resize on a midpoint, neither of which distinguishes a stored ratio from a stored midpoint.
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

const EPS = 1.5;

/** Parses "x1,y1 x2,y2 ..." into an array of coordinates. */
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

/** How far along the box's top edge, 0..1, the point sits. */
const ratioAlongTop = (point: Vec, box: AABB): number =>
	(point.x - box.minX) / (box.maxX - box.minX);

/**
 * Draws a source rectangle above a wide target one and drags a connector from the source's
 * bottomCenter onto the target's top edge, well to the right of its midpoint. The drop point is
 * 70px from the target's topCenter and 50px from its rightCenter, so no named anchor claims it.
 * Returns the connector's and the target's ids, with the selection cleared.
 */
async function connectOntoTargetTopEdge(
	canvas: CanvasDriver,
): Promise<{ connectorId: string; targetId: string }> {
	await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
	await canvas.deselect();
	const targetId = await canvas.drawShape(
		"Rectangle",
		{ x: 400, y: 450 },
		{ x: 600, y: 550 },
	);
	await canvas.deselect();

	await canvas.selectAt({ x: 500, y: 200 });
	const connectorId = await canvas.createConnector("bottomCenter", {
		x: 570,
		y: 455,
	});
	await canvas.deselect();

	return { connectorId, targetId };
}

test.describe("connecting to a free position on an edge", () => {
	test("lands the endpoint where it was dropped instead of at the edge midpoint", async ({
		canvas,
	}) => {
		const { connectorId, targetId } = await connectOntoTargetTopEdge(canvas);

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const endpoint = points[points.length - 1];
		const box = await worldAABB(canvas, targetId);

		expect(
			Math.abs(endpoint.y - box.minY),
			`the endpoint ${JSON.stringify(endpoint)} sits on the target's top edge`,
		).toBeLessThanOrEqual(EPS);
		// The drop was 0.85 along the edge; the midpoint would be 0.5.
		expect(
			ratioAlongTop(endpoint, box),
			"the endpoint keeps the ratio it was dropped at, away from the midpoint",
		).toBeCloseTo(0.85, 1);
	});

	test("keeps its share of the edge when the target is resized", async ({
		canvas,
	}) => {
		const { connectorId, targetId } = await connectOntoTargetTopEdge(canvas);
		const pointsAttr = () =>
			canvas.objectById(connectorId).getAttribute("points");
		const before = await pointsAttr();

		// Widen the target by dragging its right edge out; ctrl suppresses snapping.
		await canvas.selectAt({ x: 500, y: 500 });
		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: 800, y: 500 },
			{ ctrl: true },
		);
		await expect
			.poll(pointsAttr, { message: "the connector follows the target resize" })
			.not.toBe(before);
		await canvas.deselect();

		const endpoint = parsePoints(await pointsAttr()).at(-1)!;
		const box = await worldAABB(canvas, targetId);

		expect(
			Math.abs(endpoint.y - box.minY),
			"the endpoint stays on the widened target's top edge",
		).toBeLessThanOrEqual(EPS);
		// A stored coordinate would have stayed put and slid to a smaller ratio; a stored
		// ratio moves with the edge and keeps 0.85.
		expect(
			ratioAlongTop(endpoint, box),
			"the endpoint holds its ratio along the wider edge",
		).toBeCloseTo(0.85, 1);
	});
});

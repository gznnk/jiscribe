import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Checks that a connector follows when the shapes it connects are grouped and the group is moved.
 *
 * Grouping nests the shapes under the group transform. Connector endpoints resolve through the
 * shape id, so failing to compose the group transform leaves the connector behind when the group
 * moves.
 *
 * Groups A with an unrelated C and leaves B outside. With an A→B connector, moving the group
 * must drag the start (the A end) while the end (the B end) stays put, checked against the
 * shapes' geometry after the move.
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

const bottomCenter = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: box.maxY,
});
const topCenter = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: box.minY,
});

async function endpoints(
	canvas: CanvasDriver,
	id: string,
): Promise<{ start: Vec; end: Vec }> {
	const points = parsePoints(
		await canvas.objectById(id).getAttribute("points"),
	);
	return { start: points[0], end: points[points.length - 1] };
}

test.describe("connector following a group move", () => {
	test("drags the connected end and leaves the other end put when a group containing a connected shape moves", async ({
		canvas,
	}) => {
		// Group A (top-left) with C (top-right), leave B (bottom) outside, and connect A→B.
		const aId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 150 },
			{ x: 460, y: 250 },
		);
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 600, y: 150 }, { x: 760, y: 250 });
		await canvas.deselect();
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 450 },
			{ x: 460, y: 550 },
		);
		await canvas.deselect();

		await canvas.selectAt({ x: 380, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 380,
			y: 455,
		});
		await canvas.deselect();

		// Precondition on the connection: start = A's bottom edge center, end = B's top edge center.
		const before = await endpoints(canvas, connectorId);
		const aBefore = await worldAABB(canvas, aId);
		const bBox = await worldAABB(canvas, bId);
		expect(
			distance(before.start, bottomCenter(aBefore)),
			"the start point lies on A's bottom edge center",
		).toBeLessThanOrEqual(EPS);
		const bTop = topCenter(bBox);
		expect(
			distance(before.end, bTop),
			"the end point lies on B's top edge center",
		).toBeLessThanOrEqual(EPS);

		// Group A and C without B.
		await canvas.selectAt({ x: 380, y: 200 });
		await canvas.ctrlClickAt({ x: 680, y: 200 });
		await canvas.group();
		await canvas.deselect();

		// Move the group (A+C) right; grabbing A drags the whole group.
		await canvas.drag({ x: 380, y: 200 }, { x: 580, y: 200 });
		await expect
			.poll(async () => (await endpoints(canvas, connectorId)).start.x, {
				message: "the start point (the A end) follows the group move",
			})
			.toBeGreaterThan(before.start.x + 100);
		await canvas.deselect();

		const after = await endpoints(canvas, connectorId);
		const aAfter = await worldAABB(canvas, aId);

		// The start lands on A's new bottom edge center, with the group transform composed in.
		expect(
			distance(after.start, bottomCenter(aAfter)),
			`the start point ${JSON.stringify(after.start)} lies on A's bottom edge center after the move ${JSON.stringify(bottomCenter(aAfter))}`,
		).toBeLessThanOrEqual(EPS);
		// B is outside the group, so the end stays put.
		expect(
			distance(after.end, bTop),
			"the end point stays on B's top edge center",
		).toBeLessThanOrEqual(EPS);
	});
});

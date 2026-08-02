import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec verifying, at the UI level, dragging a segment of a **straight** connector anywhere on the
 * canvas (#229).
 *
 * connector-segment-drag.spec covers the orthogonal case, where a segment only slides across itself
 * on one axis. Straight has no such constraint, so a segment whose two ends both carry a coordinate
 * of their own — vertices, or a free endpoint — translates as a whole and takes the neighbouring
 * segments with it. A segment with an end pinned to a shape is not draggable at all, and must not
 * pretend to be: it carries no band, so the cursor over it stays the line's own.
 *
 * Five things are guarded. (1) A plain two-point straight connector offers no drag band, since its
 * single segment always has a pinned end. (2) With two vertices, the middle segment carries a band
 * and translates both of them by the same offset while the endpoints stay on their shapes. (3) The
 * band covers the whole length, so the segment can be grabbed away from the midpoint (where the
 * insert handle sits). (4) The cursors say which is which: `move` over a draggable segment,
 * `pointer` over the bare line. (5) A free endpoint moves with the segment like a vertex does, and
 * Undo takes the whole drag back — that is the path rewriting `source` / `target` rather than
 * `points`, which the other cases never exercise.
 */

type Vec = { x: number; y: number };

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

/** Reads the currently rendered points of the connector. */
async function readPoints(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec[]> {
	return parsePoints(
		await canvas.objectById(connectorId).getAttribute("points"),
	);
}

const midpoint = (a: Vec, b: Vec): Vec => ({
	x: (a.x + b.x) / 2,
	y: (a.y + b.y) / 2,
});

/** A point a fraction of the way along a segment, for grabbing it away from its midpoint. */
const along = (a: Vec, b: Vec, ratio: number): Vec => ({
	x: a.x + (b.x - a.x) * ratio,
	y: a.y + (b.y - a.y) * ratio,
});

const segmentBand = (
	canvas: CanvasDriver,
	connectorId: string,
	index: number,
) =>
	canvas.page.locator(
		`[data-kind="connector"][data-id="${connectorId}"][data-part="segment-move:${index}"]`,
	);

/** Computed cursor of an element, for checking what the pointer promises. */
async function cursorOf(
	locator: ReturnType<CanvasDriver["page"]["locator"]>,
): Promise<string> {
	return locator.first().evaluate((el) => getComputedStyle(el).cursor);
}

/** Selects the connector by clicking the midpoint of its longest segment. */
async function selectConnector(canvas: CanvasDriver, connectorId: string) {
	const points = await readPoints(canvas, connectorId);
	let best = { mid: points[0], length: -1 };
	for (let i = 1; i < points.length; i++) {
		const [a, b] = [points[i - 1], points[i]];
		const length = Math.hypot(b.x - a.x, b.y - a.y);
		if (length > best.length) {
			best = { mid: midpoint(a, b), length };
		}
	}
	await canvas.clickAt(best.mid);
	await expect(
		canvas.page.locator('[data-part="toggle:connector-routing"]'),
	).toBeVisible();
}

/**
 * Joins two rectangles placed diagonally apart, rightCenter to leftCenter, and switches the routing
 * to straight. Both ends stay owned by their shape, which is what makes the end segments
 * undraggable throughout this spec.
 */
async function buildStraightConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 300, y: 180 }, { x: 460, y: 280 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 820, y: 440 }, { x: 980, y: 540 });
	await canvas.deselect();

	await canvas.selectAt({ x: 380, y: 230 });
	const connectorId = await canvas.createConnector("rightCenter", {
		x: 820,
		y: 490,
	});
	await canvas.deselect();

	await selectConnector(canvas, connectorId);
	await canvas.openObjectMenu("connector-routing");
	await canvas.page.click('[data-part="command:setRoutingStraight"]');
	await expect
		.poll(async () => (await readPoints(canvas, connectorId)).length, {
			message: "straight routing draws a single direct line",
		})
		.toBe(2);
	return connectorId;
}

/**
 * Drags the midpoint insert handle of a segment out to `to`, adding a vertex there.
 * The connector must already be selected, since the handles live with the selection controls.
 */
async function insertVertex(
	canvas: CanvasDriver,
	connectorId: string,
	segmentIndex: number,
	to: Vec,
) {
	const points = await readPoints(canvas, connectorId);
	const before = points.length;
	const handle = canvas.page.locator(
		`[data-kind="control"][data-id="${connectorId}"][data-part="waypoint-insert:${segmentIndex}"]`,
	);
	await expect(handle).toBeVisible();
	await canvas.drag(
		midpoint(points[segmentIndex], points[segmentIndex + 1]),
		to,
	);
	await expect
		.poll(async () => (await readPoints(canvas, connectorId)).length, {
			message: `a vertex is added to segment ${segmentIndex}`,
		})
		.toBe(before + 1);
}

/** Builds the connector and bends it twice, leaving the path [source, v0, v1, target]. */
async function buildBentStraightConnector(
	canvas: CanvasDriver,
): Promise<string> {
	const connectorId = await buildStraightConnector(canvas);
	await insertVertex(canvas, connectorId, 0, { x: 560, y: 500 });
	await insertVertex(canvas, connectorId, 1, { x: 760, y: 560 });
	return connectorId;
}

/**
 * Runs one rectangle's rightCenter out to empty space, switches to straight and bends it once,
 * leaving the path [owned source, v0, free target]. Segment 1 is then the movable one, and moving
 * it rewrites the target endpoint's own coordinate rather than a vertex.
 */
async function buildFreeEndConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 300, y: 180 }, { x: 460, y: 280 });
	await canvas.deselect();

	await canvas.selectAt({ x: 380, y: 230 });
	// Dropped on empty canvas, so the target end stays free (no owner shape).
	const connectorId = await canvas.createConnector("rightCenter", {
		x: 800,
		y: 400,
	});
	await canvas.deselect();

	await selectConnector(canvas, connectorId);
	await canvas.openObjectMenu("connector-routing");
	await canvas.page.click('[data-part="command:setRoutingStraight"]');
	await expect
		.poll(async () => (await readPoints(canvas, connectorId)).length, {
			message: "straight routing draws a single direct line",
		})
		.toBe(2);

	await insertVertex(canvas, connectorId, 0, { x: 560, y: 480 });
	return connectorId;
}

test.describe("segment drag on a straight connector", () => {
	test("offers no drag band while both ends of every segment are pinned to a shape", async ({
		canvas,
	}) => {
		const connectorId = await buildStraightConnector(canvas);

		await expect(segmentBand(canvas, connectorId, 0)).toHaveCount(0);
	});

	test("translates a vertex-to-vertex segment and leaves the endpoints on their shapes", async ({
		canvas,
	}) => {
		const connectorId = await buildBentStraightConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		expect(initial).toHaveLength(4);

		const band = segmentBand(canvas, connectorId, 1);
		await expect(band).toHaveCount(1);

		// Grabbed a quarter along, clear of the insert handle sitting on the midpoint.
		const grab = along(initial[1], initial[2], 0.25);
		const requested = { x: 40, y: 100 };
		await canvas.drag(grab, {
			x: grab.x + requested.x,
			y: grab.y + requested.y,
		});

		await expect
			.poll(
				async () => {
					const moved = await readPoints(canvas, connectorId);
					return Math.hypot(
						moved[1].x - initial[1].x,
						moved[1].y - initial[1].y,
					);
				},
				{ message: "the grabbed segment has moved" },
			)
			.toBeGreaterThan(50);

		const moved = await readPoints(canvas, connectorId);
		// The two ends move by the same offset, which is what makes it a translation rather than the
		// stretch a single vertex handle would give. Read as a delta so a snap correction, which
		// applies to both alike, does not make this brittle.
		expect(moved[1].x - initial[1].x).toBeCloseTo(moved[2].x - initial[2].x, 1);
		expect(moved[1].y - initial[1].y).toBeCloseTo(moved[2].y - initial[2].y, 1);
		expect(moved[1].x - initial[1].x).toBeCloseTo(requested.x, -1);
		expect(moved[1].y - initial[1].y).toBeCloseTo(requested.y, -1);

		// The endpoints stay where their shapes put them.
		expect(Math.abs(moved[0].x - initial[0].x)).toBeLessThan(EPS);
		expect(Math.abs(moved[0].y - initial[0].y)).toBeLessThan(EPS);
		expect(Math.abs(moved[3].x - initial[3].x)).toBeLessThan(EPS);
		expect(Math.abs(moved[3].y - initial[3].y)).toBeLessThan(EPS);
	});

	test("leaves the segments touching a shape-owned endpoint undraggable", async ({
		canvas,
	}) => {
		const connectorId = await buildBentStraightConnector(canvas);

		await expect(segmentBand(canvas, connectorId, 0)).toHaveCount(0);
		await expect(segmentBand(canvas, connectorId, 2)).toHaveCount(0);
	});

	test("shows move over a draggable segment and pointer over the bare line", async ({
		canvas,
	}) => {
		const connectorId = await buildBentStraightConnector(canvas);

		expect(await cursorOf(segmentBand(canvas, connectorId, 1))).toBe("move");
		expect(
			await cursorOf(
				canvas.page.locator(
					`polyline[data-kind="connector"][data-id="${connectorId}"]`,
				),
			),
		).toBe("pointer");
	});

	test("carries a free endpoint along with the vertex, and Undo puts both back", async ({
		canvas,
	}) => {
		const connectorId = await buildFreeEndConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		expect(initial).toHaveLength(3);

		// Segment 1 runs vertex -> free target, so it moves; segment 0 hangs off the shape.
		await expect(segmentBand(canvas, connectorId, 1)).toHaveCount(1);
		await expect(segmentBand(canvas, connectorId, 0)).toHaveCount(0);

		const grab = along(initial[1], initial[2], 0.25);
		const requested = { x: 60, y: 90 };
		await canvas.drag(grab, {
			x: grab.x + requested.x,
			y: grab.y + requested.y,
		});

		await expect
			.poll(
				async () => {
					const moved = await readPoints(canvas, connectorId);
					return Math.hypot(
						moved[2].x - initial[2].x,
						moved[2].y - initial[2].y,
					);
				},
				{ message: "the free endpoint has moved with the segment" },
			)
			.toBeGreaterThan(50);

		const moved = await readPoints(canvas, connectorId);
		// The free endpoint carries its own coordinate, so it moves by the same offset as the vertex
		// — this is the path that rewrites `target.anchor.point` rather than an entry of `points`.
		expect(moved[2].x - initial[2].x).toBeCloseTo(moved[1].x - initial[1].x, 1);
		expect(moved[2].y - initial[2].y).toBeCloseTo(moved[1].y - initial[1].y, 1);
		expect(moved[2].x - initial[2].x).toBeCloseTo(requested.x, -1);
		expect(moved[2].y - initial[2].y).toBeCloseTo(requested.y, -1);

		// The owned source stays on its shape.
		expect(Math.abs(moved[0].x - initial[0].x)).toBeLessThan(EPS);
		expect(Math.abs(moved[0].y - initial[0].y)).toBeLessThan(EPS);

		// One drag is one history entry, endpoint rewrite included.
		await canvas.undo();
		await expect
			.poll(
				async () => {
					const undone = await readPoints(canvas, connectorId);
					return Math.hypot(
						undone[2].x - initial[2].x,
						undone[2].y - initial[2].y,
					);
				},
				{ message: "Undo returns the free endpoint to where it was" },
			)
			.toBeLessThan(EPS);
		const undone = await readPoints(canvas, connectorId);
		expect(Math.abs(undone[1].x - initial[1].x)).toBeLessThan(EPS);
		expect(Math.abs(undone[1].y - initial[1].y)).toBeLessThan(EPS);
	});
});

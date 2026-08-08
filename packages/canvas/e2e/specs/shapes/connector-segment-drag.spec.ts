import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec verifying, at the UI level, deciding a route by hand by grabbing segments of an orthogonal
 * connector.
 *
 * connector-routing-switch.spec only covers switching the shape of the line; the path for deciding
 * a route while staying orthogonal — dragging a segment perpendicular to itself puts vertices into
 * `points`, and those vertices then *are* the route — was untested.
 *
 * Six things are guarded here. (1) A middle segment moves together with the vertices at both of its
 * ends. (2) An end segment moves while keeping its length, and a perpendicular link segment appears
 * between it and the endpoint left on the edge. (3) Moving a shape makes the vertex adjacent to the
 * endpoint follow, keeping the right angles. (4) The hit area covers the whole segment, so it can
 * be grabbed away from the midpoint and without selecting first. (5) Switching to straight bakes
 * the currently drawn route into points, so the shape does not jump. (6) A line made straight by
 * overlaying runs moves as one and leaves no stray diagonal segment.
 * Layouts that require routing around are out of scope by design and are not required here either.
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

/** Checks that every pair of adjacent vertices is horizontal or vertical (right angles, no degenerate segments). */
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

/** Reads the currently rendered points of the connector. */
async function readPoints(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec[]> {
	return parsePoints(
		await canvas.objectById(connectorId).getAttribute("points"),
	);
}

/** x of the longest vertical segment: reads the pinned run position without depending on the vertex count. */
async function longestVerticalRunX(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<number> {
	const points = await readPoints(canvas, connectorId);
	let best = { x: NaN, length: -1 };
	for (let i = 1; i < points.length; i++) {
		const [a, b] = [points[i - 1], points[i]];
		const length = Math.abs(b.y - a.y);
		if (Math.abs(b.x - a.x) <= EPS && length > best.length) {
			best = { x: (a.x + b.x) / 2, length };
		}
	}
	expect(
		best.length,
		`a vertical run exists: ${JSON.stringify(points)}`,
	).toBeGreaterThan(0);
	return best.x;
}

/** Selects the connector by clicking the midpoint of its longest segment. */
async function selectConnector(canvas: CanvasDriver, connectorId: string) {
	const points = await readPoints(canvas, connectorId);
	let best = { mid: points[0], length: -1 };
	for (let i = 1; i < points.length; i++) {
		const [a, b] = [points[i - 1], points[i]];
		const length = Math.hypot(b.x - a.x, b.y - a.y);
		if (length > best.length) {
			best = { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, length };
		}
	}
	await canvas.clickAt(best.mid);
	await expect(
		canvas.page.locator('[data-part="toggle:connector-routing"]'),
	).toBeVisible();
}

/**
 * Joins two rectangles placed diagonally apart from rightCenter to leftCenter. Both ends being edge
 * anchors, the default is orthogonal, giving a route with two bends and one vertical run in the
 * middle.
 */
async function buildDiagonalConnector(canvas: CanvasDriver): Promise<string> {
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
	return connectorId;
}

test.describe("segment drag on an orthogonal connector", () => {
	test("pins the run position when a middle segment is moved and keeps right angles when a shape moves", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(initial);
		const initialRunX = await longestVerticalRunX(canvas, connectorId);

		await selectConnector(canvas, connectorId);
		await expect(
			canvas.page.locator(
				`[data-kind="connector"][data-id="${connectorId}"][data-part="segment-slide:1"]`,
			),
		).toBeVisible();

		const mid = {
			x: (initial[1].x + initial[2].x) / 2,
			y: (initial[1].y + initial[2].y) / 2,
		};
		await canvas.drag(mid, { x: mid.x + 130, y: mid.y });

		await expect
			.poll(async () => longestVerticalRunX(canvas, connectorId), {
				message: "the grabbed run moves to the right",
			})
			.toBeGreaterThan(initialRunX + 60);
		assertOrthogonalSegments(await readPoints(canvas, connectorId));
		const pinnedRunX = await longestVerticalRunX(canvas, connectorId);

		// Lower the source shape. The vertex adjacent to the endpoint follows, so no diagonal
		// segment appears.
		await canvas.deselect();
		await canvas.selectAt({ x: 380, y: 230 });
		await canvas.drag({ x: 380, y: 230 }, { x: 380, y: 400 });
		await canvas.deselect();

		const afterMove = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(afterMove);
		expect(
			afterMove[0].y,
			"start point follows the edge center of the source shape",
		).toBeCloseTo(400, 0);
		expect(
			await longestVerticalRunX(canvas, connectorId),
			"the pinned run position is unchanged by the shape move",
		).toBeCloseTo(pinnedRunX, 0);
	});

	test("moves an end segment keeping its length and links it to the endpoint with a perpendicular segment", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		await selectConnector(canvas, connectorId);
		const initial = await readPoints(canvas, connectorId);

		// Pull the first segment (the horizontal line leaving the right edge of the source) down.
		await canvas.drag(
			{ x: (initial[0].x + initial[1].x) / 2, y: initial[0].y },
			{ x: (initial[0].x + initial[1].x) / 2, y: initial[0].y + 110 },
		);

		const dragged = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(dragged);
		expect(
			dragged[0],
			"start point stays on the edge of the source shape",
		).toEqual(initial[0]);
		expect(
			dragged[1].x,
			"a perpendicular link segment drops straight down from the endpoint",
		).toBeCloseTo(initial[0].x, 0);
		expect(dragged[1].y).toBeCloseTo(initial[0].y + 110, 0);
		expect(
			dragged[2].x,
			"the dragged segment moves to the new height keeping the x of its far end",
		).toBeCloseTo(initial[1].x, 0);
		expect(dragged[2].y).toBeCloseTo(initial[0].y + 110, 0);
	});

	test('discards hand-placed vertices on "reset route to automatic"', async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		await selectConnector(canvas, connectorId);

		const mid = {
			x: (initial[1].x + initial[2].x) / 2,
			y: (initial[1].y + initial[2].y) / 2,
		};
		await canvas.drag(mid, { x: mid.x + 130, y: mid.y });
		await expect
			.poll(async () => longestVerticalRunX(canvas, connectorId))
			.not.toBeCloseTo((initial[1].x + initial[2].x) / 2, 0);

		// Resetting the route is an operation, not a mode, so it lives in the context menu rather
		// than the routing menu.
		const onLine = await readPoints(canvas, connectorId);
		await canvas.openContextMenu({
			x: (onLine[0].x + onLine[1].x) / 2,
			y: onLine[0].y,
		});
		await canvas.clickContextMenuCommand("resetConnectorRoute");

		await expect
			.poll(async () => readPoints(canvas, connectorId), {
				message: "returns to the automatically routed path",
			})
			.toEqual(initial);
	});

	test("can be grabbed near the end of a segment and moved without selecting first", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);

		// The connector itself owns the hit area, so it can be grabbed without selecting first. The
		// grab point is 25px below the top of the vertical run, where a midpoint-handle approach
		// would have no hit area.
		const nearEnd = { x: initial[1].x, y: initial[1].y + 25 };
		await canvas.drag(nearEnd, { x: nearEnd.x + 130, y: nearEnd.y });

		const dragged = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(dragged);
		expect(
			await longestVerticalRunX(canvas, connectorId),
			"the run moves even when grabbed near its end",
		).toBeCloseTo(initial[1].x + 130, 0);
	});

	test("does not collapse into a single diagonal line when the run is overlaid on the face of the target", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		await selectConnector(canvas, connectorId);

		// Drag the vertical run onto the line of the target left edge (the target x). One bend remains.
		const mid = {
			x: (initial[1].x + initial[2].x) / 2,
			y: (initial[1].y + initial[2].y) / 2,
		};
		await canvas.drag(mid, { x: initial[3].x, y: mid.y });

		await expect
			.poll(async () => longestVerticalRunX(canvas, connectorId), {
				message: "the run moves up to the face of the target",
			})
			.toBeCloseTo(initial[3].x, 0);
		const collapsed = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(collapsed);
		expect(
			collapsed.length,
			"folds into an L (3 points) instead of a single diagonal line",
		).toBe(3);
	});

	test("does not produce a diagonal segment when grabbed after runs were overlaid into a straight line", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		await selectConnector(canvas, connectorId);

		// Lower the first segment, producing a link segment dropping vertically from the endpoint
		// and a horizontal run at the lowered height.
		const firstMid = {
			x: (initial[0].x + initial[1].x) / 2,
			y: initial[0].y,
		};
		await canvas.drag(firstMid, { x: firstMid.x, y: firstMid.y + 110 });
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length, {
				message: "the perpendicular link segment adds bends",
			})
			.toBeGreaterThan(initial.length);
		const lowered = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(lowered);

		// Bring the lowered run (lowered[1]->lowered[2]) back to the original height, overlaying it
		// on the opening line to make one straight line.
		const runMid = {
			x: (lowered[1].x + lowered[2].x) / 2,
			y: lowered[1].y,
		};
		await canvas.drag(runMid, { x: runMid.x, y: initial[0].y });
		const merged = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(merged);

		// Grab the straightened line and lower it. If the overlaid runs moved separately, the one
		// left behind would go diagonal.
		const grab = { x: initial[1].x - 40, y: merged[0].y };
		await canvas.drag(grab, { x: grab.x, y: grab.y + 60 });
		await expect
			.poll(
				async () => {
					const points = await readPoints(canvas, connectorId);
					return points.some(
						(point, index) =>
							index > 0 &&
							Math.abs(points[index - 1].y - point.y) <= EPS &&
							Math.abs(point.y - (merged[0].y + 60)) <= 2,
					);
				},
				{ message: "the grabbed line moves to the drop height" },
			)
			.toBe(true);
		assertOrthogonalSegments(await readPoints(canvas, connectorId));
	});

	test("keeps the visible shape when switching to straight after a shape was moved", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		const initialRunX = await longestVerticalRunX(canvas, connectorId);
		await selectConnector(canvas, connectorId);

		const mid = {
			x: (initial[1].x + initial[2].x) / 2,
			y: (initial[1].y + initial[2].y) / 2,
		};
		await canvas.drag(mid, { x: mid.x + 130, y: mid.y });
		await expect
			.poll(async () => longestVerticalRunX(canvas, connectorId))
			.toBeGreaterThan(initialRunX + 60);

		// Move the source shape so the stored vertices and the rendered (aligned) coordinates differ
		// before switching.
		await canvas.deselect();
		await canvas.selectAt({ x: 380, y: 230 });
		await canvas.drag({ x: 380, y: 230 }, { x: 380, y: 400 });
		await canvas.deselect();
		const beforeSwitch = await readPoints(canvas, connectorId);

		await selectConnector(canvas, connectorId);
		await canvas.openObjectMenu("connector-routing");
		await canvas.page.click('[data-part="command:setRoutingStraight"]');
		await expect(
			canvas.page.locator(
				`[data-kind="connector"][data-id="${connectorId}"][data-part^="segment-slide:"]`,
			),
		).toHaveCount(0);

		const afterSwitch = await readPoints(canvas, connectorId);
		expect(
			afterSwitch.length,
			"the vertex count does not change on the switch",
		).toBe(beforeSwitch.length);
		afterSwitch.forEach((point, index) => {
			expect(point.x).toBeCloseTo(beforeSwitch[index].x, 0);
			expect(point.y).toBeCloseTo(beforeSwitch[index].y, 0);
		});
	});

	// Straight has bands of its own, for the segments it can move freely
	// (connector-straight-segment-drag.spec); what it must never carry is the one-axis slide band,
	// whose drag would take the whole run across itself.
	test("shows no slide hit areas for straight routing", async ({ canvas }) => {
		const connectorId = await buildDiagonalConnector(canvas);
		await selectConnector(canvas, connectorId);

		await canvas.openObjectMenu("connector-routing");
		await canvas.page.click('[data-part="command:setRoutingStraight"]');

		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length, {
				message: "becomes a 2-vertex straight line when switched to straight",
			})
			.toBe(2);
		await expect(
			canvas.page.locator(
				`[data-kind="connector"][data-id="${connectorId}"][data-part^="segment-slide:"]`,
			),
		).toHaveCount(0);
	});
});
